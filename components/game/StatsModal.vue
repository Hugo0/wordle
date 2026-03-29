<template>
    <Teleport to="body">
        <Transition name="modal-fade">
            <div
                v-if="visible"
                class="fixed inset-0 z-50 flex items-start justify-center pt-[3vh] sm:pt-[5vh] px-3 overflow-y-auto pb-4"
            >
                <!-- Backdrop -->
                <div class="fixed inset-0 bg-ink/30" aria-hidden="true" @click="$emit('close')" />

                <!-- Endgame Card -->
                <div
                    class="relative w-full max-w-[480px] border border-rule bg-paper shadow-xl z-10 modal-animate stats-card"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Game results"
                    @keydown.escape="$emit('close')"
                >
                    <!-- Close button -->
                    <button
                        class="absolute top-3 end-3 z-10 p-1 text-muted hover:text-ink transition-colors"
                        aria-label="Close"
                        @click="$emit('close')"
                    >
                        <X :size="20" />
                    </button>

                    <!-- Top: Result + Word(s) + Definition(s) -->
                    <div class="text-center editorial-rule stats-top">
                        <!-- Mode label (for non-classic modes) -->
                        <div
                            v-if="modeLabel"
                            class="font-mono uppercase text-[9px] tracking-[0.2em] text-muted mb-1"
                        >
                            {{ modeLabel }}
                        </div>

                        <!-- Pre-game: masked word teaser -->
                        <template v-if="!game.gameOver">
                            <div
                                class="font-display font-extrabold uppercase text-muted/40 stats-word"
                                style="letter-spacing: 0.2em"
                            >
                                {{ maskedWord }}
                            </div>
                            <div
                                class="font-mono uppercase text-[10px] tracking-[0.2em] text-muted mt-2"
                            >
                                Play to reveal
                            </div>
                        </template>

                        <!-- Post-game: result label -->
                        <template v-else>
                            <div
                                class="font-mono uppercase text-[10px] tracking-[0.2em] mb-1"
                                :class="game.gameWon ? 'text-correct' : 'text-accent'"
                            >
                                {{ resultLabel }}
                            </div>
                        </template>

                        <!-- ── Single-board word display (classic, unlimited) ── -->
                        <template v-if="game.gameOver && !isMultiBoard">
                            <div
                                class="font-display font-extrabold uppercase text-ink stats-word"
                                style="letter-spacing: 0.08em"
                            >
                                {{ displayWord }}
                            </div>

                            <div
                                v-if="
                                    settings.wordInfoEnabled && game.todayDefinition?.partOfSpeech
                                "
                                class="font-display italic text-muted text-[15px] mt-1 mb-3"
                            >
                                {{
                                    translatePos(game.todayDefinition.partOfSpeech, lang.config?.ui)
                                }}
                            </div>

                            <div
                                v-if="settings.wordInfoEnabled && game.todayDefinition"
                                class="text-[14px] text-ink leading-relaxed max-w-[360px] mx-auto pt-3 border-t border-rule"
                            >
                                <strong class="uppercase">{{ game.todayDefinition.word }}</strong>
                                &mdash;
                                {{ game.todayDefinition.definition }}
                            </div>

                            <div
                                v-else-if="settings.wordInfoEnabled && game.todayDefinitionLoading"
                                class="animate-pulse pt-3 border-t border-rule max-w-[360px] mx-auto"
                            >
                                <div class="h-3 bg-muted-soft w-20 mx-auto mb-2" />
                                <div class="h-4 bg-muted-soft w-full" />
                            </div>
                        </template>

                        <!-- ── Multi-board word display (dordle, tridle, quordle) ── -->
                        <template v-else-if="game.gameOver && isMultiBoard">
                            <div class="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-1">
                                <div
                                    v-for="(board, i) in game.boards"
                                    :key="i"
                                    class="font-display font-extrabold uppercase text-ink"
                                    :style="multiBoardWordStyle"
                                >
                                    <span :class="board.solved ? 'text-ink' : 'text-accent'">
                                        {{ board.targetWord }}
                                    </span>
                                </div>
                            </div>

                            <!-- Multi-board definitions (paginated for 8+ boards) -->
                            <div
                                v-if="
                                    settings.wordInfoEnabled && game.boardDefinitions.some((d) => d)
                                "
                                class="mt-4 pt-3 border-t border-rule max-w-[400px] mx-auto"
                            >
                                <div class="space-y-2">
                                    <div
                                        v-for="(def, i) in visibleDefinitions"
                                        :key="defPageStart + i"
                                        class="text-[13px] text-ink leading-relaxed text-left"
                                    >
                                        <template v-if="def">
                                            <strong class="uppercase">{{ def.word }}</strong>
                                            <span
                                                v-if="def.partOfSpeech"
                                                class="text-muted italic text-[12px] ml-1"
                                            >
                                                {{
                                                    translatePos(def.partOfSpeech, lang.config?.ui)
                                                }}
                                            </span>
                                            <span class="mx-1">&mdash;</span>
                                            {{ def.definition }}
                                        </template>
                                    </div>
                                </div>
                                <!-- Page controls for 8+ boards -->
                                <div
                                    v-if="defTotalPages > 1"
                                    class="flex items-center justify-center gap-3 mt-3"
                                >
                                    <button
                                        class="text-muted hover:text-ink text-xs font-mono transition-colors disabled:opacity-30"
                                        :disabled="defPage === 0"
                                        @click="defPage--"
                                    >
                                        &larr;
                                    </button>
                                    <span class="mono-label text-[9px]">
                                        {{ defPage + 1 }}/{{ defTotalPages }}
                                    </span>
                                    <button
                                        class="text-muted hover:text-ink text-xs font-mono transition-colors disabled:opacity-30"
                                        :disabled="defPage >= defTotalPages - 1"
                                        @click="defPage++"
                                    >
                                        &rarr;
                                    </button>
                                </div>
                            </div>

                            <div
                                v-else-if="settings.wordInfoEnabled && game.boardDefinitionsLoading"
                                class="animate-pulse pt-3 border-t border-rule max-w-[400px] mx-auto space-y-2"
                            >
                                <div
                                    v-for="i in Math.min(game.boards.length, 4)"
                                    :key="i"
                                    class="h-4 bg-muted-soft w-full"
                                />
                            </div>
                        </template>
                    </div>

                    <!-- Per-board solve summary (multi-board only) -->
                    <div
                        v-if="isMultiBoard && game.gameOver"
                        class="flex justify-center gap-3 editorial-rule"
                        style="padding: 10px 32px"
                    >
                        <div v-for="(board, i) in game.boards" :key="i" class="text-center">
                            <div
                                class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mx-auto mb-1"
                                :class="
                                    board.solved
                                        ? 'bg-correct/20 text-correct'
                                        : 'bg-accent/20 text-accent'
                                "
                            >
                                {{ board.solved ? board.solvedAtGuess : '✗' }}
                            </div>
                            <div class="font-mono text-[9px] text-muted uppercase">
                                Board {{ i + 1 }}
                            </div>
                        </div>
                    </div>

                    <!-- AI Image — single-board only, click to expand, only after game over -->
                    <div
                        v-if="
                            game.gameOver &&
                            !isMultiBoard &&
                            settings.wordInfoEnabled &&
                            game.todayImageUrl
                        "
                        class="editorial-rule cursor-pointer"
                        @click="imageExpanded = !imageExpanded"
                    >
                        <img
                            :src="game.todayImageUrl"
                            :alt="lang.todaysWord"
                            class="w-full object-cover transition-all"
                            :style="{ maxHeight: imageExpanded ? '256px' : undefined }"
                            :class="{ 'stats-image': !imageExpanded }"
                        />
                    </div>

                    <!-- Stats grid (4 columns, compact) -->
                    <div class="grid grid-cols-4 editorial-rule">
                        <div
                            v-for="stat in todayStats"
                            :key="stat.label"
                            class="text-center border-r border-rule last:border-r-0 stats-stat-cell"
                        >
                            <div class="font-display font-bold text-ink stats-stat-value">
                                {{ stat.value }}
                            </div>
                            <div class="mono-label mt-0.5">{{ stat.label }}</div>
                        </div>
                    </div>

                    <!-- Guess Distribution (compact) + Percentile -->
                    <div class="editorial-rule stats-section">
                        <h4
                            class="mono-label mb-2.5"
                            style="font-size: 10px; letter-spacing: 0.15em"
                        >
                            {{ lang.config?.ui?.guess_distribution || 'Guess Distribution' }}
                        </h4>
                        <div class="space-y-1">
                            <div
                                v-for="n in distributionRows"
                                :key="n"
                                class="flex items-center gap-2"
                            >
                                <span class="font-mono font-semibold text-[12px] w-3 text-right">
                                    {{ n }}
                                </span>
                                <div
                                    class="h-[20px] flex items-center justify-end px-2 font-mono text-[10px] font-semibold text-white transition-all"
                                    style="
                                        min-width: 20px;
                                        transition: width 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                                    "
                                    :class="
                                        isCurrentGuess(n)
                                            ? 'bg-correct'
                                            : getDistributionCount(n) > 0
                                              ? 'bg-muted'
                                              : 'bg-muted-soft'
                                    "
                                    :style="{ width: getDistributionBarWidth(n) + '%' }"
                                >
                                    <span v-if="getDistributionCount(n) > 0">
                                        {{ getDistributionCount(n) }}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <!-- Percentile (part of distribution section) -->
                        <div
                            v-if="game.communityPercentile !== null"
                            class="text-center pt-3 mt-3 border-t border-rule"
                        >
                            <a
                                :href="game.communityStatsLink"
                                class="inline-flex items-center gap-1 text-sm text-correct hover:underline"
                            >
                                <template v-if="game.communityTotal <= 1">
                                    {{ lang.config?.ui?.first_to_play }}
                                </template>
                                <template v-else-if="game.communityIsTopScore">
                                    {{ lang.config?.ui?.top_score }}
                                </template>
                                <template v-else>
                                    Top {{ 100 - game.communityPercentile }}%
                                </template>
                                <ExternalLink :size="12" />
                            </a>
                        </div>
                    </div>

                    <!-- Action buttons — share only available after game over -->
                    <div class="flex gap-3 stats-actions">
                        <button
                            v-if="game.gameOver"
                            class="flex-1 stats-btn bg-ink text-paper font-body text-sm font-semibold tracking-wide transition-opacity hover:opacity-85 cursor-pointer inline-flex items-center justify-center gap-2"
                            @click="game.shareResults()"
                        >
                            <template v-if="game.shareButtonState === 'success'">
                                <Check :size="16" />
                                {{ lang.config?.text?.copied || 'Copied!' }}
                            </template>
                            <template v-else>
                                <Share2 :size="16" />
                                {{ lang.config?.text?.share || 'Share Result' }}
                            </template>
                        </button>
                        <!-- Classic daily → link to unlimited -->
                        <NuxtLink
                            v-if="game.gameOver && isClassicDaily"
                            :to="'/' + lang.languageCode + '/unlimited'"
                            class="flex-1 stats-btn border border-ink text-ink font-body text-sm font-semibold tracking-wide transition-all hover:bg-ink hover:text-paper text-center cursor-pointer whitespace-nowrap"
                        >
                            Unlimited
                        </NuxtLink>
                        <!-- Non-daily modes → new game button -->
                        <button
                            v-else-if="game.gameOver"
                            class="flex-1 stats-btn border border-ink text-ink font-body text-sm font-semibold tracking-wide transition-all hover:bg-ink hover:text-paper text-center cursor-pointer whitespace-nowrap"
                            @click="$emit('newGame')"
                        >
                            {{ isDaily ? 'Close' : 'New Game' }}
                        </button>
                        <!-- Pre-game: just a close button -->
                        <button
                            v-else
                            class="flex-1 stats-btn border border-ink text-ink font-body text-sm font-semibold tracking-wide transition-all hover:bg-ink hover:text-paper text-center cursor-pointer"
                            @click="$emit('close')"
                        >
                            Close
                        </button>
                    </div>

                    <!-- Next wordle timer — daily modes only -->
                    <div
                        v-if="isDaily"
                        class="flex items-center justify-between bg-paper-warm text-sm stats-section"
                    >
                        <span class="text-muted">
                            {{ nextWordLabel }}
                        </span>
                        <!-- eslint-disable-next-line vue/no-v-html -->
                        <span
                            class="font-mono font-semibold text-[20px] text-ink"
                            style="letter-spacing: 0.08em"
                            v-html="game.timeUntilNextDay"
                        />
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { X, ExternalLink, Share2, Check } from 'lucide-vue-next';
import type { GuessDistribution } from '~/utils/types';
import { GAME_MODE_CONFIG } from '~/utils/game-modes';

