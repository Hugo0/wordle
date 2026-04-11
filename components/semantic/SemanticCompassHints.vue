<!--
    SemanticCompassHints — sidebar panel with compass hint rows + LLM hint.

    Each compass hint renders anchor-based prose:
      "Target is [slightly|—|much] more like {anchor} than {opposite}"
    derived from the signed delta (a·r) and a magnitude tier computed from
    |delta|/‖r‖ on the server. No bars, no hand-curated per-axis templates —
    the axis's anchor words ARE the copy, so every axis in the pool works
    automatically.

    Empty-state branches:
      - no guesses yet          → "Your compass will appear after your first guess"
      - compassStatus === 'close' → "You're very close — try a different angle"
      - compassStatus === 'ok' and hints.length === 0 → shouldn't happen, but
        we render the 'close' fallback defensively

    The LLM hint panel below shows a locked state (pre-guess 5), the
    "Request hint" button (one-shot), and the revealed hint afterward.
-->

<script setup lang="ts">
import { computed } from 'vue';
import { Compass, Lock, Map as MapIcon, Sparkles } from 'lucide-vue-next';
import { useAutoHeight } from '~/composables/useAutoHeight';
import {
    LLM_HINT_UNLOCK_AT,
    type CompassHint,
    type CompassStatus,
    type MapMode,
} from '~/composables/useSemanticGame';

const props = defineProps<{
    hints: CompassHint[];
    /** Status of the latest guess's compass; null before any guess */
    compassStatus: CompassStatus | null;
    mapMode: MapMode;
    sliceAxes: [string, string] | null;
    gameOver: boolean;
    /** LLM hint state */
    llmHint: string | null;
    llmHintLoading: boolean;
    llmHintUsed: boolean;
    llmHintUnlocked: boolean;
    guessesUsed: number;
    /** Number of guesses made since the last new-best rank. Used to nudge
     *  the player toward the oracle after prolonged stagnation. */
    guessesSinceBest: number;
    /** The most recent guess word — used in the compass header subtitle so
     *  the player knows the hints are relative to their LATEST guess (not
     *  their best). */
    latestGuessWord: string | null;
}>();

const emit = defineEmits<{
    toggleSlice: [];
    requestLlmHint: [];
}>();

const sliceActive = computed(() => props.mapMode === 'slice');

/**
 * Return the anchor word the target is "more like" — the one on the side
 * the hint's `direction` points to. Prepended with the magnitude tier as
 * a qualifier word ("slightly" / "" / "much").
 */
function anchorOf(h: CompassHint): string {
    return h.direction === 'positive' ? h.highAnchor : h.lowAnchor;
}

function qualifierOf(tier: CompassHint['magnitudeTier']): string {
    if (tier === 'slight') return 'slightly ';
    if (tier === 'strong') return 'much ';
    return '';
}

/** Show the compass-close fallback when the last guess was too similar to the
 *  target for any axis to produce a meaningful signal. Players hit this state
 *  when they're already very close to the answer. */
const showCloseFallback = computed(() => props.compassStatus === 'close' && props.guessesUsed > 0);

/** Nudge the player toward the oracle after 5 guesses without improving
 *  their best rank. Only shown when the oracle is unlocked, unused, and
 *  the game is still in progress. */
const showOracleNudge = computed(
    () =>
        !props.llmHintUsed &&
        props.llmHintUnlocked &&
        !props.gameOver &&
        props.guessesSinceBest >= 5
);

const { elRef: compassRef } = useAutoHeight();
const { elRef: llmRef } = useAutoHeight();
</script>

