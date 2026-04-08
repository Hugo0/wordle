<!--
  SEO content section for all game pages.

  Rendered below the game viewport in the DOM. The game layout uses
  scroll-snap + a JS rubber-band guard so users almost never reach this.
  Google's renderer sees all content in the full rendered DOM.

  All text reads from config.seo.* (translated per language) with English
  fallbacks from default_language_config.json. Icons use Lucide.
-->
<script setup lang="ts">
import {
    Globe,
    Lightbulb,
    BookOpen,
    ImageIcon,
    Palette,
    Smartphone,
    Languages,
    AlertTriangle,
} from 'lucide-vue-next';
import BaseModal from '~/components/shared/BaseModal.vue';
import { GAME_MODE_CONFIG } from '~/utils/game-modes';
import {
    GAME_MODES_UI,
    getModeRoute,
    getModeLabel,
    getModeDescription,
} from '~/composables/useGameModes';
import { useFlag } from '~/composables/useFlag';
import type { Component } from 'vue';
import type { GameMode } from '~/utils/game-modes';
import type { GameSeoResult } from '~/composables/useGameSeo';
import { interpolate } from '~/utils/interpolate';
import type { LanguageConfig, LanguageSeo } from '~/utils/types';

const props = defineProps<{
    lang: string;
    mode: GameMode;
    seo: GameSeoResult;
    config: LanguageConfig;
}>();

const s = computed<Partial<LanguageSeo>>(() => props.config.seo || {});
const isClassic = props.mode === 'classic';
const modeDef = GAME_MODE_CONFIG[props.mode];
const isMultiBoard = modeDef.boardCount > 1;

// ── Today's Word reveal (classic mode only) ──
const wordRevealed = ref(false);
const showRevealConfirm = ref(false);
const langStore = isClassic ? useLanguageStore() : null;
const game = isClassic ? useGameStore() : null;
const todaysWord = computed(() => langStore?.todaysWord?.toUpperCase() || '');
const todaysIdx = computed(() => langStore?.todaysIdx ?? 0);
const gameAlreadyOver = computed(() => game?.gameOver ?? false);

// Auto-reveal when the player finishes the game (win or loss). Covers both
// live transitions and returning to a completed daily.
if (game) {
    watch(
        () => game.gameOver,
        (isOver) => {
            if (isOver) wordRevealed.value = true;
        },
        { immediate: true }
    );
}

function onRevealClick() {
    if (wordRevealed.value) return;
    if (gameAlreadyOver.value) {
        wordRevealed.value = true;
        return;
    }
    showRevealConfirm.value = true;
}

function confirmReveal() {
    showRevealConfirm.value = false;
    if (game && !game.gameOver) {
        game.handleGameLost();
    }
    wordRevealed.value = true;
}

// ── Translated section headings with English fallbacks ──
const h = computed(() => ({
    howToPlay: s.value.how_to_play || 'How to Play',
    tipsStrategy: s.value.tips_strategy || 'Tips & Strategy',
    moreModes: s.value.more_modes || 'More Game Modes',
    playInLanguages: s.value.play_in_languages || 'Play in 80+ Languages',
    playInLanguagesSub:
        s.value.play_in_languages_sub || 'Every language is free. No account needed.',
    whyWordleGlobal: s.value.why_wordle_global || 'Why Wordle Global',
    faqTitle: s.value.faq_title || 'Frequently Asked Questions',
    browseAll: s.value.browse_all_languages || 'Browse all 80+ languages',
    recentWords: s.value.recent_words || 'Recent Words',
    viewAllWords: s.value.view_all_words || 'View all words',
    footer: s.value.footer || 'wordle.global — the free daily word game in 80+ languages',
}));

// ── Tile example descriptions (translated) ──
const tileDescs = computed(() => ({
    correct: s.value.tile_correct || 'is in the word and in the correct spot.',
    semicorrect: s.value.tile_semicorrect || 'is in the word but in the wrong spot.',
    incorrect: s.value.tile_incorrect || 'is not in the word at all.',
}));