const props = defineProps<{ visible: boolean }>();
defineEmits<{ close: []; newGame: [] }>();

const game = useGameStore();
const statsStore = useStatsStore();
const lang = useLanguageStore();
const settings = useSettingsStore();
const analytics = useAnalytics();

const imageExpanded = ref(false);
const definitionTracked = ref(false);

// Track definition/image view once when modal is visible AND content is loaded.
// Watches both visibility and definition data to handle late-loading definitions.
watch(
    () => [props.visible, game.todayDefinition, game.boardDefinitions, game.todayImageUrl] as const,
    ([visible]) => {
        if (!visible || definitionTracked.value) return;
        const hasDefinition = game.todayDefinition || game.boardDefinitions?.some((d: any) => d);
        if (hasDefinition || game.todayImageUrl) {
            if (hasDefinition) {
                analytics.trackDefinitionView(lang.languageCode, 'stats_modal');
            }
            if (game.todayImageUrl) {
                analytics.trackDefinitionImageView(lang.languageCode);
            }
            definitionTracked.value = true;
        }
    }
);

const isDaily = computed(() => game.gameConfig.playType === 'daily');
const isClassicDaily = computed(
    () => game.gameConfig.mode === 'classic' && game.gameConfig.playType === 'daily'
);
const isSpeed = computed(() => game.gameConfig.mode === 'speed');

