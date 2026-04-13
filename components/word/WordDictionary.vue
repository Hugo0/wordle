<!--
    WordDictionary — full dictionary entry from Wiktionary/kaikki data.

    Renders structured dictionary content: multiple senses with numbered
    glosses, part of speech headers, etymology, IPA pronunciation, and
    usage examples. Gracefully degrades when fields are missing — shows
    whatever's available without skeleton blocks or "no data" messages.

    Data quality varies by language:
      - Rich (en, de, fr, es): multiple senses, etymology, IPA, examples
      - Medium (it, pt, nl, sv): senses + some etymology
      - Sparse (small languages): single gloss only, or nothing

    For sparse data, the parent page's inline WordDefinition component
    already covers the basics — this section only renders when there's
    richer data worth showing (multiple senses, etymology, or examples).
-->

<script setup lang="ts">
import { computed } from 'vue';

export interface DictionaryGloss {
    gloss: string;
    examples?: Array<{ text: string; translation?: string }>;
    tags?: string[];
    synonyms?: string[];
}

export interface DictionaryEntry {
    pos: string;
    glosses: DictionaryGloss[];
}

export interface DictionaryData {
    word: string;
    entries: DictionaryEntry[];
    etymology?: string;
    pronunciation?: string;
    forms?: Array<{ form: string; tags: string[] }>;
}

const props = defineProps<{
    data: DictionaryData;
    wiktionaryUrl?: string | null;
    /** Collapse by default (for daily word pages where user came for the game) */
    collapsed?: boolean;
}>();

const expanded = ref(!props.collapsed);

/** Merge duplicate POS entries (kaikki sometimes has multiple "noun" sections
 *  for different etymology numbers) and drop entries with no senses. */
const mergedEntries = computed(() => {
    const byPos = new Map<string, DictionaryEntry>();
    for (const entry of props.data.entries) {
        if (!entry.glosses.length) continue;
        const existing = byPos.get(entry.pos);
        if (existing) {
            existing.glosses.push(...entry.glosses);
        } else {
            byPos.set(entry.pos, { pos: entry.pos, glosses: [...entry.glosses] });
        }
    }
    return Array.from(byPos.values());
});

const hasSubstantiveContent = computed(() => {
    const d = props.data;
    if (d.etymology) return true;
    if (d.pronunciation) return true;
    if (mergedEntries.value.length > 1) return true;
    if (mergedEntries.value.some((e) => e.glosses.length > 1)) return true;
    if (mergedEntries.value.some((e) => e.glosses.some((s) => s.examples?.length))) return true;
    return false;
});

function formatTags(tags: string[]): string {
    return tags.join(', ');
}
</script>

<template>
    <section v-if="hasSubstantiveContent" class="dictionary">
        <button class="dictionary-header" @click="expanded = !expanded">
            <span class="dictionary-label">Dictionary</span>
            <span class="dictionary-toggle" :class="{ open: expanded }">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path
                        d="M3 4.5L6 7.5L9 4.5"
                        stroke="currentColor"
                        stroke-width="1.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    />
                </svg>
            </span>
        </button>

        <div v-show="expanded" class="dictionary-body">
            <!-- Pronunciation (IPA) -->
            <div v-if="data.pronunciation" class="pronunciation">
                <span class="ipa">{{ data.pronunciation }}</span>
            </div>

            <!-- Etymology -->
            <div v-if="data.etymology" class="etymology">
                <span class="etymology-label">Origin</span>
                <p class="etymology-text">{{ data.etymology }}</p>
            </div>

            <!-- Entries grouped by part of speech -->
            <div v-for="(entry, ei) in mergedEntries" :key="ei" class="pos-group">
                <div class="pos-header">{{ entry.pos }}</div>

                <ol class="senses">
                    <li v-for="(sense, si) in entry.glosses" :key="si" class="sense">
                        <span v-if="sense.tags?.length" class="sense-tags">
                            {{ formatTags(sense.tags) }}
                        </span>
                        <span class="sense-gloss">{{ sense.gloss }}</span>

                        <div v-if="sense.examples?.length" class="examples">
                            <div
                                v-for="(ex, exi) in sense.examples"
                                :key="exi"
                                class="example"
                            >
                                <span class="example-text">&ldquo;{{ ex.text }}&rdquo;</span>
                                <span v-if="ex.translation" class="example-translation">
                                    — {{ ex.translation }}
                                </span>
                            </div>
                        </div>
                    </li>
                </ol>
            </div>

            <!-- Forms (inflections) -->
            <div v-if="data.forms?.length" class="forms">
                <span class="forms-label">Forms</span>
                <span class="forms-list">
                    <span v-for="(f, fi) in data.forms" :key="fi" class="form-item">
                        <em>{{ f.form }}</em>
                        <span v-if="f.tags.length" class="form-tags">({{ f.tags.join(', ') }})</span>
                        <span v-if="fi < data.forms!.length - 1" class="form-sep"> · </span>
                    </span>
                </span>
            </div>

            <!-- Attribution -->
            <div class="attribution">
                <a
                    v-if="wiktionaryUrl"
                    :href="wiktionaryUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="attribution-link"
                >
                    Wiktionary — CC BY-SA 4.0
                </a>
                <span v-else class="attribution-link">
                    Source: Wiktionary — CC BY-SA 4.0
                </span>
            </div>
        </div>
    </section>