const EXAMPLES = computed(() => [
    { word: 'CRANE', idx: 0, type: 'correct' as const, letter: 'C', desc: tileDescs.value.correct },
    {
        word: 'PILOT',
        idx: 1,
        type: 'semicorrect' as const,
        letter: 'I',
        desc: tileDescs.value.semicorrect,
    },
    {
        word: 'MONEY',
        idx: 2,
        type: 'incorrect' as const,
        letter: 'N',
        desc: tileDescs.value.incorrect,
    },
]);

// ── Social proof stats (translated labels) ──
const SOCIAL_STATS = computed(() => [
    { value: '800K+', label: s.value.stat_players || 'Players' },
    { value: '1.7M+', label: s.value.stat_guesses || 'Guesses' },
    { value: '80+', label: s.value.stat_languages || 'Languages' },
    { value: '8', label: s.value.stat_modes || 'Game Modes' },
]);

// ── Strategy tips (mode-aware, translated) ──
const strategyTips = computed(() => {
    // Check for mode-specific translated tips first
    const modeTips = s.value.mode_tips?.[props.mode];
    if (modeTips?.length) return modeTips;

    if (isMultiBoard) return s.value.tips_multiboard || [];
    if (props.mode === 'speed') return s.value.tips_speed || [];
    return s.value.tips || [];
});

// ── Value propositions (translated, with icon mapping) ──
const VALUE_ICON_MAP: Record<string, Component> = {
    languages: Languages,
    definitions: BookOpen,
    word_art: ImageIcon,
    themes: Palette,
    pwa: Smartphone,
    free: Globe,
};

const valueProps = computed(() => {
    const items = s.value.value_props || [];
    return items.map((p) => ({
        icon: VALUE_ICON_MAP[p.key] || Globe,
        title: p.title,
        desc: p.desc,
    }));
});

// ── Mode description paragraph (translated, with placeholder interpolation) ──
const modeDesc = computed(() => {
    let raw: string;
    if (isMultiBoard) {
        raw = s.value.mode_desc_multiboard || '';
    } else if (props.mode === 'speed') {
        raw = s.value.mode_desc_speed || '';
    } else if (props.mode === 'unlimited') {
        raw = s.value.mode_desc_unlimited || s.value.mode_desc_classic || '';
    } else {
        raw = s.value.mode_desc_classic || '';
    }
    return interpolate(raw, {
        modeName: modeDef.label,
        boardCount: modeDef.boardCount,
        maxGuesses: modeDef.maxGuesses,
    });
});

// Game modes to show (enabled + not the current mode)
const otherModes = GAME_MODES_UI.filter((m) => m.enabled && m.id !== props.mode).slice(0, 6);

// Language data from API
const { data: langData } = await useFetch('/api/languages');
const allLanguages = computed(() => {
    const langs = langData.value?.languages as
        | Record<
              string,
              { language_name: string; language_name_native: string; language_code: string }
          >
        | undefined;
    if (!langs) return [];

    const popularity = (langData.value?.language_popularity as string[]) || [];
    return Object.values(langs)
        .filter((l) => l.language_code !== props.lang)
        .sort((a, b) => {
            const ia = popularity.indexOf(a.language_code);
            const ib = popularity.indexOf(b.language_code);
            return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
        })
        .slice(0, 18);
});

// Recent words archive (classic mode only — creates daily-fresh internal links)
interface ArchiveWord {
    day_idx: number;
    word: string | null;
    date: string;
    definition?: { definition?: string; part_of_speech?: string } | null;
    stats?: { total: number; wins: number } | null;
    is_today: boolean;
}
const { data: archiveData } = isClassic
    ? await useFetch<{ words: ArchiveWord[] }>(`/api/${props.lang}/words?page=1&per_page=6`)
    : { data: ref(null) };

const recentWords = computed(() => {
    if (!archiveData?.value?.words) return [];
    return archiveData.value.words.filter((w) => !w.is_today && w.word).slice(0, 5);
});
</script>

