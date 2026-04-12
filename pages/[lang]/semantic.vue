<script setup lang="ts">
/**
 * Semantic Explorer — production game mode page.
 *
 * Navigate meaning space to find a hidden target word in 15 guesses. Each
 * guess receives a rank (#1 = target) based on its cosine position in the
 * 50k-word neighbour list. The map is target-centered with radius proportional
 * to log-rank and angle from the UMAP 2D projection.
 *
 * Each guess produces up to 2 compass hints (Gram-Schmidt axis selection)
 * pointing the player toward the target. One oracle hint per game, unlocked
 * after guess 5.
 */

import { computed, onMounted, ref, watch } from 'vue';
import { createGameConfig } from '~/utils/game-modes';
import MapFrame from '~/components/shared/MapFrame.vue';
import MeaningMap, { type MapDot } from '~/components/shared/MeaningMap.vue';
import { buildSemanticGradientFromCSS, sampleGradient } from '~/utils/semanticColor';

definePageMeta({
    layout: 'game',
    key: (route) => `${route.params.lang}-semantic-${route.query.play || 'daily'}`,
});

const route = useRoute();
const lang = route.params.lang as string;

// Semantic Explorer is English-only for v1. Redirect other languages
// to their classic daily page instead of forcing them into English semantic.
if (lang !== 'en') {
    await navigateTo(`/${lang}`, { redirectCode: 302 });
}

// Play type: daily (default) or unlimited via ?play=unlimited
const { playType, isDaily, isUnlimited } = usePlayType('semantic');

// --- Fetch language config via shared API ---
const { data: gameData, error } = await useFetch(`/api/${lang}/data?minimal=1`, {
    key: `lang-data-min-${lang}`,
});
if (error.value || !gameData.value) {
    throw createError({ statusCode: 404, message: 'Language not found' });
}

// --- Stores ---
const langStore = useLanguageStore();
const game = useGameStore();
const settings = useSettingsStore();
const stats = useStatsStore();

if (gameData.value) {
    langStore.init(gameData.value);
}

// Set the game store's mode to 'semantic' so header streak badge, stats,
// and analytics all operate on the correct mode key. We don't USE the tile
// state — we just need the metadata to be right.
const semanticConfig = createGameConfig('semantic', lang, {
    wordLength: 5,
    playType: playType.value,
});
game.resetForMode(semanticConfig);

// --- Sidebar state ---
const sidebarOpen = ref(false);
function toggleSidebar() {
    sidebarOpen.value = !sidebarOpen.value;
}
function closeSidebar() {
    sidebarOpen.value = false;
}

// --- SEO ---
const configVal = gameData.value.config;
const seo = useGameSeo({
    lang,
    mode: 'semantic',
    config: configVal,
    langStore,
});

// --- Semantic game state (local composable) ---
const sem = useSemanticGame(lang);

// Game unavailable if start failed and no guesses were loaded (not a mid-game error)
const gameUnavailable = computed(
    () =>
        !sem.starting.value &&
        sem.invalidMessage.value &&
        sem.guesses.value.length === 0 &&
        sem.dayIdx.value == null
);

/** The word the compass hints are computed from — best guess, not latest.
 *  Shown in the compass header subtitle so the player knows the reference. */
const latestGuessWord = computed<string | null>(() => {
    return (
        sem.bestGuess.value?.word ??
        (sem.guesses.value.length > 0
            ? sem.guesses.value[sem.guesses.value.length - 1]!.word
            : null)
    );
});

// --- Header meta ---
const headerTitle = computed(() => 'Semantic Explorer');
const headerSubtitle = computed(() => {
    if (isUnlimited.value) return `${configVal.name_native || lang} · Unlimited`;
    return sem.dayIdx.value
        ? `${configVal.name_native || lang} · #${sem.dayIdx.value}`
        : configVal.name_native || lang;
});

// --- Stats modal state (local, not from game store) ---
const showStatsModal = ref(false);

// --- Shared game lifecycle (stats save, server sync, duplicate guard) ---
const lifecycle = useGameLifecycle();

