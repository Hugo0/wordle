<!--
    AddCompareWord — small inline form for adding a word to the compare set.

    Shows an input + "add" button. On submit, emits the normalized word.
    The parent wires it to useCompareWords().addWord(), which updates the
    URL query param.
-->

<script setup lang="ts">
import { ref } from 'vue';

const props = withDefaults(
    defineProps<{
        disabled?: boolean;
        placeholder?: string;
    }>(),
    {
        disabled: false,
        placeholder: 'Add a word to compare…',
    }
);

const emit = defineEmits<{
    add: [word: string];
}>();

const input = ref('');
const inputEl = ref<HTMLInputElement | null>(null);

function onSubmit() {
    const w = input.value.trim().toLowerCase();
    if (!w || props.disabled) return;
    emit('add', w);
    input.value = '';
    inputEl.value?.focus();
}
</script>

<template>
    <form class="add-compare" @submit.prevent="onSubmit">
        <input
            ref="inputEl"
            v-model="input"
            type="text"
            :placeholder="placeholder"
            :disabled="disabled"
            autocomplete="off"
            spellcheck="false"
            class="input"
        />
        <button
            type="submit"
            class="btn"
            :disabled="disabled || !input.trim()"
            :aria-label="placeholder"
        >
            add
        </button>
    </form>
</template>

<style scoped>
.add-compare {
    display: flex;
    gap: 8px;
    align-items: stretch;
    max-width: 420px;
    margin: 0 auto;
}
.input {
    flex: 1;
    min-width: 0;
    padding: 10px 14px;
    background: var(--color-paper);
    border: 1px solid var(--color-rule);
    color: var(--color-ink);
    font-family: var(--font-display);
    font-size: 15px;
    font-style: italic;
    outline: none;
    transition: border-color 120ms ease;
}
.input:focus {
    border-color: var(--color-ink);
}
.input::placeholder {
    color: var(--color-muted);
    opacity: 0.7;
}
.input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}
.btn {
    padding: 10px 18px;
    background: var(--color-ink);
    color: var(--color-paper);
    border: 1px solid var(--color-ink);
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    cursor: pointer;
    transition: opacity 120ms ease;
}
.btn:hover:not(:disabled) {
    opacity: 0.85;
}
.btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
}
</style>
