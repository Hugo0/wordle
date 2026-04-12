<!--
    SemanticStatsModal — end-of-game modal for Semantic Explorer.

    Shows: target reveal, guess count, win/loss status, list of all guesses
    with ranks, target's 8 nearest neighbours by semantic distance,
    and Share / New game buttons.
-->

<script setup lang="ts">
import { computed, ref } from 'vue';
import { Sparkles, Trophy, XCircle, Share2, Check } from 'lucide-vue-next';
import type { Neighbour, SemanticGuess } from '~/composables/useSemanticGame';
import { wordDetailPath } from '~/utils/wordUrls';

const langStore = useLanguageStore();
const ui = computed(() => langStore.config?.ui);

const props = defineProps<{
    visible: boolean;
    won: boolean;
    gameOver: boolean;
    targetWord: string | null;
    guesses: SemanticGuess[];
    neighbours: Neighbour[];
    guessesMax: number;
    dayIdx: number;
    lang: string;
    llmHintUsed: boolean;
    /** Whether this is a daily game (affects Play Again vs Keep Playing). */
    isDaily?: boolean;
}>();

const emit = defineEmits<{
    close: [];
    share: [];
    newGame: [];
    keepPlaying: [];
}>();

// Share button feedback — self-contained, resets after 2s
const shareCopied = ref(false);
let shareTimer: ReturnType<typeof setTimeout> | null = null;

function onShareClick() {
    emit('share');
    shareCopied.value = true;
    if (shareTimer) clearTimeout(shareTimer);
    shareTimer = setTimeout(() => {
        shareCopied.value = false;
    }, 2000);
}

const bestRank = computed(() => {
    if (!props.guesses.length) return null;
    return Math.min(...props.guesses.map((g) => g.rank));
});
</script>