const nextWordLabel = computed(() => {
    const mode = game.gameConfig.mode;
    const label = GAME_MODE_CONFIG[mode]?.label;
    if (label && mode !== 'classic' && mode !== 'unlimited' && mode !== 'speed')
        return `Next ${label}`;
    return lang.config?.text?.next_word || 'Next Wordle';
});

const modeLabel = computed(() => {
    const mode = game.gameConfig.mode;
    if (mode === 'classic') return null;
    return GAME_MODE_CONFIG[mode]?.label ?? null;
});

const resultLabel = computed(() => {
    if (!game.gameOver) return '';
    if (isMultiBoard.value) {
        const solvedCount = game.boards.filter((b) => b.solved).length;
        const total = game.boards.length;
        if (game.gameWon) {
            return `All ${total} boards solved in ${game.attempts} guesses`;
        }
        return `${solvedCount}/${total} boards solved`;
    }
    if (game.gameWon) {
        const n = Number(game.attempts);
        return `Solved in ${game.attempts} ${n === 1 ? 'guess' : 'guesses'}`;
    }
    return 'Not solved';
});

const maskedWord = computed(() => {
    const wordLength = game.gameConfig.wordLength || 5;
    return '?'.repeat(wordLength);
});

const multiBoardWordStyle = computed(() => {
    const bc = game.gameConfig.boardCount;
    const fontSize = bc <= 2 ? '32px' : bc <= 4 ? '24px' : bc <= 8 ? '18px' : '14px';
    return {
        fontSize,
        letterSpacing: '0.06em',
        fontVariationSettings: "'opsz' 72",
        lineHeight: '1.2',
    };
});
const isMultiBoard = computed(() => game.gameConfig.boardCount > 1);

