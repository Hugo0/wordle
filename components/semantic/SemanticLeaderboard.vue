<!--
    SemanticLeaderboard — combined proximity panel + guess list.

    Top: BEST rank hero (not latest). Shows "#15 of 10,058 · top 0.2%" with
    the word that achieved it, plus the log-% proximity bar driven by the
    best guess's display value. This is the player's high-water mark.

    Bottom: sorted guess list (closest first). Hover a row to highlight
    that dot on the map; click to focus it persistently.
-->

<script setup lang="ts">
import { computed } from 'vue';
import type { SemanticGuess } from '~/composables/useSemanticGame';
import { useAnimatedNumber } from '~/composables/useAnimatedNumber';
import { useAutoHeight } from '~/composables/useAutoHeight';
import { buildSemanticGradientFromCSS, sampleGradient } from '~/utils/semanticColor';
import { interpolate } from '~/utils/interpolate';

const langStore = useLanguageStore();
const ui = computed(() => langStore.config?.ui);

const props = defineProps<{
    /** All guesses the player has made */
    guesses: SemanticGuess[];
    /** Pre-sorted (by rank ascending) for display */
    sortedGuesses: SemanticGuess[];
    /** Best guess so far (null if game hasn't started) */
    bestGuess: SemanticGuess | null;
    /** Vocab size — denominator for "#N of M" and percentile */
    totalRanked: number;
    /** Currently hovered/pinned word — null = nothing highlighted */
    highlightedWord: string | null;
    /** Token-keyed signal that fires when the player beats their best rank */
    newBestSignal: { word: string; rank: number; token: number } | null;
}>();

const emit = defineEmits<{
    highlight: [word: string | null];
}>();

const { elRef: leaderboardRef } = useAutoHeight();

const VISIBLE_COUNT = 3;
const showAll = ref(false);
const visibleGuesses = computed(() =>
    showAll.value ? props.sortedGuesses : props.sortedGuesses.slice(0, VISIBLE_COUNT)
);
const hasMore = computed(() => props.sortedGuesses.length > VISIBLE_COUNT);

// Build gradient from CSS tokens on mount. Falls back to hardcoded defaults
// during SSR so the first paint gets reasonable colors.
const gradient = buildSemanticGradientFromCSS();

function rankColor(display: number): string {
    return sampleGradient(display, gradient);
}

// Target rank for the hero: the best rank so far, or the vocab size as a
// resting "starting line" value so the counter has somewhere to count down
// from on the first guess.
const targetHeroRank = computed(() => props.bestGuess?.rank ?? props.totalRanked);
const animatedHeroRank = useAnimatedNumber(targetHeroRank, { duration: 900 });
const heroRankDisplay = computed(() => Math.round(animatedHeroRank.value).toLocaleString());

const percentile = computed(() => {
    if (!props.bestGuess || props.totalRanked <= 0) return 0;
    return (props.bestGuess.rank / props.totalRanked) * 100;
});

const percentileLabel = computed(() => {
    const p = percentile.value;
    if (!props.bestGuess) return '';
    if (p < 0.1) return 'top 0.1%';
    if (p < 1) return `top ${p.toFixed(2)}%`;
    if (p < 10) return `top ${p.toFixed(1)}%`;
    return `top ${p.toFixed(0)}%`;
});

const tier = computed(() => {
    if (!props.bestGuess)
        return { label: ui.value?.semantic_tier_awaiting || 'Awaiting guess', cls: '' };
    const r = props.bestGuess.rank;
    if (r === 1) return { label: ui.value?.semantic_tier_found || 'Found', cls: 'found' };
    if (r <= 10)
        return { label: ui.value?.semantic_tier_scorching || 'Scorching', cls: 'scorching' };
    if (r <= 30) return { label: ui.value?.semantic_tier_burning || 'Burning', cls: 'burning' };
    if (r <= 100) return { label: ui.value?.semantic_tier_hot || 'Hot', cls: 'hot' };
    if (r <= 500) return { label: ui.value?.semantic_tier_warm || 'Warm', cls: 'warm' };
    if (r <= 2000) return { label: ui.value?.semantic_tier_cool || 'Cool', cls: 'cool' };
    return { label: ui.value?.semantic_tier_cold || 'Cold', cls: 'cold' };
});

const bestPercent = computed(() =>
    Math.max(0, Math.min(100, (props.bestGuess?.display ?? 0) * 100))
);

function onRowEnter(word: string) {
    emit('highlight', word);
}
function onRowLeave() {
    emit('highlight', null);
}
</script>