<template>
    <div class="compass-container">
        <!-- Compass hints panel -->
        <section ref="compassRef" class="panel">
            <header class="panel-header">
                <Compass :size="14" class="panel-icon" />
                <span class="mono-label">
                    Compass<span v-if="latestGuessWord" class="from-word">
                        · from <em>{{ latestGuessWord }}</em></span
                    >
                </span>
                <button
                    v-if="(sliceActive || hints.length >= 2) && !gameOver"
                    type="button"
                    class="slice-toggle"
                    :class="{ active: sliceActive }"
                    :title="sliceActive ? 'Return to meaning map' : 'See this slice'"
                    @click="emit('toggleSlice')"
                >
                    <MapIcon :size="12" />
                    <span>{{ sliceActive ? 'Map' : 'Slice' }}</span>
                </button>
            </header>

            <div v-if="guessesUsed === 0" class="empty">
                Your compass will appear after your first guess.
            </div>

            <div v-else-if="showCloseFallback" class="close-fallback">
                <p class="close-copy">
                    <em>No clear bearing</em>
                </p>
                <p class="close-sub">
                    The compass can't place this one on a known axis — try a word from a different
                    corner of meaning.
                </p>
            </div>

            <ul v-else class="hint-list">
                <li v-for="c in hints" :key="c.axis" class="hint-row">
                    <div class="hint-line">
                        <span class="hint-text">
                            Think {{ qualifierOf(c.magnitudeTier) }}more
                            <em>{{ anchorOf(c) }}</em>
                        </span>
                        <span class="hint-axis">{{ c.axis }}</span>
                    </div>
                </li>
            </ul>
        </section>

        <!-- LLM hint panel -->
        <section ref="llmRef" class="panel llm-panel" :class="{ nudging: showOracleNudge }">
            <header class="panel-header">
                <Sparkles :size="14" class="panel-icon" />
                <span class="mono-label">Hint</span>
                <span v-if="llmHintUsed" class="used-chip">Used</span>
                <span v-else-if="!llmHintUnlocked" class="locked-chip">
                    <Lock :size="10" />
                    Guess {{ Math.max(0, LLM_HINT_UNLOCK_AT - guessesUsed) }} more
                </span>
                <span v-else class="ready-chip">Ready</span>
            </header>
            <p v-if="showOracleNudge && !llmHint" class="oracle-nudge">
                <em>Stuck?</em> The oracle might nudge you in the right direction.
            </p>
            <div v-if="llmHint" class="llm-hint-text">
                <em>{{ llmHint }}</em>
            </div>
            <button
                v-else
                type="button"
                class="hint-request"
                :class="{ pulsing: showOracleNudge }"
                :disabled="!llmHintUnlocked || llmHintLoading || llmHintUsed || gameOver"
                @click="emit('requestLlmHint')"
            >
                <span v-if="llmHintLoading">Divining…</span>
                <span v-else-if="!llmHintUnlocked">Locked — keep guessing</span>
                <span v-else>Ask the oracle</span>
            </button>
            <p v-if="!llmHint && !showOracleNudge" class="hint-note">
                One hint per game. Use it wisely.
            </p>
        </section>
    </div>
</template>

<style scoped>
.compass-container {
    display: flex;
    flex-direction: column;
    gap: 12px;
}
.panel {
    border: 1px solid var(--color-rule);
    background: var(--color-paper);
    padding: 12px 14px;
}
.panel-header {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 10px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--color-rule);
}
.panel-icon {
    color: var(--color-muted);
}
.mono-label {
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--color-muted);
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
/* "· from <word>" suffix in the compass header — flagged in lowercase
   serif italic so it visually echoes the latest guess label on the map. */