// --- Staggered neighbour reveal on game over ---
const NEIGHBOUR_STAGGER_MS = 150;
const revealedNeighbourCount = ref(0);
let neighbourRevealTimers: ReturnType<typeof setTimeout>[] = [];

// --- Lifecycle: init stores + analytics ---
onMounted(async () => {
    try {
        settings.init();
    } catch {
        /* non-fatal */
    }

    lifecycle.initStats(langStore.languageCode, game.gameConfig);

    try {
        const analytics = useAnalytics();
        analytics.registerLanguage(langStore.languageCode);
        analytics.registerGameMode('semantic');
        analytics.trackGameStart({
            language: langStore.languageCode,
            is_returning: stats.stats.n_games > 0,
            current_streak: stats.stats.current_streak,
            game_mode: 'semantic',
            play_type: playType.value,
        });
    } catch {
        /* non-fatal */
    }

    // Auto-show the help modal on first visit for this game mode —
    // same pattern as classic mode (tutorial_shown_{lang} + page key).
    game.maybeShowTutorial();

    // Start the game. URL params override the daily target for debugging /
    // sharing specific words: /en/semantic?target=cat&debug=1
    const query = route.query;
    const targetOverride = typeof query.target === 'string' ? query.target : undefined;
    const debug = query.debug === '1' || query.debug === 'true';
    // Unlimited: force a new random game each time (no persistence)
    await sem.startGame({
        target: targetOverride,
        debug,
        forceNew: isUnlimited.value,
        play: playType.value,
    });
});

// --- Game over → stagger neighbours then open stats modal ---
// Track whether we need to stagger (live game-over) vs show instantly (page revisit)
let needsStagger = false;

watch(
    () => sem.gameOver.value,
    (isOver) => {
        if (!isOver) {
            revealedNeighbourCount.value = 0;
            for (const t of neighbourRevealTimers) clearTimeout(t);
            neighbourRevealTimers = [];
            needsStagger = false;
            return;
        }

        const isRestore = sem.neighbours.value.length > 0;

        if (isRestore) {
            // Restored from localStorage — show instantly, auto-open modal for daily
            revealedNeighbourCount.value = sem.neighbours.value.length;
            if (isDaily.value) showStatsModal.value = true;
        }

        // Shared lifecycle: save stats + sync to server (no-ops on restore)
        lifecycle.handleGameOver(game.gameConfig, {
            won: sem.won.value,
            attempts: sem.guesses.value.length,
            isRestore,
        });

        if (!isRestore) {
            // Live game-over — stagger neighbours once they arrive
            needsStagger = true;

            // Analytics
            try {
                useAnalytics().trackGameComplete({
                    language: langStore.languageCode,
                    won: sem.won.value,
                    attempts: sem.guesses.value.length,
                    game_mode: 'semantic',
                    play_type: playType.value,
                    is_first_game: stats.stats.n_games === 0,
                });
            } catch {
                /* non-fatal */
            }
        }
    }
);

// Stagger neighbours when they arrive after a live game-over
function startNeighbourStagger(total: number) {
    const baseDelay = 400;
    for (let i = 0; i < total; i++) {
        neighbourRevealTimers.push(
            setTimeout(
                () => {
                    revealedNeighbourCount.value = i + 1;
                },
                baseDelay + i * NEIGHBOUR_STAGGER_MS
            )
        );
    }
    neighbourRevealTimers.push(
        setTimeout(
            () => {
                showStatsModal.value = true;
            },
            baseDelay + total * NEIGHBOUR_STAGGER_MS + 400
        )
    );
}

watch(
    () => sem.neighbours.value.length,
    (total) => {
        if (!needsStagger || total === 0) return;
        needsStagger = false;
        startNeighbourStagger(total);
    }
);

// Map zoom/pan state — MapFrame handles all interaction chrome.
const mapUserZoom = ref(1.0);
const mapPanOffset = ref<[number, number]>([0, 0]);

// Color gradient for game dots (warm = close to target)
const gradient = computed(() => buildSemanticGradientFromCSS());

