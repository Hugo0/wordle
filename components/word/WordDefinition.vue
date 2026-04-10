<!--
    WordDefinition — editorial definition block. Used by both StatsModal
    and the word page so both surfaces render identically.
-->

<script setup lang="ts">
import { computed } from 'vue';
import { translatePos } from '~/utils/i18n';

const props = withDefaults(
    defineProps<{
        word: string;
        definition: string;
        partOfSpeech?: string | null;
        ui?: Record<string, string>;
        compact?: boolean;
    }>(),
    {
        partOfSpeech: null,
        ui: () => ({}),
        compact: false,
    }
);

const localizedPos = computed(() =>
    props.partOfSpeech ? translatePos(props.partOfSpeech, props.ui) : ''
);
</script>

<template>
    <div class="word-definition" :class="{ compact }">
        <div v-if="localizedPos" class="pos">{{ localizedPos }}</div>
        <p class="body">
            <strong class="headword">{{ word }}</strong>
            <span v-if="definition" class="em-dash">&mdash;</span>
            <span v-if="definition" class="text">{{ definition }}</span>
        </p>
    </div>
</template>

<style scoped>
.word-definition {
    font-family: var(--font-body);
    color: var(--color-ink);
    line-height: 1.5;
}
.pos {
    font-family: var(--font-display);
    font-style: italic;
    font-size: 15px;
    color: var(--color-muted);
    margin-bottom: 8px;
}
.word-definition.compact .pos {
    font-size: 13px;
    margin-bottom: 4px;
}
.body {
    margin: 0;
    font-size: 15px;
}
.word-definition.compact .body {
    font-size: 13px;
}
.headword {
    text-transform: uppercase;
    letter-spacing: 0.03em;
    font-weight: 700;
}
.em-dash {
    margin: 0 6px;
    color: var(--color-muted);
}
.text {
    color: var(--color-ink);
}
</style>