<template>
    <section class="leaderboard">
        <!-- Hero: best guess — or CTA when no guesses yet. -->
        <header v-if="bestGuess" class="leaderboard-header active">
            <div class="mono-label">{{ ui?.semantic_closest || 'Closest so far' }}</div>
            <div class="hero-row">
                <div class="hero-main">
                    <div class="hero-rank">#{{ heroRankDisplay }}</div>
                    <div class="hero-meta">
                        <div class="hero-word">{{ bestGuess.word }}</div>
                        <div class="hero-sub">
                            of {{ totalRanked.toLocaleString() }} · {{ percentileLabel }}
                        </div>
                    </div>
                </div>
            </div>
            <!-- Stationary-gradient progress bar: the gradient is painted on
                 the bar itself (always full-width), and a right-aligned mask
                 hides the unfilled portion. This way a 5% fill shows muted
                 grey instead of cramming the whole rainbow into a tiny strip. -->
            <div class="proximity-bar" :aria-valuenow="bestPercent">
                <div class="proximity-mask" :style="{ width: `${100 - bestPercent}%` }" />
            </div>
            <div class="proximity-tier" :class="tier.cls">
                {{ tier.label }}
            </div>
        </header>

        <!-- Empty state CTA: nudge the player to type their first guess. -->
        <header v-else class="leaderboard-header empty-cta">
            <div class="cta-headline">{{ ui?.semantic_cta_headline || 'Guess a word' }}</div>
            <p class="cta-body">
                {{
                    ui?.semantic_cta_body ||
                    'Type any word. The closer its meaning to the target, the lower its rank. Rank #1 = found it.'
                }}
            </p>
            <div class="cta-arrow" aria-hidden="true">↓</div>
        </header>

        <div v-if="guesses.length > 0" class="divider" />

        <!-- Guess list — TransitionGroup handles reorder via FLIP move -->
        <div v-if="guesses.length > 0" ref="leaderboardRef" class="guess-list-wrap">
            <div class="mono-label sub-label">
                {{ ui?.semantic_your_guesses || 'Your guesses' }}
            </div>
            <TransitionGroup tag="ol" name="rank-list" class="guess-list editorial-scroll">
                <li
                    v-for="g in visibleGuesses"
                    :key="g.guessNumber + ':' + g.word"
                    class="guess-item"
                    :class="{
                        highlighted: highlightedWord === g.word,
                        best: bestGuess && g.word === bestGuess.word,
                    }"
                    @mouseenter="onRowEnter(g.word)"
                    @mouseleave="onRowLeave"
                    @focus="onRowEnter(g.word)"
                    @blur="onRowLeave"
                    tabindex="0"
                >
                    <span class="guess-word">{{ g.word }}</span>
                    <span class="guess-rank" :style="{ color: rankColor(g.display) }">
                        #{{ g.rank.toLocaleString() }}
                    </span>
                </li>
            </TransitionGroup>
            <button v-if="hasMore" type="button" class="show-toggle" @click="showAll = !showAll">
                {{
                    showAll
                        ? ui?.show_less || 'Show less'
                        : interpolate(ui?.semantic_show_all || 'Show all {n}', {
                              n: sortedGuesses.length,
                          })
                }}
            </button>
        </div>
    </section>
</template>

<style scoped>
.leaderboard {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.leaderboard-header {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

/* Empty-state CTA: prompts the player to type their first guess when
   the game has just started and no best rank exists yet. */
.leaderboard-header.empty-cta {
    align-items: center;
    text-align: center;
    gap: 10px;
    padding: 6px 4px 4px;
}
.cta-headline {
    font-family: var(--font-display);
    font-size: 22px;
    font-weight: 600;
    color: var(--color-ink);
    line-height: 1.1;
}
.cta-body {
    margin: 0;
    font-family: var(--font-display);
    font-style: italic;
    font-size: 13px;
    line-height: 1.45;
    color: var(--color-muted);
    max-width: 240px;
}
.cta-body .mono {
    font-family: var(--font-mono);
    font-style: normal;
    font-size: 11px;
    letter-spacing: 0.04em;
    color: var(--color-ink);
}
.cta-arrow {
    font-family: var(--font-mono);
    font-size: 18px;
    color: var(--color-accent);
    animation: cta-bounce 1.8s ease-in-out infinite;
}
@keyframes cta-bounce {
    0%,
    100% {
        transform: translateY(0);
        opacity: 0.6;
    }
    50% {
        transform: translateY(4px);
        opacity: 1;
    }
}
/* Hide the verbose empty-state CTA on mobile — input field is self-explanatory */
@media (max-width: 520px) {
    .leaderboard-header.empty-cta {
        display: none;
    }
}

.mono-label {
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--color-muted);
}

.hero-row {
    display: flex;
    align-items: center;
    gap: 10px;
    position: relative;
    z-index: 1; /* sit above the new-best flash */
}
.hero-main {
    display: flex;
    align-items: baseline;
    gap: 10px;
    flex: 1;
    min-width: 0;
}
.hero-rank {
    font-family: var(--font-mono);
    font-size: 28px;
    font-weight: 700;
    color: var(--color-ink);
    font-variant-numeric: tabular-nums;
    line-height: 1;
}
.hero-meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    flex: 1;
}
.hero-word {
    font-family: var(--font-display);
    font-size: 18px;
    font-weight: 600;
    color: var(--color-ink);
    line-height: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.hero-word.placeholder {
    font-style: italic;
    font-weight: 400;
    color: var(--color-muted);
}
.hero-sub {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--color-muted);
    letter-spacing: 0.05em;
}