// Convert game state → MapDot[] for the unified MeaningMap
const gameDots = computed<MapDot[]>(() => {
    const dots: MapDot[] = [];
    for (const g of sem.guesses.value) {
        dots.push({
            word: g.word,
            pos2d: g.umapPosition,
            projections: g.allProjectionsNormalized,
            display: g.display,
            role: 'foreground',
            color: sampleGradient(g.display, gradient.value),
        });
    }
    if (sem.gameOver.value) {
        // Staggered reveal: only show neighbours that have "appeared" so far
        const visible = revealedNeighbourCount.value;
        for (let i = 0; i < Math.min(visible, sem.neighbours.value.length); i++) {
            const n = sem.neighbours.value[i]!;
            dots.push({
                word: n.word,
                pos2d: n.umapPosition,
                projections: n.allProjectionsNormalized,
                display: n.display,
                role: 'neighbour',
            });
        }
    }
    return dots;
});

const gameTargetLabel = computed(() => {
    if (sem.gameOver.value && sem.finalTargetWord.value) return sem.finalTargetWord.value;
    return '?';
});

// --- Compass slice button toggle ---
function onSliceToggle() {
    sem.toggleAxisSliceFromCompass();
    try {
        if (sem.mapMode.value === 'slice' && sem.sliceAxes.value) {
            useAnalytics().trackCustomEvent?.('semantic_axis_slice_view', {
                axis_x: sem.sliceAxes.value[0],
                axis_y: sem.sliceAxes.value[1],
                guess_number: sem.guesses.value.length,
            });
        }
    } catch {
        /* non-fatal */
    }
}

// --- LLM hint ---
async function onRequestLlmHint() {
    await sem.requestLlmHint();
    try {
        useAnalytics().trackCustomEvent?.('semantic_llm_hint_used', {
            guess_number: sem.guesses.value.length,
        });
    } catch {
        /* non-fatal */
    }
}

// --- Guess submission ---
async function onGuessSubmit(word: string) {
    await sem.submitGuess(word);
    // Reset manual zoom/pan so auto-zoom fits best + latest guess
    mapUserZoom.value = 1.0;
    mapPanOffset.value = [0, 0];
}

// --- Share (delegated to useGameShare for proper analytics + fallbacks) ---
const { shareResults } = useGameShare();
async function onShare() {
    const bestRank = sem.bestGuess.value?.rank;
    const attemptsText = sem.won.value ? String(sem.guesses.value.length) : 'x';
    const shareText =
        `Semantic Explorer ${langStore.languageCode.toUpperCase()} #${sem.dayIdx.value}` +
        ` · ${sem.won.value ? `${sem.guesses.value.length}/${sem.maxGuesses.value}` : 'X/' + sem.maxGuesses.value}` +
        (bestRank ? `\nBest rank: #${bestRank.toLocaleString()}` : '');

    await shareResults({
        shareText,
        langCode: langStore.languageCode,
        gameWon: sem.won.value,
        attempts: attemptsText,
        emojiBoard: '',
        gameMode: 'semantic',
        onNotify: (message) => {
            game.notification = {
                message,
                type: 'success',
                ts: Date.now(),
            } as typeof game.notification;
        },
    });
}

// --- Cleanup stagger timers ---
onUnmounted(() => {
    for (const t of neighbourRevealTimers) clearTimeout(t);
});

// --- New game ---
async function onNewGame() {
    showStatsModal.value = false;
    await sem.startGame({ forceNew: true, play: playType.value });
}

// --- Keep playing (daily → unlimited transition) ---
function onKeepPlaying() {
    showStatsModal.value = false;
    navigateTo(`/${lang}/semantic?play=unlimited`);
}
</script>

