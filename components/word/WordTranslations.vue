<!--
    WordTranslations — cross-language word links.
    Shows translations of the current word in other languages.
    Words with pages in our game link to their word detail pages.
    Words without pages show as plain text (still useful context).
-->

<script setup lang="ts">
import { computed } from 'vue';
import { wordDetailPath } from '~/utils/wordUrls';

export interface TranslationEntry {
    code: string;
    word: string;
    hasPage: boolean;
    name: string;
}

const props = withDefaults(
    defineProps<{
        translations: TranslationEntry[];
        collapsed?: boolean;
    }>(),
    { collapsed: false }
);

const expanded = ref(!props.collapsed);

const sorted = computed(() =>
    [...props.translations]
        .map((t) => ({
            ...t,
            href: t.hasPage ? wordDetailPath(t.code, t.word) : null,
        }))
        .sort((a, b) => a.name.localeCompare(b.name))
);
</script>

<template>
    <section v-if="sorted.length" class="translations">
            <button class="translations-header" @click="expanded = !expanded">
                <span class="translations-label">This word in other languages</span>
                <span class="translations-count">{{ sorted.length }}</span>
                <span class="translations-toggle" :class="{ open: expanded }">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                </span>
            </button>
            <div v-show="expanded" class="translations-grid">
                <component
                    :is="t.href ? 'NuxtLink' : 'span'"
                    v-for="t in sorted"
                    :key="t.code"
                    :to="t.href || undefined"
                    class="translation-item"
                    :class="{ linked: !!t.href }"
                >
                    <span class="translation-word">{{ t.word }}</span>
                    <span class="translation-lang">{{ t.name }}</span>
                </component>
            </div>
    </section>
</template>

<style scoped>
.translations {
    border: 1px solid var(--color-rule);
}
.translations-header {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 14px 20px;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-muted);
    transition: color 150ms ease;
}
.translations-header:hover {
    color: var(--color-ink);
}
.translations-count {
    font-family: var(--font-mono);
    font-size: 9px;
    color: var(--color-muted);
    opacity: 0.6;
}
.translations-toggle {
    margin-left: auto;
    transition: transform 200ms ease;
}
.translations-toggle.open {
    transform: rotate(180deg);
}
.translations-grid {
    padding: 0 20px 16px;
}
.translations-label {
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--color-muted);
    margin-bottom: 12px;
}
.translations-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}
.translation-item {
    display: flex;
    align-items: baseline;
    gap: 6px;
    padding: 4px 10px;
    border: 1px solid var(--color-rule);
    text-decoration: none;
}
.translation-item.linked {
    cursor: pointer;
    transition: border-color 120ms ease;
}
.translation-item.linked:hover {
    border-color: var(--color-ink);
}
.translation-word {
    font-family: var(--font-display);
    font-size: 14px;
    font-weight: 600;
    color: var(--color-ink);
}
.translation-item:not(.linked) .translation-word {
    opacity: 0.6;
}
.translation-lang {
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 0.05em;
    color: var(--color-muted);
    text-transform: uppercase;
}
</style>