<template>
    <div class="seo-content snap-end min-h-[100dvh] bg-paper border-t border-rule">
        <div class="max-w-2xl mx-auto px-5 py-16 space-y-14">
            <!-- ─── Section 1: Title + Description ─── -->
            <header class="text-center space-y-3">
                <span class="mono-label">{{
                    isClassic ? 'Daily Word Game' : modeDef.label.toUpperCase()
                }}</span>
                <h2 class="heading-display text-3xl sm:text-4xl text-ink">
                    {{
                        isClassic
                            ? `Wordle in ${seo.langName}`
                            : `${seo.modeLabel} — Wordle ${seo.langNative}`
                    }}
                </h2>
                <p class="text-muted text-base max-w-lg mx-auto leading-relaxed">
                    {{ seo.description }}
                </p>
            </header>

            <!-- ─── Social Proof Stats ─── -->
            <div class="grid grid-cols-4 gap-2 text-center editorial-rule pb-6">
                <div v-for="stat in SOCIAL_STATS" :key="stat.label">
                    <div class="font-display font-bold text-xl sm:text-2xl text-ink">
                        {{ stat.value }}
                    </div>
                    <div class="mono-label mt-1">{{ stat.label }}</div>
                </div>
            </div>

            <!-- ─── Today's Word (classic mode only) ─── -->
            <section v-if="isClassic && todaysWord" id="todays-word" class="space-y-4">
                <h3 class="heading-section text-xl text-ink text-center">Today's Word</h3>
                <div class="border border-rule max-w-md mx-auto">
                    <!-- Not yet revealed: show button -->
                    <button
                        v-if="!wordRevealed"
                        class="w-full px-5 py-4 cursor-pointer select-none hover:bg-paper-warm transition-colors text-sm text-accent font-semibold text-center"
                        @click="onRevealClick"
                    >
                        {{
                            gameAlreadyOver
                                ? "Show today's word"
                                : 'Click to reveal (ends your game)'
                        }}
                    </button>
                    <!-- Revealed: show the word -->
                    <div v-else class="px-5 py-5 text-center space-y-3">
                        <div class="heading-display text-4xl text-ink tracking-wider">
                            {{ todaysWord }}
                        </div>
                        <p class="text-xs text-muted">
                            Wordle {{ seo.langNative }} #{{ todaysIdx }}
                        </p>
                        <a
                            :href="`/${lang}/word/${todaysIdx}`"
                            class="inline-block text-sm text-muted underline hover:text-ink transition-colors"
                        >
                            See definition & word art
                        </a>
                    </div>
                </div>

                <!-- Confirmation modal (only when game is still in progress) -->
                <BaseModal
                    :visible="showRevealConfirm"
                    size="sm"
                    @close="showRevealConfirm = false"
                >
                    <div class="text-center space-y-4">
                        <AlertTriangle :size="32" class="text-semicorrect mx-auto" />
                        <h3 class="heading-section text-lg text-ink">Reveal today's word?</h3>
                        <p class="text-sm text-muted leading-relaxed">
                            This will count as a loss and end your current streak.
                        </p>
                        <div class="flex gap-3 pt-2">
                            <button
                                class="flex-1 px-4 py-2.5 text-sm border border-rule hover:bg-paper-warm transition-colors"
                                @click="showRevealConfirm = false"
                            >
                                Cancel
                            </button>
                            <button
                                class="flex-1 px-4 py-2.5 text-sm bg-ink text-paper font-semibold hover:opacity-90 transition-opacity"
                                @click="confirmReveal"
                            >
                                Reveal word
                            </button>
                        </div>
                    </div>
                </BaseModal>
            </section>

            <div v-if="isClassic && todaysWord" class="editorial-rule" />

            <!-- ─── How to Play (with tile examples) ─── -->
            <section id="how-to-play" class="space-y-6">
                <h3 class="heading-section text-xl text-ink text-center">
                    {{ h.howToPlay }}{{ isClassic ? '' : ` ${seo.modeLabel}` }}
                </h3>

                <!-- Tile color examples (reuses HelpModal tile pattern) -->
                <div v-if="!isMultiBoard && mode !== 'speed'" class="space-y-4 max-w-xs mx-auto">
                    <div v-for="ex in EXAMPLES" :key="ex.type" class="space-y-1.5">
                        <div class="grid grid-cols-5 gap-1">
                            <div
                                v-for="(c, i) in ex.word.split('')"
                                :key="i"
                                class="tile aspect-square inline-flex justify-center items-center text-lg uppercase font-display font-bold select-none"
                                :class="i === ex.idx ? `${ex.type} text-white` : 'filled'"
                            >
                                {{ c }}
                            </div>
                        </div>
                        <p class="text-xs text-muted">
                            <strong :class="`text-${ex.type}`">{{ ex.letter }}</strong>
                            {{ ex.desc }}
                        </p>
                    </div>
                </div>

                <!-- Mode description (from config.seo.mode_desc_*) -->
                <p v-if="modeDesc" class="text-sm text-muted leading-relaxed max-w-lg mx-auto">
                    {{ modeDesc }}
                </p>
            </section>

            <div class="editorial-rule" />

            <!-- ─── Section 3: Strategy Tips ─── -->
            <section v-if="strategyTips.length" id="tips" class="space-y-5">
                <h3 class="heading-section text-xl text-ink text-center">
                    <Lightbulb :size="20" class="inline -mt-0.5 mr-1" />
                    {{ h.tipsStrategy }}
                </h3>
                <div class="space-y-4 max-w-lg mx-auto">
                    <div v-for="(tip, i) in strategyTips" :key="i" class="flex gap-4 items-start">
                        <span
                            class="w-7 h-7 flex items-center justify-center border border-rule bg-paper-warm flex-shrink-0 font-display font-bold text-sm text-ink"
                        >
                            {{ i + 1 }}
                        </span>
                        <div class="min-w-0">
                            <div class="text-sm font-semibold text-ink">{{ tip.title }}</div>
                            <p class="text-xs text-muted mt-0.5 leading-relaxed">
                                {{ tip.text }}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <div v-if="isClassic" class="editorial-rule" />

            <!-- ─── Best Starting Words (classic only) ─── -->
            <GameBestStartingWordsPanel
                v-if="isClassic"
                :lang="lang"
                :lang-name="seo.langName"
                :limit="5"
            />

            <div class="editorial-rule" />

            <!-- ─── Section 4: Game Modes Grid ─── -->
            <section id="game-modes" class="space-y-5">
                <h3 class="heading-section text-xl text-ink text-center">{{ h.moreModes }}</h3>
                <div
                    class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 border border-rule"
                    style="background: var(--color-rule); gap: 1px"
                >
                    <a
                        v-for="m in otherModes"
                        :key="m.id"
                        :href="getModeRoute(m, lang) || '#'"
                        class="bg-paper py-5 px-5 text-left hover:bg-paper-warm transition-colors flex items-start gap-3"
                    >
                        <div
                            class="w-9 h-9 flex items-center justify-center border border-rule bg-paper-warm flex-shrink-0"
                        >
                            <component :is="m.icon" :size="18" class="text-ink" />
                        </div>
                        <div class="min-w-0">
                            <div class="heading-section text-sm text-ink">
                                {{ getModeLabel(m, config.ui) }}
                            </div>
                            <p class="text-xs text-muted mt-0.5 leading-snug">
                                {{ getModeDescription(m, config.ui) }}
                            </p>
                        </div>
                    </a>
                </div>
            </section>

            <div class="editorial-rule" />

            <!-- ─── Section 5: Language Grid ─── -->
            <section id="languages" class="space-y-5">
                <div class="text-center space-y-1">
                    <h3 class="heading-section text-xl text-ink">{{ h.playInLanguages }}</h3>
                    <p class="text-xs text-muted">{{ h.playInLanguagesSub }}</p>
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-3 border-t border-rule">
                    <a
                        v-for="l in allLanguages"
                        :key="l.language_code"
                        :href="`/${l.language_code}${isClassic ? '' : '/' + mode}`"
                        class="flex items-center gap-3 text-left border-b border-rule hover:bg-paper-warm transition-colors"
                        style="padding: 12px 16px"
                    >
                        <img
                            v-if="useFlag(l.language_code)"
                            :src="useFlag(l.language_code)!"
                            :alt="l.language_name"
                            class="flag-icon-sm"
                            width="20"
                            height="20"
                            loading="lazy"
                        />
                        <div
                            v-else
                            class="flag-icon-sm bg-paper-warm border border-rule flex items-center justify-center text-ink text-[10px] font-display font-bold"
                        >
                            {{ l.language_name_native.charAt(0) }}
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="text-sm font-semibold text-ink truncate">
                                {{ l.language_name_native }}
                            </div>
                            <div class="text-xs text-muted truncate">{{ l.language_name }}</div>
                        </div>
                    </a>
                </div>
                <p class="text-center">
                    <a
                        href="https://wordle.global/"
                        class="text-sm text-muted underline hover:text-ink transition-colors"
                        >{{ h.browseAll }}</a
                    >
                </p>
            </section>

            <div class="editorial-rule" />

            <!-- ─── Section 6: Why Wordle Global (Value Props) ─── -->
            <section v-if="valueProps.length" id="why-wordle-global" class="space-y-5">
                <h3 class="heading-section text-xl text-ink text-center">
                    {{ h.whyWordleGlobal }}
                </h3>
                <div
                    class="grid grid-cols-2 sm:grid-cols-3 border border-rule"
                    style="background: var(--color-rule); gap: 1px"
                >
                    <div
                        v-for="prop in valueProps"
                        :key="prop.title"
                        class="bg-paper py-5 px-4 text-center space-y-2"
                    >
                        <component :is="prop.icon" :size="22" class="text-ink mx-auto" />
                        <div class="heading-section text-sm text-ink">{{ prop.title }}</div>
                        <p class="text-xs text-muted leading-snug">{{ prop.desc }}</p>
                    </div>
                </div>
            </section>

            <div class="editorial-rule" />

            <!-- ─── Section 7: FAQ (details/summary accordions) ─── -->
            <section v-if="seo.faq.length" class="space-y-4">
                <h3 class="heading-section text-xl text-ink text-center">
                    {{ h.faqTitle }}
                </h3>
                <div class="border border-rule divide-y divide-rule">
                    <details
                        v-for="(item, i) in seo.faq"
                        :key="item.question"
                        class="group"
                        :open="i === 0"
                    >
                        <summary
                            class="flex items-center justify-between gap-4 px-5 py-4 cursor-pointer select-none hover:bg-paper-warm transition-colors"
                        >
                            <span class="text-sm font-semibold text-ink">{{ item.question }}</span>
                            <svg
                                class="w-4 h-4 text-muted flex-shrink-0 transition-transform group-open:rotate-180"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                stroke-width="2"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    d="M19 9l-7 7-7-7"
                                />
                            </svg>
                        </summary>
                        <div class="px-5 pb-4 text-sm text-muted leading-relaxed">
                            {{ item.answer }}
                        </div>
                    </details>
                </div>
            </section>

            <!-- ─── Section 8: Recent Words Archive (classic only) ─── -->
            <template v-if="isClassic && recentWords.length">
                <div class="editorial-rule" />
                <section class="space-y-4">
                    <h3 class="heading-section text-xl text-ink text-center">
                        {{ h.recentWords }}
                    </h3>
                    <div class="border border-rule divide-y divide-rule">
                        <a
                            v-for="w in recentWords"
                            :key="w.day_idx"
                            :href="`/${lang}/word/${w.day_idx}`"
                            class="flex items-center justify-between px-5 py-3 hover:bg-paper-warm transition-colors"
                        >
                            <div class="flex items-center gap-3">
                                <span
                                    class="font-display font-bold text-base text-ink tracking-wider"
                                    >{{ w.word?.toUpperCase() }}</span
                                >
                                <span
                                    v-if="w.definition?.part_of_speech"
                                    class="text-xs text-muted italic"
                                    >{{ w.definition.part_of_speech }}</span
                                >
                            </div>
                            <div class="text-right flex-shrink-0">
                                <div class="mono-label">#{{ w.day_idx }}</div>
                                <div class="text-xs text-muted">{{ w.date }}</div>
                            </div>
                        </a>
                    </div>
                    <p class="text-center">
                        <a
                            :href="`/${lang}/words`"
                            class="text-sm text-muted underline hover:text-ink transition-colors"
                            >{{ h.viewAllWords }}</a
                        >
                    </p>
                </section>
            </template>

            <!-- ─── Footer ─── -->
            <footer class="text-center space-y-2 pt-4">
                <div class="editorial-rule" />
                <p class="mono-label pt-4">{{ h.footer }}</p>
            </footer>
        </div>
    </div>
</template>