<template>
    <GamePageShell
        :lang="lang"
        :language-name="configVal.name_native || configVal.name || lang"
        current-mode="semantic"
        :title="headerTitle"
        :subtitle="headerSubtitle"
        :sidebar-open="sidebarOpen"
        :visible="!!gameData"
        :no-keyboard="true"
        max-width="4xl"
        @toggle-sidebar="toggleSidebar"
        @close-sidebar="closeSidebar"
        @new-game="onNewGame"
        @results="showStatsModal = !showStatsModal"
    >
        <!-- Unavailable state: embeddings not generated yet -->
        <div
            v-if="gameUnavailable"
            class="flex flex-col items-center justify-center flex-1 px-6 py-20 text-center"
        >
            <h2 class="heading-display text-3xl text-ink mb-4">Semantic Explorer</h2>
            <p class="text-muted max-w-md mb-6">
                This mode is temporarily unavailable — the word embedding data is being generated.
                Check back in a few minutes.
            </p>
            <button
                class="px-6 py-2 bg-accent text-paper font-body font-bold hover:opacity-90 transition-opacity"
                @click="sem.startGame({ play: playType })"
            >
                Retry
            </button>
        </div>

        <div v-else class="semantic-body editorial-scroll">
            <section class="semantic-layout">
                <!-- Main column: map card (title + canvas + input) -->
                <div class="main-col">
                    <div class="map-card">
                        <header class="map-header">
                            <div class="map-eyebrow">
                                <span class="eyebrow-tag">
                                    {{
                                        sem.mapMode.value === 'slice' && sem.sliceAxes.value
                                            ? `Slice: ${sem.sliceAxes.value[0]} × ${sem.sliceAxes.value[1]}`
                                            : 'Meaning Map'
                                    }}
                                </span>
                                <span class="eyebrow-sub">distance = rank</span>
                            </div>
                            <h1 class="map-title">Find the hidden word</h1>
                            <p class="map-subtitle">
                                <template v-if="sem.starting.value">Loading today's word…</template>
                                <template v-else
                                    >Navigate by meaning. {{ sem.guessesRemaining.value }} guesses
                                    left.</template
                                >
                            </p>
                        </header>

                        <div class="map-canvas-wrap">
                            <MapFrame
                                v-model:user-zoom="mapUserZoom"
                                v-model:pan-offset="mapPanOffset"
                                :expandable="true"
                            >
                                <template #default="{ expanded, frameSize }">
                                    <MeaningMap
                                        :dots="gameDots"
                                        mode="polar"
                                        :center-pos="sem.targetUmapPosition.value"
                                        :slice-axes="sem.sliceAxes.value"
                                        :available-axes="
                                            Object.entries(sem.axisAnchors.value ?? {}).map(
                                                ([n, a]) => ({ name: n, low: a.low, high: a.high })
                                            )
                                        "
                                        :size="520"
                                        :user-zoom="mapUserZoom"
                                        :pan-offset="mapPanOffset"
                                        :show-target="true"
                                        :target-label="gameTargetLabel"
                                        :highlighted-word="sem.highlightedWord.value"
                                        :wiggle-signal="sem.wiggleSignal.value"
                                        :latest-word="latestGuessWord"
                                        :compass-word="sem.bestGuess.value?.word ?? null"
                                        :new-best-signal="sem.newBestSignal.value"
                                    />
                                </template>
                            </MapFrame>
                        </div>
                    </div>

                    <!-- Input row: outside the map card so on mobile it can
                         be fixed to the bottom of the viewport, above the
                         virtual keyboard. On desktop it flows normally. -->
                    <div class="map-input-row">
                        <SemanticInput
                            :loading="sem.loading.value"
                            :disabled="sem.gameOver.value || sem.starting.value"
                            :invalid-message="sem.invalidMessage.value"
                            :guesses-used="sem.guesses.value.length"
                            :guesses-max="sem.maxGuesses.value"
                            @submit="onGuessSubmit"
                        />
                    </div>
                </div>

                <!-- Sidebar: leaderboard + compass -->
                <aside class="side-col">
                    <div class="side-panel leaderboard-panel">
                        <SemanticLeaderboard
                            :guesses="sem.guesses.value"
                            :sorted-guesses="sem.sortedGuesses.value"
                            :best-guess="sem.bestGuess.value"
                            :total-ranked="sem.totalRanked.value"
                            :highlighted-word="sem.highlightedWord.value"
                            :new-best-signal="sem.newBestSignal.value"
                            @highlight="sem.setHighlightedWord"
                        />
                    </div>
                    <SemanticCompassHints
                        :hints="sem.lastCompass.value"
                        :compass-status="sem.lastCompassStatus.value"
                        :map-mode="sem.mapMode.value"
                        :slice-axes="sem.sliceAxes.value"
                        :game-over="sem.gameOver.value"
                        :llm-hint="sem.llmHint.value"
                        :llm-hint-loading="sem.llmHintLoading.value"
                        :llm-hint-used="sem.llmHintUsed.value"
                        :llm-hint-unlocked="sem.llmHintUnlocked.value"
                        :guesses-used="sem.guesses.value.length"
                        :guesses-since-best="sem.guessesSinceBest.value"
                        :latest-guess-word="latestGuessWord"
                        @toggle-slice="onSliceToggle"
                        @request-llm-hint="onRequestLlmHint"
                    />
                </aside>
            </section>
        </div>

        <!-- End-of-game modal -->
        <SemanticStatsModal
            :visible="showStatsModal"
            :won="sem.won.value"
            :game-over="sem.gameOver.value"
            :target-word="sem.finalTargetWord.value"
            :guesses="sem.guesses.value"
            :neighbours="sem.neighbours.value"
            :guesses-max="sem.maxGuesses.value"
            :day-idx="sem.dayIdx.value"
            :lang="lang"
            :llm-hint-used="sem.llmHintUsed.value"
            :is-daily="isDaily"
            @close="showStatsModal = false"
            @share="onShare"
            @new-game="onNewGame"
            @keep-playing="onKeepPlaying"
        />
        <template #seo>
            <GameSeoNoscript :lang="lang" mode="semantic" :seo="seo" :config="configVal" />
        </template>
    </GamePageShell>