// Definition pagination for multi-board modes — show 4 at a time for 8+ boards
const DEFS_PER_PAGE = 4;
const defPage = ref(0);
const defTotalPages = computed(() => {
    const total = game.boardDefinitions.length;
    if (total <= DEFS_PER_PAGE) return 1;
    return Math.ceil(total / DEFS_PER_PAGE);
});
const defPageStart = computed(() => defPage.value * DEFS_PER_PAGE);
const visibleDefinitions = computed(() => {
    const defs = game.boardDefinitions;
    if (defs.length <= DEFS_PER_PAGE) return defs;
    return defs.slice(defPageStart.value, defPageStart.value + DEFS_PER_PAGE);
});

// Reset definition page when modal opens
watch(
    () => props.visible,
    (v) => {
        if (v) defPage.value = 0;
    }
);

// Distribution rows start at boardCount (minimum possible guesses to win).
// For classic/unlimited (1 board): rows 1–6. For quordle (4 boards): rows 4–9.
const distributionRows = computed(() => {
    const min = game.gameConfig.boardCount;
    const max = game.gameConfig.maxGuesses;
    return Array.from({ length: max - min + 1 }, (_, i) => min + i);
});
const displayWord = computed(() => {
    if (isMultiBoard.value) return null; // multi-board shows words differently
    return game.boards[0]?.targetWord || lang.todaysWord;
});