<template>
    <BaseModal :visible="visible" size="lg" label-id="semantic-stats-label" @close="emit('close')">
        <div class="stats-body">
            <!-- Header -->
            <div class="stats-header">
                <div class="stats-icon" :class="{ won, lost: !won && gameOver }">
                    <Trophy v-if="won" :size="32" />
                    <XCircle v-else :size="32" />
                </div>
                <h2 id="semantic-stats-label" class="heading-display stats-title">
                    {{
                        won ? ui?.semantic_won || 'Found it' : ui?.semantic_lost || 'Out of guesses'
                    }}
                </h2>
                <p class="stats-subtitle">
                    {{ ui?.semantic_title || 'Semantic Explorer' }} · Day #{{ dayIdx }} ·
                    {{ lang.toUpperCase() }}
                </p>
            </div>

            <!-- Target reveal -->
            <div class="target-reveal">
                <div class="mono-label">{{ ui?.the_word_was || 'The word was' }}</div>
                <div class="target-word">{{ targetWord ?? '?' }}</div>
                <NuxtLink
                    v-if="targetWord"
                    :to="wordDetailPath(lang, targetWord)"
                    class="explore-link"
                >
                    {{ ui?.semantic_explore_link || 'Explore in meaning space →' }}
                </NuxtLink>
            </div>

            <!-- Key stats -->
            <div class="stat-row">
                <div class="stat-cell">
                    <div class="stat-number">
                        {{ guesses.length }}<span class="stat-denom">/{{ guessesMax }}</span>
                    </div>
                    <div class="mono-label">{{ ui?.semantic_guesses || 'Guesses' }}</div>
                </div>
                <div class="stat-cell">
                    <div class="stat-number">
                        <span v-if="bestRank !== null">#{{ bestRank.toLocaleString() }}</span>
                        <span v-else>—</span>
                    </div>
                    <div class="mono-label">{{ ui?.semantic_best_rank || 'Best rank' }}</div>
                </div>
                <div class="stat-cell">
                    <div class="stat-number">
                        <Sparkles v-if="llmHintUsed" :size="20" class="inline-icon" />
                        <span v-else>—</span>
                    </div>
                    <div class="mono-label">{{ ui?.semantic_oracle || 'Oracle' }}</div>
                </div>
            </div>

            <!-- Neighbours (what you didn't guess) -->
            <div class="section" v-if="neighbours.length">
                <div class="mono-label section-label">
                    {{ ui?.semantic_neighbours_label || 'Closest words you missed' }}
                </div>
                <div class="neighbour-grid">
                    <span v-for="n in neighbours.slice(0, 8)" :key="n.word" class="neighbour-chip">
                        {{ n.word }}
                        <span class="chip-sim">#{{ n.rank }}</span>
                    </span>
                </div>
            </div>

            <!-- Actions — matches classic StatsModal pattern -->
            <div class="flex gap-3 stats-actions">
                <button
                    type="button"
                    class="flex-1 stats-btn bg-ink text-paper font-body text-sm font-semibold tracking-wide transition-opacity hover:opacity-85 cursor-pointer inline-flex items-center justify-center gap-2"
                    @click="onShareClick"
                >
                    <template v-if="shareCopied">
                        <Check :size="16" />
                        {{ langStore.config?.text?.copied || 'Copied!' }}
                    </template>
                    <template v-else>
                        <Share2 :size="16" />
                        {{ ui?.share_result || 'Share' }}
                    </template>
                </button>
                <button
                    v-if="isDaily"
                    type="button"
                    class="flex-1 stats-btn border border-ink text-ink font-body text-sm font-semibold tracking-wide transition-all hover:bg-ink hover:text-paper text-center cursor-pointer whitespace-nowrap"
                    @click="emit('keepPlaying')"
                >
                    {{ ui?.keep_playing || 'Keep Playing' }}
                </button>
                <button
                    v-else
                    type="button"
                    class="flex-1 stats-btn border border-ink text-ink font-body text-sm font-semibold tracking-wide transition-all hover:bg-ink hover:text-paper text-center cursor-pointer whitespace-nowrap"
                    @click="emit('newGame')"
                >
                    {{ ui?.play_again || 'Play Again' }}
                </button>
            </div>
        </div>
    </BaseModal>
</template>

<style scoped>
.stats-body {
    display: flex;
    flex-direction: column;
    gap: 18px;
    padding-top: 4px;
}
.stats-header {
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 4px;
    align-items: center;
}
.stats-icon {
    color: var(--color-muted);
    margin-bottom: 4px;
}
.stats-icon.won {
    color: var(--color-correct);
}
.stats-icon.lost {
    color: var(--color-accent);
}
.stats-title {
    font-family: var(--font-display);
    font-size: 32px;
    font-weight: 700;
    line-height: 1;
    margin: 0;
}
.stats-subtitle {
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--color-muted);
    margin: 0;
}
.target-reveal {
    text-align: center;
    padding: 18px;
    border: 1px solid var(--color-rule);
    background: var(--color-paper);
}
.mono-label {
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--color-muted);
}
.target-word {
    font-family: var(--font-display);
    font-size: 40px;
    font-weight: 700;
    color: var(--color-ink);
    margin-top: 6px;
    line-height: 1;
}
.explore-link {
    display: inline-block;
    margin-top: 10px;
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--color-accent);
    text-decoration: none;
    transition: opacity 120ms ease;
}
.explore-link:hover {
    opacity: 0.75;
}
.stat-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    text-align: center;
}
.stat-cell {
    padding: 12px 8px;
    border: 1px solid var(--color-rule);
}
.stat-number {
    font-family: var(--font-display);
    font-size: 28px;
    font-weight: 700;
    color: var(--color-ink);
    line-height: 1;
}
.stat-denom {
    font-size: 15px;
    color: var(--color-muted);
    font-weight: 400;
}
.inline-icon {
    color: var(--color-accent);
}
.section-label {
    margin-bottom: 8px;
}
.neighbour-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}
.neighbour-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    background: var(--color-paper);
    border: 1px solid var(--color-rule);
    font-family: var(--font-display);
    font-size: 13px;
    color: var(--color-ink);
}
.chip-sim {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--color-muted);
}
/* Action buttons — same sizing as classic StatsModal */
.stats-actions {
    padding: 20px 0 0;
}
.stats-btn {
    padding: 12px 20px;
}
</style>
