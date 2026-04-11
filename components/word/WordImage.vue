<!--
    WordImage — AI-generated word art, with a typographic Fraunces fallback
    when the image endpoint 404s or hasn't been generated yet.
-->

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { wordImagePath } from '~/utils/wordUrls';

const props = withDefaults(
    defineProps<{
        word: string;
        lang: string;
        dayIdx?: number | null;
        size?: number;
    }>(),
    {
        dayIdx: null,
        size: 320,
    }
);

const loaded = ref(false);
const errored = ref(false);

const src = computed(() => wordImagePath(props.lang, props.word, props.dayIdx));

watch(
    () => props.word,
    () => {
        loaded.value = false;
        errored.value = false;
    }
);
</script>

<template>
    <figure class="word-image" :style="{ width: size + 'px', height: size + 'px' }">
        <img
            v-if="!errored"
            :src="src"
            :alt="word"
            class="img"
            :class="{ loaded }"
            loading="lazy"
            @load="loaded = true"
            @error="errored = true"
        />
        <div v-else class="fallback">
            <span class="fallback-word">{{ word }}</span>
        </div>
    </figure>
</template>

<style scoped>
.word-image {
    position: relative;
    margin: 0;
    border: 1px solid var(--color-rule);
    background: var(--color-paper-warm);
    overflow: hidden;
}
.img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0;
    transition: opacity 400ms ease;
}
.img.loaded {
    opacity: 1;
}
.fallback {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 12px;
    background: var(--color-paper-warm);
}
.fallback-word {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: clamp(28px, 15%, 56px);
    color: var(--color-ink);
    text-transform: lowercase;
    letter-spacing: -0.01em;
    text-align: center;
    word-break: break-word;
}
</style>
