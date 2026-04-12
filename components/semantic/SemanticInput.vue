<!--
    SemanticInput — text input + Guess button for submitting semantic guesses.

    Handles loading state (server call in flight), invalid word banner,
    game-over disable, and Enter-to-submit.
-->

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { interpolate } from '~/utils/interpolate';

const langStore = useLanguageStore();
const ui = computed(() => langStore.config?.ui);

const props = defineProps<{
    loading: boolean;
    disabled: boolean;
    invalidMessage: string;
    guessesUsed: number;
    guessesMax: number;
}>();

const emit = defineEmits<{ submit: [word: string] }>();

const value = ref('');
const inputRef = ref<HTMLInputElement | null>(null);

// Skip auto-focus on touch devices — focusing a text input triggers the
// mobile virtual keyboard, which covers half the screen before the player
// has even seen the map. Computed once at setup, not per watch call.
const isTouch =
    typeof window !== 'undefined' &&
    window.matchMedia('(hover: none) and (pointer: coarse)').matches;

function onSubmit(e?: Event) {
    e?.preventDefault();
    const w = value.value.trim();
    if (!w || props.loading || props.disabled) return;
    emit('submit', w);
    value.value = '';
}

// Focus whenever the input becomes interactive. `immediate: true` covers
// the mount case, so we don't need a separate onMounted hook.
watch(
    [() => props.loading, () => props.disabled],
    ([isLoading, isDisabled]) => {
        if (!isLoading && !isDisabled && !isTouch) {
            nextTick(() => inputRef.value?.focus());
        }
    },
    { immediate: true }
);

// On mobile, the virtual keyboard triggers a scroll-into-view that snaps
// the page past the game to the SEO section. The input is position:fixed
// on mobile so the browser doesn't need to scroll at all. Intercept the
// tap and focus with preventScroll to avoid the jank entirely.
function onInputTouch(e: TouchEvent) {
    if (!isTouch) return;
    if (document.activeElement === inputRef.value) return; // already focused — let browser handle cursor
    e.preventDefault();
    inputRef.value?.focus({ preventScroll: true });
}

defineExpose({
    focus: () => inputRef.value?.focus(),
});
</script>

<template>
    <form class="semantic-input-form" @submit="onSubmit">
        <div class="input-row">
            <input
                ref="inputRef"
                v-model="value"
                type="text"
                class="semantic-text-input"
                :placeholder="disabled ? ui?.semantic_game_over : ui?.semantic_input_placeholder"
                :disabled="disabled"
                :aria-invalid="!!invalidMessage"
                autocomplete="off"
                autocapitalize="none"
                autocorrect="off"
                spellcheck="false"
                inputmode="text"
                @touchstart="onInputTouch"
            />
            <button type="submit" class="guess-button" :disabled="!value || loading || disabled">
                <span v-if="loading">…</span>
                <span v-else>{{ ui?.semantic_guess_button }}</span>
            </button>
        </div>
        <div class="input-meta">
            <span v-if="invalidMessage" class="invalid">⚠ {{ invalidMessage }}</span>
            <span v-else class="remaining">
                {{
                    interpolate(ui?.semantic_guesses_used, {
                        used: guessesUsed,
                        max: guessesMax,
                    })
                }}
            </span>
        </div>
    </form>
</template>

<style scoped>
.semantic-input-form {
    display: flex;
    flex-direction: column;
    gap: 6px;
}
.input-row {
    display: flex;
    gap: 8px;
}
.semantic-text-input {
    flex: 1;
    padding: 12px 16px;
    font-family: var(--font-body);
    font-size: 16px;
    background: var(--color-paper);
    color: var(--color-ink);
    border: 2px solid var(--color-ink);
    border-radius: 0;
    outline: none;
    min-width: 0;
}
.semantic-text-input:focus {
    border-color: var(--color-accent);
}
.semantic-text-input:disabled {
    opacity: 0.5;
    background: var(--color-rule);
    cursor: not-allowed;
}
.semantic-text-input[aria-invalid='true'] {
    border-color: var(--color-accent);
}
.guess-button {
    padding: 10px 20px;
    font-family: var(--font-body);
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 0.03em;
    color: var(--color-paper);
    background: var(--color-ink);
    border: 2px solid var(--color-ink);
    border-radius: 0;
    cursor: pointer;
    min-width: 84px;
    text-transform: uppercase;
}
.guess-button:hover:not(:disabled) {
    opacity: 0.85;
}
.guess-button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}
.input-meta {
    min-height: 16px;
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--color-muted);
}
.invalid {
    color: var(--color-accent);
    font-weight: 600;
}
.remaining {
    letter-spacing: 0.05em;
}

@media (max-width: 520px) {
    .semantic-text-input {
        padding: 10px 12px;
        font-size: 16px; /* keep 16px to prevent iOS zoom */
    }
    .guess-button {
        padding: 8px 14px;
        min-width: 68px;
        font-size: 13px;
    }
    .input-meta {
        font-size: 10px;
    }
}
</style>
