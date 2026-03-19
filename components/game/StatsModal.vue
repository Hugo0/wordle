<template>
    <SharedBaseModal :visible="visible" size="lg" no-padding @close="$emit('close')">
        <!-- Header -->
        <div class="flex-initial relative mx-5 mt-5 z-50">
            <h3 class="flex-auto text-center text-xl font-bold">
                Wordle {{ lang.config?.name_native }} #{{ lang.todaysIdx }} {{ game.attempts }}/6
            </h3>
        </div>

        <!-- Tab buttons -->
        <div class="flex mx-5 mt-2 border-b border-gray-200 dark:border-gray-600" role="tablist">
            <button
                role="tab"
                :aria-selected="statsTab === 'today'"
                class="flex-1 py-2 text-xs font-medium transition-colors border-b-2"
                :class="
                    statsTab === 'today'
                        ? 'text-neutral-900 dark:text-white border-neutral-800 dark:border-neutral-200'
                        : 'text-neutral-500 dark:text-neutral-400 border-transparent hover:text-neutral-700 dark:hover:text-neutral-300'
                "
                @click="statsTab = 'today'"
            >
                {{ lang.config?.ui?.today }}
            </button>
            <button
                role="tab"
                :aria-selected="statsTab === 'stats'"
                class="flex-1 py-2 text-xs font-medium transition-colors border-b-2"
                :class="
                    statsTab === 'stats'
                        ? 'text-neutral-900 dark:text-white border-neutral-800 dark:border-neutral-200'
                        : 'text-neutral-500 dark:text-neutral-400 border-transparent hover:text-neutral-700 dark:hover:text-neutral-300'
                "
                @click="statsTab = 'stats'"
            >
                {{ lang.config?.ui?.statistics }}
            </button>
            <button
                role="tab"
                :aria-selected="statsTab === 'global'"
                class="flex-1 py-2 text-xs font-medium transition-colors border-b-2"
                :class="
                    statsTab === 'global'
                        ? 'text-neutral-900 dark:text-white border-neutral-800 dark:border-neutral-200'
                        : 'text-neutral-500 dark:text-neutral-400 border-transparent hover:text-neutral-700 dark:hover:text-neutral-300'
                "
                @click="statsTab = 'global'"
            >
                {{ lang.config?.ui?.all_languages }}
            </button>
        </div>

        <!-- ============================================================ -->
        <!-- TODAY tab: word, definition, image, share, timer              -->
        <!-- ============================================================ -->
        <div v-show="statsTab === 'today'">
            <!-- Today's word heading -->
            <div v-if="game.gameOver" class="px-6 pt-3 pb-1 text-center">
                <a
                    :href="'/' + lang.languageCode + '/word/' + lang.todaysIdx"
                    class="inline-block group"
                >
                    <p
                        class="text-lg font-bold tracking-widest uppercase text-neutral-800 dark:text-neutral-100 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors"
                    >
                        {{ lang.todaysWord }}
                    </p>
                </a>
            </div>

            <!-- Definition Card (respects Word Info toggle) -->
            <div v-if="settings.wordInfoEnabled && game.todayDefinitionLoading" class="px-6 pb-2">
                <div class="animate-pulse flex gap-2">
                    <div class="flex-1 space-y-1.5">
                        <div class="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-20" />
                        <div class="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-full" />
                    </div>
                </div>
            </div>
            <div v-else-if="settings.wordInfoEnabled && game.todayDefinition" class="px-6 pb-2">
                <div class="flex items-start gap-2">
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 mb-0.5">
                            <span
                                class="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400"
                            >
                                {{ lang.config?.ui?.definition }}
                            </span>
                            <span
                                v-if="game.todayDefinition.partOfSpeech"
                                class="text-xs text-neutral-400 dark:text-neutral-500 italic"
                            >
                                {{ game.todayDefinition.partOfSpeech }}
                            </span>
                        </div>
                        <p class="text-sm text-neutral-800 dark:text-neutral-200">
                            <strong class="uppercase">{{ game.todayDefinition.word }}</strong>
                            &mdash; {{ game.todayDefinition.definition }}
                        </p>
                    </div>
                    <a
                        v-if="game.todayDefinition.url"
                        :href="game.todayDefinition.url"
                        aria-label="View word details"
                        class="flex-shrink-0 text-neutral-400 hover:text-blue-500 dark:text-neutral-500 dark:hover:text-blue-400"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-4 w-4"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                        >
                            <path
                                d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"
                            />
                            <path
                                d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z"
                            />
                        </svg>
                    </a>
                </div>
            </div>

            <!-- Word Art Image (respects Word Info toggle) -->
            <div v-if="settings.wordInfoEnabled && game.todayImageLoading" class="px-6 pt-1 pb-2">
                <div class="animate-pulse">
                    <div class="h-48 bg-neutral-200 dark:bg-neutral-700 rounded-lg w-full" />
                </div>
            </div>
            <div v-else-if="settings.wordInfoEnabled && game.todayImageUrl" class="px-6 pt-1 pb-2">
                <a :href="'/' + lang.languageCode + '/word/' + lang.todaysIdx">
                    <img
                        :src="game.todayImageUrl"
                        :alt="lang.todaysWord"
                        class="w-full max-h-48 object-contain rounded-lg"
                    />
                </a>
            </div>

            <!-- Percentile + Share -->
            <div class="px-6 py-3 border-t border-gray-200 dark:border-gray-600">
                <div v-if="game.communityPercentile !== null" class="pb-2 text-center">
                    <a
                        :href="game.communityStatsLink"
                        class="inline-flex items-center gap-1 text-sm text-green-600 dark:text-green-400 hover:underline"
                    >
                        <template v-if="game.communityTotal <= 1">
                            {{ lang.config?.ui?.first_to_play }}
                        </template>
                        <template v-else-if="game.communityIsTopScore">
                            {{ lang.config?.ui?.top_score }}
                        </template>
                        <template v-else>
                            {{ lang.config?.ui?.better_than }}
                            {{ game.communityPercentile }}%
                            {{ lang.config?.ui?.of_players }}
                        </template>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-3.5 w-3.5"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                        >
                            <path
                                d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"
                            />
                            <path
                                d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z"
                            />
                        </svg>
                    </a>
                </div>
                <button
                    class="w-full py-2 px-4 text-white font-semibold rounded-lg shadow-lg transition-all duration-200"
                    :class="
                        game.shareButtonState === 'success'
                            ? 'bg-emerald-600 scale-105'
                            : 'bg-green-500 hover:bg-green-600 active:bg-green-700'
                    "
                    @click="game.shareResults()"
                >
                    <span v-if="game.shareButtonState === 'success'">
                        &#10003;
                        {{ lang.config?.text?.copied }}
                    </span>
                    <span v-else>
                        {{ lang.config?.text?.share }}
                    </span>
                </button>
            </div>

            <!-- Next word countdown -->
            <div
                class="flex flex-col items-center py-2 px-6 border-t border-gray-200 dark:border-gray-600"
            >
                <p class="uppercase font-semibold text-xs text-neutral-500 dark:text-neutral-400">
                    {{ lang.config?.text?.next_word }}
                </p>
                <!-- eslint-disable-next-line vue/no-v-html -->
                <p class="text-2xl font-bold" v-html="game.timeUntilNextDay" />
            </div>
        </div>

        <!-- ============================================================ -->
        <!-- STATS tab: distribution, language stats, emoji board + share  -->
        <!-- ============================================================ -->
        <div v-show="statsTab === 'stats'">
            <!-- Guess Distribution Graph -->
            <div class="px-6 py-3">
                <h4
                    class="text-xs font-semibold uppercase tracking-wide mb-1 text-center text-neutral-500 dark:text-neutral-400"
                >
                    {{ lang.config?.ui?.guess_distribution }}
                </h4>
                <div class="space-y-0.5">
                    <div v-for="n in 6" :key="n" class="flex items-center gap-1.5">
                        <span class="w-3 text-xs font-medium">{{ n }}</span>
                        <div
                            class="flex-1 h-4 bg-gray-100 dark:bg-neutral-700 rounded-sm overflow-hidden"
                        >
                            <div
                                class="h-full flex items-center justify-end px-1 text-[10px] font-bold text-white transition-all duration-300"
                                :class="
                                    isCurrentGuess(n)
                                        ? 'bg-green-500'
                                        : 'bg-gray-400 dark:bg-gray-500'
                                "
                                :style="{
                                    width: getDistributionBarWidth(n) + '%',
                                }"
                            >
                                <span v-if="statsStore.stats.guessDistribution">
                                    {{
                                        statsStore.stats.guessDistribution[
                                            n as 1 | 2 | 3 | 4 | 5 | 6
                                        ]
                                    }}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Language stats grid -->
            <div class="px-4 py-3 border-t border-gray-200 dark:border-gray-600">
                <div class="grid grid-cols-4 gap-1">
                    <div class="text-center">
                        <p class="text-xl font-bold">
                            {{ statsStore.stats.n_games }}
                        </p>
                        <p class="text-[10px] text-neutral-500 dark:text-neutral-400">
                            {{ lang.config?.ui?.games }}
                        </p>
                    </div>
                    <div class="text-center">
                        <p class="text-xl font-bold">
                            {{ Math.round(statsStore.stats.win_percentage) }}%
                        </p>
                        <p class="text-[10px] text-neutral-500 dark:text-neutral-400">
                            {{ lang.config?.ui?.win_percent }}
                        </p>
                    </div>
                    <div class="text-center">
                        <p class="text-xl font-bold">
                            <span v-if="statsStore.stats.current_streak > 0">&#x1F525;</span
                            >{{ statsStore.stats.current_streak }}
                        </p>
                        <p class="text-[10px] text-neutral-500 dark:text-neutral-400">
                            {{ lang.config?.ui?.streak }}
                        </p>
                    </div>
                    <div class="text-center">
                        <p class="text-xl font-bold">
                            {{ statsStore.stats.longest_streak }}
                        </p>
                        <p class="text-[10px] text-neutral-500 dark:text-neutral-400">
                            {{ lang.config?.ui?.best }}
                        </p>
                    </div>
                </div>
            </div>

            <!-- Emoji board -->
            <div
                class="relative flex-auto mx-6 my-3 pt-3 border-t border-gray-200 dark:border-gray-600"
            >
                <!-- eslint-disable-next-line vue/no-v-html -->
                <p
                    id="emoji_board"
                    class="text-md text-center whitespace-pre-line"
                    v-html="game.emojiBoard"
                />
                <p
                    v-if="game.attempts === '0'"
                    class="text-center text-sm text-gray-600 dark:text-gray-400"
                >
                    {{ lang.config?.text?.no_attempts }}
                </p>
            </div>

            <!-- Share button -->
            <div class="px-6 pb-3">
                <button
                    class="w-full py-2 px-4 text-white font-semibold rounded-lg shadow-lg transition-all duration-200"
                    :class="
                        game.shareButtonState === 'success'
                            ? 'bg-emerald-600 scale-105'
                            : 'bg-green-500 hover:bg-green-600 active:bg-green-700'
                    "
                    @click="game.shareResults()"
                >
                    <span v-if="game.shareButtonState === 'success'">
                        &#10003;
                        {{ lang.config?.text?.copied }}
                    </span>
                    <span v-else>
                        {{ lang.config?.text?.share }}
                    </span>
                </button>
            </div>
        </div>

        <!-- ============================================================ -->
        <!-- GLOBAL tab: all languages stats                               -->
        <!-- ============================================================ -->
        <div v-show="statsTab === 'global'">
            <div class="px-4 py-3">
                <!-- Summary grid -->
                <div class="grid grid-cols-4 gap-1 mb-2">
                    <div class="text-center">
                        <p class="text-xl font-bold">
                            {{ statsStore.totalStats.total_games }}
                        </p>
                        <p class="text-[10px] text-neutral-500 dark:text-neutral-400">
                            {{ lang.config?.ui?.games }}
                        </p>
                    </div>
                    <div class="text-center">
                        <p class="text-xl font-bold">
                            {{ Math.round(statsStore.totalStats.total_win_percentage) }}%
                        </p>
                        <p class="text-[10px] text-neutral-500 dark:text-neutral-400">
                            {{ lang.config?.ui?.win_percent }}
                        </p>
                    </div>
                    <div class="text-center">
                        <p class="text-xl font-bold">
                            <span v-if="statsStore.totalStats.current_overall_streak > 0"
                                >&#x1F525;</span
                            >{{ statsStore.totalStats.current_overall_streak }}
                        </p>
                        <p class="text-[10px] text-neutral-500 dark:text-neutral-400">
                            {{ lang.config?.ui?.streak }}
                        </p>
                    </div>
                    <div class="text-center">
                        <p class="text-xl font-bold">
                            {{ statsStore.totalStats.languages_won?.length || 0 }}
                        </p>
                        <p class="text-[10px] text-neutral-500 dark:text-neutral-400">
                            {{ lang.config?.ui?.languages }}
                        </p>
                    </div>
                </div>

                <!-- Per-language breakdown -->
                <div
                    v-if="Object.keys(statsStore.totalStats.game_stats || {}).length > 0"
                    class="max-h-32 overflow-y-auto border-t border-neutral-200 dark:border-neutral-600 pt-1"
                >
                    <div
                        v-for="(langStats, code) in statsStore.totalStats.game_stats"
                        :key="code"
                        class="flex items-center justify-between py-1 text-xs"
                    >
                        <span class="font-medium">
                            {{ getLanguageName(code as string) }}
                        </span>
                        <span class="text-neutral-500 dark:text-neutral-400">
                            {{ langStats.n_games }} &middot;
                            {{ Math.round(langStats.win_percentage) }}%
                            <span v-if="langStats.current_streak > 0" class="text-orange-500 ml-1">
                                &#x1F525;{{ langStats.current_streak }}
                            </span>
                        </span>
                    </div>
                </div>
                <p
                    v-else
                    class="text-xs text-neutral-500 dark:text-neutral-400 text-center pt-1 border-t border-neutral-200 dark:border-neutral-600"
                >
                    {{ lang.config?.ui?.play_more_languages }}
                </p>
            </div>
        </div>
    </SharedBaseModal>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { GuessDistribution } from '~/utils/types';