const todayStats = computed(() => {
    const base = [
        { value: statsStore.stats.n_games, label: lang.config?.ui?.games || 'Played' },
        {
            value: Math.round(statsStore.stats.win_percentage) + '%',
            label: lang.config?.ui?.win_percent || 'Win %',
        },
    ];
    // Streaks only make sense for daily modes (classic, dordle, tridle, quordle)
    if (isDaily.value) {
        base.push(
            { value: statsStore.stats.current_streak, label: lang.config?.ui?.streak || 'Streak' },
            { value: statsStore.stats.longest_streak, label: lang.config?.ui?.best || 'Best' }
        );
    } else {
        const avg = statsStore.stats.avg_attempts;
        base.push(
            { value: statsStore.stats.n_wins, label: lang.config?.ui?.wins || 'Wins' },
            { value: avg > 0 ? +avg.toFixed(1) : 0, label: lang.config?.ui?.avg_attempts || 'Avg' }
        );
    }
    return base;
});

function isCurrentGuess(n: number): boolean {
    return game.gameWon && game.attempts === String(n);
}

function getDistributionCount(n: number): number {
    const distribution: GuessDistribution | undefined = statsStore.stats.guessDistribution;
    if (!distribution) return 0;
    return distribution[n] ?? 0;
}

function getDistributionBarWidth(n: number): number {
    const distribution: GuessDistribution | undefined = statsStore.stats.guessDistribution;
    if (!distribution) return 0;
    const count = distribution[n] ?? 0;
    const values = Object.values(distribution) as number[];
    const maxCount = Math.max(...values, 1);
    return count > 0 ? Math.max((count / maxCount) * 100, 8) : 0;
}
</script>

<style scoped>
/* Default (large screen) sizing — matches the original editorial design */
.stats-top {
    padding: 28px 32px 24px;
}
.stats-word {
    font-size: 42px;
    font-variation-settings: 'opsz' 144;
    line-height: 1.1;
}
.stats-image {
    max-height: 96px;
}
.stats-stat-cell {
    padding: 14px 8px;
}
.stats-stat-value {
    font-size: 26px;
    font-variation-settings: 'opsz' 72;
}
.stats-section {
    padding: 16px 32px;
}
.stats-actions {
    padding: 20px 32px;
}
.stats-btn {
    padding: 12px 20px;
}

/* Compact layout for short screens (iPhone SE, etc.) */
@media (max-height: 700px) {
    .stats-top {
        padding: 16px 20px 14px;
    }
    .stats-word {
        font-size: 32px;
    }
    .stats-image {
        max-height: 56px;
    }
    .stats-stat-cell {
        padding: 10px 6px;
    }
    .stats-stat-value {
        font-size: 20px;
    }
    .stats-section {
        padding: 12px 20px;
    }
    .stats-actions {
        padding: 14px 20px;
    }
    .stats-btn {
        padding: 10px 16px;
    }
}
</style>