</template>

<style scoped>
.dictionary {
    border: 1px solid var(--color-rule);
}

.dictionary-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 14px 20px;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-muted);
    transition: color 150ms ease;
}
.dictionary-header:hover {
    color: var(--color-ink);
}
.dictionary-label {
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 0.15em;
    text-transform: uppercase;
}
.dictionary-toggle {
    transition: transform 200ms ease;
}
.dictionary-toggle.open {
    transform: rotate(180deg);
}

.dictionary-body {
    padding: 0 20px 20px;
    display: flex;
    flex-direction: column;
    gap: 20px;
}

/* ── Pronunciation ── */
.pronunciation {
    font-family: var(--font-body);
    font-size: 15px;
    color: var(--color-muted);
}
.ipa {
    font-style: italic;
}

/* ── Etymology ── */
.etymology {
    padding-bottom: 16px;
    border-bottom: 1px solid var(--color-rule);
}
.etymology-label {
    display: block;
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--color-muted);
    margin-bottom: 6px;
}
.etymology-text {
    margin: 0;
    font-family: var(--font-body);
    font-size: 14px;
    line-height: 1.6;
    color: var(--color-ink);
    opacity: 0.85;
}

/* ── Part of speech groups ── */
.pos-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
}
.pos-header {
    font-family: var(--font-display);
    font-style: italic;
    font-size: 14px;
    color: var(--color-muted);
    font-variation-settings: 'opsz' 20;
}

/* ── Numbered senses ── */
.senses {
    margin: 0;
    padding-left: 20px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    counter-reset: sense;
    list-style: none;
}
.sense {
    counter-increment: sense;
    position: relative;
    font-family: var(--font-body);
    font-size: 14px;
    line-height: 1.55;
    color: var(--color-ink);
}
.sense::before {
    content: counter(sense) '.';
    position: absolute;
    left: -20px;
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--color-muted);
    top: 2px;
}
.sense-tags {
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 0.05em;
    color: var(--color-muted);
    font-style: italic;
    margin-right: 4px;
}
.sense-gloss {
    color: var(--color-ink);
}

/* ── Examples ── */
.examples {
    margin-top: 6px;
    display: flex;
    flex-direction: column;
    gap: 4px;
}
.example {
    font-size: 13px;
    line-height: 1.5;
    padding-left: 12px;
    border-left: 2px solid var(--color-rule);
    color: var(--color-ink);
    opacity: 0.75;
}
.example-text {
    font-style: italic;
}
.example-translation {
    color: var(--color-muted);
    font-style: normal;
}

/* ── Forms ── */
.forms {
    padding-top: 12px;
    border-top: 1px solid var(--color-rule);
    font-family: var(--font-body);
    font-size: 13px;
    line-height: 1.6;
    color: var(--color-ink);
}
.forms-label {
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--color-muted);
    margin-right: 10px;
}
.form-tags {
    color: var(--color-muted);
    font-size: 11px;
}
.form-sep {
    color: var(--color-rule);
}

/* ── Attribution ── */
.attribution {
    padding-top: 12px;
    border-top: 1px solid var(--color-rule);
}
.attribution-link {
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--color-muted);
    text-decoration: none;
    transition: color 120ms ease;
}
a.attribution-link:hover {
    color: var(--color-accent);
}
</style>