// ---------------------------------------------------------------------------
// Props & Emits
// ---------------------------------------------------------------------------

defineProps<{
    visible: boolean;
}>();

defineEmits<{
    close: [];
}>();

// ---------------------------------------------------------------------------
// Stores
// ---------------------------------------------------------------------------

const game = useGameStore();
const statsStore = useStatsStore();
const lang = useLanguageStore();
const settings = useSettingsStore();

// ---------------------------------------------------------------------------
// Local state
// ---------------------------------------------------------------------------

const statsTab = ref<'today' | 'stats' | 'global'>('today');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if the player won on guess number `n`.
 * Used to highlight the winning row in the distribution chart.
 */
function isCurrentGuess(n: number): boolean {
    return game.gameWon && game.attempts === String(n);
}

/**
 * Compute the bar width percentage for guess row `n`.
 * Scales relative to the max count; minimum 8% when count > 0
 * so the number label remains visible.
 */
function getDistributionBarWidth(n: number): number {
    const distribution: GuessDistribution | undefined = statsStore.stats.guessDistribution;
    if (!distribution) return 0;
    const count = distribution[n as 1 | 2 | 3 | 4 | 5 | 6] ?? 0;
    const values = Object.values(distribution) as number[];
    const maxCount = Math.max(...values, 1);
    return count > 0 ? Math.max((count / maxCount) * 100, 8) : 0;
}

/**
 * Look up the native display name for a language code.
 * Falls back to the code itself when no config is available.
 */
function getLanguageName(code: string): string {
    // In the per-language game stats the only language with a config loaded
    // is the current one. For other codes we just show the code.
    if (code === lang.languageCode) {
        return lang.config?.name_native || lang.config?.name || code;
    }
    return code;
}
</script>