</template>

<style scoped>
/* ═════════════════════════════════════════════════════════════
   Layout — centered main container with max-width.
   Body fills the flex parent vertically. Vertical centering only
   kicks in when content is shorter than available height (via
   auto margins). On short viewports or mobile stacked layout,
   content hugs the top and body scrolls if needed.
   ═════════════════════════════════════════════════════════════ */
.semantic-body {
    flex: 1;
    width: 100%;
    padding: 24px 8px 28px;
    display: flex;
    flex-direction: column;
    align-items: center;
    min-height: 0;
    overflow-y: auto;
}
.semantic-layout {
    display: grid;
    grid-template-columns: 1fr;
    gap: 14px;
    width: 100%;
    max-width: 920px;
    /* Auto vertical margins center the grid when there's spare
       space in the body; they collapse to 0 when content exceeds
       the viewport, so the grid hugs the top on short screens. */
    margin-top: auto;
    margin-bottom: auto;
}
.main-col,
.side-col {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
}

/* ═════════════════════════════════════════════════════════════
   Map card — holds header, canvas, and input
   ═════════════════════════════════════════════════════════════ */
.map-card {
    display: flex;
    flex-direction: column;
    background: var(--color-paper);
    border: 1px solid var(--color-rule);
    padding: 20px 22px 16px;
    position: relative;
}

.map-header {
    text-align: center;
    margin-bottom: 14px;
}
.map-eyebrow {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 10px;
    gap: 12px;
}
.eyebrow-tag {
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--color-muted);
    padding: 3px 8px;
    border: 1px solid var(--color-rule);
}
.eyebrow-sub {
    font-family: var(--font-display);
    font-style: italic;
    font-size: 11px;
    color: var(--color-muted);
}

.map-title {
    font-family: var(--font-display);
    font-size: 24px;
    font-weight: 700;
    color: var(--color-ink);
    margin: 0;
    line-height: 1.1;
    letter-spacing: -0.01em;
}
.map-subtitle {
    font-family: var(--font-body);
    font-size: 13px;
    color: var(--color-muted);
    margin: 4px 0 0;
}

