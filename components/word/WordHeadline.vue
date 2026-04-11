<!--
    WordHeadline — editorial hero: eyebrow, huge Fraunces word, italic subtitle.
    The word renders in lowercase by design — the page is formally quoting
    it, not shouting. Three size presets for single-word vs compare-column use.
-->

<script setup lang="ts">
withDefaults(
    defineProps<{
        word: string;
        eyebrow?: string;
        subtitle?: string;
        size?: 'lg' | 'md' | 'sm';
    }>(),
    {
        eyebrow: '',
        subtitle: '',
        size: 'lg',
    }
);
</script>

<template>
    <header class="word-headline" :class="size">
        <div v-if="eyebrow" class="eyebrow">{{ eyebrow }}</div>
        <h1 class="word">{{ word }}</h1>
        <div v-if="subtitle" class="subtitle">{{ subtitle }}</div>
    </header>
</template>

<style scoped>
.word-headline {
    text-align: center;
    padding: 8px 0;
}
.eyebrow {
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 0.25em;
    text-transform: uppercase;
    color: var(--color-muted);
    margin-bottom: 10px;
}
.word {
    font-family: var(--font-display);
    font-weight: 700;
    color: var(--color-ink);
    margin: 0;
    line-height: 1;
    letter-spacing: -0.02em;
    text-transform: lowercase;
}
.subtitle {
    font-family: var(--font-display);
    font-style: italic;
    color: var(--color-muted);
    margin-top: 10px;
    line-height: 1.3;
}
/* Size variants */
.lg .word {
    font-size: clamp(48px, 10vw, 84px);
}
.lg .subtitle {
    font-size: 16px;
}
.md .word {
    font-size: clamp(32px, 6vw, 48px);
}
.md .subtitle {
    font-size: 13px;
}
.sm .word {
    font-size: 28px;
}
.sm .subtitle {
    font-size: 12px;
}
.sm .eyebrow {
    font-size: 9px;
    margin-bottom: 6px;
}
</style>