.from-word {
    text-transform: none;
    letter-spacing: 0;
    font-family: var(--font-display);
    font-size: 11px;
    color: var(--color-ink);
}
.from-word em {
    font-style: italic;
    font-weight: 600;
}
.empty {
    font-family: var(--font-display);
    font-style: italic;
    color: var(--color-muted);
    font-size: 13px;
    padding: 4px 0;
}
.hint-list {
    display: flex;
    flex-direction: column;
    gap: 14px;
    list-style: none;
    margin: 0;
    padding: 0;
}
.hint-row {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 14px;
    color: var(--color-ink);
    line-height: 1.35;
}
.hint-line {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 10px;
}
.hint-text {
    flex: 1;
    min-width: 0;
}
.hint-text em {
    font-family: var(--font-display);
    font-style: italic;
    font-weight: 500;
    color: var(--color-ink);
}
.hint-axis {
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--color-muted);
    flex-shrink: 0;
}
.close-fallback {
    padding: 4px 0 2px;
}
.close-copy {
    font-family: var(--font-display);
    font-size: 15px;
    color: var(--color-ink);
    margin: 0 0 4px;
    line-height: 1.3;
}
.close-copy em {
    font-style: italic;
    color: var(--color-accent);
}
.close-sub {
    margin: 0;
    font-family: var(--font-body);
    font-size: 12px;
    color: var(--color-muted);
    line-height: 1.4;
}
.slice-toggle {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 8px;
    background: transparent;
    color: var(--color-muted);
    border: 1px solid var(--color-rule);
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    cursor: pointer;
    border-radius: 0;
    transition: all 150ms ease;
}
.slice-toggle:hover:not(:disabled) {
    color: var(--color-ink);
    border-color: var(--color-ink);
}
.slice-toggle.active {
    background: var(--color-ink);
    color: var(--color-paper);
    border-color: var(--color-ink);
}

/* LLM hint */
.llm-panel {
    background: var(--color-paper);
    transition: border-color 300ms ease;
}
.llm-panel.nudging {
    border-color: var(--color-accent);
}
.oracle-nudge {
    margin: 6px 0 10px;
    font-family: var(--font-display);
    font-size: 13px;
    line-height: 1.4;
    color: var(--color-muted);
    text-align: center;
}
.oracle-nudge em {
    font-style: italic;
    color: var(--color-accent);
    font-weight: 500;
}
.hint-request.pulsing:not(:disabled) {
    animation: oracle-pulse 2s ease-in-out infinite;
}
@keyframes oracle-pulse {
    0%,
    100% {
        box-shadow: 0 0 0 0 rgba(192, 57, 43, 0);
    }
    50% {
        box-shadow: 0 0 0 4px rgba(192, 57, 43, 0.25);
    }
}
.used-chip,
.locked-chip,
.ready-chip {
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 2px 6px;
    display: inline-flex;
    align-items: center;
    gap: 3px;
}
.locked-chip {
    color: var(--color-muted);
    border: 1px solid var(--color-rule);
}
.used-chip {
    color: var(--color-muted);
    text-decoration: line-through;
}
.ready-chip {
    color: var(--color-accent);
    border: 1px solid var(--color-accent);
}
.hint-request {
    width: 100%;
    padding: 10px 14px;
    background: var(--color-ink);
    color: var(--color-paper);
    border: 2px solid var(--color-ink);
    font-family: var(--font-body);
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.03em;
    cursor: pointer;
    text-transform: uppercase;
}
.hint-request:hover:not(:disabled) {
    opacity: 0.85;
}
.hint-request:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}
.llm-hint-text {
    padding: 12px 14px;
    background: var(--color-paper);
    border-left: 3px solid var(--color-accent);
    font-family: var(--font-display);
    font-size: 16px;
    line-height: 1.4;
    color: var(--color-ink);
}
.hint-note {
    margin: 6px 0 0;
    font-family: var(--font-mono);
    font-size: 9px;
    color: var(--color-muted);
    letter-spacing: 0.05em;
    text-align: center;
}

@media (max-width: 520px) {
    .compass-container {
        gap: 6px;
    }
    .hint-row {
        padding: 6px 8px;
        font-size: 12px;
    }
    .llm-hint-text {
        padding: 8px 10px;
        font-size: 14px;
    }
    .hint-request {
        padding: 8px 14px;
        font-size: 12px;
    }
}
</style>