/* Hide map header text on short viewports to give the map more space */
@media (max-height: 700px) {
    .map-header {
        display: none;
    }
    .map-canvas-wrap {
        --map-chrome: 210px; /* no header: navbar ~50 + input ~80 + padding ~80 */
    }
}
.map-canvas-wrap {
    /* Chrome around the map: navbar ~50 + card header ~90 + input ~80 + padding ~80 ≈ 310px */
    --map-chrome: 310px;
    position: relative;
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: min(200px, calc(100dvh - var(--map-chrome)));
    max-height: calc(100dvh - var(--map-chrome));
}
/* Constrain the square map to fit within the available height.
   aspect-ratio:1 sizes from width by default, so we also cap
   width to the available height so the square never overflows.
   Only when NOT expanded — expanded mode uses MapFrame's fixed overlay. */
.map-canvas-wrap :deep(.map-outer:not(.map-expanded) .canvas-wrap) {
    max-width: min(100%, calc(100dvh - var(--map-chrome)));
}

/* Map controls (expand, zoom, pan) are in shared MapFrame component */

.map-input-row {
    /* On desktop, visually attach to the map card above */
    margin-top: -1px;
    padding: 12px 22px 14px;
    background: var(--color-paper);
    border: 1px solid var(--color-rule);
    border-top: none;
}

/* ═════════════════════════════════════════════════════════════
   Sidebar panels
   ═════════════════════════════════════════════════════════════ */
.side-panel {
    border: 1px solid var(--color-rule);
    padding: 14px 16px;
    background: var(--color-paper);
}
.leaderboard-panel {
    min-height: 180px;
}

/* ═════════════════════════════════════════════════════════════
   Desktop — side-by-side layout
   ═════════════════════════════════════════════════════════════ */
@media (min-width: 900px) {
    .semantic-layout {
        grid-template-columns: minmax(0, 1fr) 320px;
        gap: 20px;
    }
    .map-card {
        padding: 24px 28px 18px;
    }
    .map-input-row {
        padding: 12px 28px 16px;
    }
    .map-title {
        font-size: 28px;
    }
}

/* ═════════════════════════════════════════════════════════════
   Mobile — compact spacing. On a 375×667 phone the map card
   alone can exceed 500px. Every pixel of padding matters.
   ═════════════════════════════════════════════════════════════ */
@media (max-width: 520px) {
    .semantic-body {
        padding: 8px 4px 16px;
    }
    .semantic-layout {
        gap: 8px;
    }
    .map-card {
        padding: 10px 10px 10px;
        border: none;
    }
    /* Hide expand button on mobile — map is already near-fullscreen */
    :deep([aria-label='Expand map']),
    :deep([aria-label='Collapse map']) {
        display: none;
    }
    /* Hide map header on mobile — redundant with app header */
    .map-header {
        display: none;
    }
    .map-canvas-wrap {
        min-height: min(180px, 40dvh);
        max-height: 40dvh;
    }
    /* Fixed input bar: pinned to the bottom of the viewport so it
       remains accessible when the mobile keyboard opens. */
    .map-input-row {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        z-index: 20;
        background: var(--color-paper);
        padding: 8px 12px;
        padding-bottom: max(8px, env(safe-area-inset-bottom));
        border-top: 1px solid var(--color-rule);
    }
    /* Spacer so content doesn't hide behind the fixed input bar */
    .semantic-body {
        padding-bottom: 80px;
    }
    .side-panel {
        padding: 10px 10px;
        border-left: none;
        border-right: none;
    }
    .leaderboard-panel {
        min-height: auto;
    }
    .win-overlay {
        padding-top: 8px;
    }
    .win-badge {
        padding: 8px 14px;
    }
    .win-word {
        font-size: 20px;
    }
    .win-stat {
        font-size: 9px;
    }
}
@media (max-width: 380px) {
    .map-title {
        font-size: 15px;
    }
    .map-canvas-wrap {
        min-height: min(200px, 40dvh);
    }
}
</style>