/* Stationary-gradient bar: the gradient is painted on the bar itself so
   the warm/hot/found colors live at fixed positions regardless of fill.
   The mask div sits on the right and shrinks left as the player improves,
   revealing the appropriate slice of the gradient. */
.proximity-bar {
    height: 8px;
    background: linear-gradient(
        90deg,
        var(--color-muted) 0%,
        var(--color-hot) 30%,
        var(--color-semicorrect) 50%,
        var(--color-correct) 90%
    );
    border: 1px solid var(--color-rule);
    overflow: hidden;
    position: relative;
}
.proximity-mask {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    background: var(--color-rule);
    transition: width 500ms cubic-bezier(0.22, 1, 0.36, 1);
}

.proximity-tier {
    font-family: var(--font-display);
    font-style: italic;
    font-size: 12px;
    color: var(--color-muted);
    text-align: right;
    margin-top: 2px;
}
.proximity-tier.cool {
    color: var(--color-muted);
}
.proximity-tier.warm {
    color: var(--color-semicorrect);
}
.proximity-tier.hot,
.proximity-tier.burning {
    color: var(--color-hot);
}
.proximity-tier.scorching {
    color: var(--color-accent);
    font-weight: 600;
}
.proximity-tier.found {
    color: var(--color-correct);
    font-weight: 600;
}

.divider {
    height: 1px;
    background: var(--color-rule);
    margin: 2px 0 4px;
}

.sub-label {
    margin-bottom: 6px;
}

.guess-list-wrap {
    display: flex;
    flex-direction: column;
    min-height: 0;
}

.guess-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    position: relative; /* container for TransitionGroup leave absolute */
}

/* Design-system scrollbar — matches AppSidebar */
.editorial-scroll {
    scrollbar-width: thin;
    scrollbar-color: var(--color-rule) transparent;
}
.editorial-scroll::-webkit-scrollbar {
    width: 4px;
}
.editorial-scroll::-webkit-scrollbar-track {
    background: transparent;
}
.editorial-scroll::-webkit-scrollbar-thumb {
    background: var(--color-rule);
    border-radius: 2px;
}
.editorial-scroll::-webkit-scrollbar-thumb:hover {
    background: var(--color-muted);
}

.guess-item {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
    padding: 6px 8px;
    border-left: 2px solid transparent;
    cursor: pointer;
    transition:
        background 120ms ease,
        border-color 120ms ease;
    outline: none;
}

/* TransitionGroup FLIP animation: new rows slide up from the bottom,
   existing rows smoothly move when the sort order changes, leaving rows
   fade out. `rank-list-move` is the magic class Vue applies to elements
   that change position after a reorder. */
.rank-list-enter-active {
    transition: all 500ms cubic-bezier(0.22, 1, 0.36, 1);
}
.rank-list-leave-active {
    transition: all 300ms ease;
    position: absolute; /* collapse out of flow so siblings can move */
    width: calc(100% - 16px);
}
.rank-list-move {
    transition: transform 600ms cubic-bezier(0.22, 1, 0.36, 1);
}
.rank-list-enter-from {
    opacity: 0;
    transform: translateY(24px);
}
.rank-list-leave-to {
    opacity: 0;
    transform: translateX(-12px);
}
.guess-item:hover,
.guess-item:focus-visible,
.guess-item.highlighted {
    background: var(--color-rule);
    border-left-color: var(--color-ink);
}
.guess-item.best {
    background: rgba(45, 133, 68, 0.08);
}
.guess-item.best.highlighted,
.guess-item.best:hover {
    background: rgba(45, 133, 68, 0.16);
}

.guess-word {
    font-family: var(--font-display);
    font-weight: 600;
    flex: 1;
    color: var(--color-ink);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.guess-rank {
    font-family: var(--font-mono);
    font-size: 11px;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.02em;
    flex-shrink: 0;
}
.show-toggle {
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--color-muted);
    background: none;
    border: none;
    padding: 8px 0 2px;
    cursor: pointer;
    text-align: center;
    transition: color 150ms ease;
}
.show-toggle:hover {
    color: var(--color-ink);
}

@media (max-width: 520px) {
    .leaderboard {
        gap: 6px;
    }
    .hero-rank {
        font-size: 22px;
    }
    .hero-word {
        font-size: 15px;
    }
    .hero-sub {
        font-size: 9px;
    }
    .cta-headline {
        font-size: 18px;
    }
    .cta-body {
        font-size: 12px;
    }
    .proximity-bar {
        height: 6px;
    }
    .guess-item {
        padding: 5px 6px;
    }
}
</style>
