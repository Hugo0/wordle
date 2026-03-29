<!--
  SEO content section for all game pages.

  Rendered below the game viewport in the DOM. The game layout uses
  scroll-snap + a JS rubber-band guard so users almost never reach this.
  Google's renderer sees all content in the full rendered DOM.

  Reuses design tokens, editorial typography, tile examples (from HelpModal),
  mode cards (from homepage), and flag icons (Circle Flags) for consistency.
-->
<script setup lang="ts">
import { GAME_MODE_CONFIG } from '~/utils/game-modes';
import { GAME_MODES_UI, getModeRoute } from '~/composables/useGameModes';
import { useFlag } from '~/composables/useFlag';
import type { GameMode } from '~/utils/game-modes';
import type { GameSeoResult } from '~/composables/useGameSeo';

const props = defineProps<{
    lang: string;
    mode: GameMode;
    seo: GameSeoResult;
}>();

const isClassic = props.mode === 'classic';
const modeDef = GAME_MODE_CONFIG[props.mode];
const isMultiBoard = modeDef.boardCount > 1;

// Game modes to show (enabled + not the current mode)
const otherModes = GAME_MODES_UI.filter((m) => m.enabled && m.id !== props.mode).slice(0, 6);

// Top languages by traffic for the language grid
const TOP_LANGUAGES = [
    { code: 'en', native: 'English', name: 'English' },
    { code: 'fi', native: 'Suomi', name: 'Finnish' },
    { code: 'ar', native: 'العربية', name: 'Arabic' },
    { code: 'de', native: 'Deutsch', name: 'German' },
    { code: 'es', native: 'Español', name: 'Spanish' },
    { code: 'tr', native: 'Türkçe', name: 'Turkish' },
    { code: 'it', native: 'Italiano', name: 'Italian' },
    { code: 'hr', native: 'Hrvatski', name: 'Croatian' },
    { code: 'bg', native: 'Български', name: 'Bulgarian' },
    { code: 'sv', native: 'Svenska', name: 'Swedish' },
    { code: 'ru', native: 'Русский', name: 'Russian' },
    { code: 'pt', native: 'Português', name: 'Portuguese' },
].filter((l) => l.code !== props.lang);

// Tile example words for how-to section
const EXAMPLE_CORRECT = { word: 'CRANE', highlight: 0, type: 'correct' as const };
const EXAMPLE_WRONG_POS = { word: 'PILOT', highlight: 1, type: 'semicorrect' as const };
const EXAMPLE_ABSENT = { word: 'MONEY', highlight: 2, type: 'incorrect' as const };
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

            <div class="editorial-rule" />

            <!-- ─── Section 2: How to Play (with tile examples) ─── -->
            <section class="space-y-6">
                <h3 class="heading-section text-xl text-ink text-center">
                    How to Play{{ isClassic ? '' : ` ${seo.modeLabel}` }}
                </h3>

                <!-- Tile color examples (reuses HelpModal tile pattern) -->
                <div v-if="!isMultiBoard && mode !== 'speed'" class="space-y-4 max-w-xs mx-auto">
                    <!-- Green example -->
                    <div class="space-y-1.5">
                        <div class="grid grid-cols-5 gap-1">
                            <div
                                v-for="(c, i) in EXAMPLE_CORRECT.word.split('')"
                                :key="i"
                                class="tile aspect-square inline-flex justify-center items-center text-lg uppercase font-display font-bold select-none"
                                :class="
                                    i === EXAMPLE_CORRECT.highlight
                                        ? 'correct text-white'
                                        : 'filled'
                                "
                            >
                                {{ c }}
                            </div>
                        </div>
                        <p class="text-xs text-muted">
                            <strong class="text-correct">C</strong> is in the word and in the
                            correct spot.
                        </p>
                    </div>

                    <!-- Yellow example -->
                    <div class="space-y-1.5">
                        <div class="grid grid-cols-5 gap-1">
                            <div
                                v-for="(c, i) in EXAMPLE_WRONG_POS.word.split('')"
                                :key="i"
                                class="tile aspect-square inline-flex justify-center items-center text-lg uppercase font-display font-bold select-none"
                                :class="
                                    i === EXAMPLE_WRONG_POS.highlight
                                        ? 'semicorrect text-white'
                                        : 'filled'
                                "
                            >
                                {{ c }}
                            </div>
                        </div>
                        <p class="text-xs text-muted">
                            <strong class="text-semicorrect">I</strong> is in the word but in the
                            wrong spot.
                        </p>
                    </div>

                    <!-- Gray example -->
                    <div class="space-y-1.5">
                        <div class="grid grid-cols-5 gap-1">
                            <div
                                v-for="(c, i) in EXAMPLE_ABSENT.word.split('')"
                                :key="i"
                                class="tile aspect-square inline-flex justify-center items-center text-lg uppercase font-display font-bold select-none"
                                :class="
                                    i === EXAMPLE_ABSENT.highlight
                                        ? 'incorrect text-white'
                                        : 'filled'
                                "
                            >
                                {{ c }}
                            </div>
                        </div>
                        <p class="text-xs text-muted">
                            <strong>N</strong> is not in the word at all.
                        </p>
                    </div>
                </div>

                <!-- Text description for multi-board / speed -->
                <div class="text-sm text-muted leading-relaxed max-w-lg mx-auto space-y-2">
                    <template v-if="isMultiBoard">
                        <p>
                            {{ seo.modeLabel }} challenges you to solve
                            {{ modeDef.boardCount }} Wordle boards at the same time using just
                            {{ modeDef.maxGuesses }} guesses. Each guess appears on all unsolved
                            boards simultaneously. Boards freeze when solved.
                        </p>
                        <p>
                            The split-color keyboard shows which letters are correct on which
                            boards. Start with common-letter words to gather clues across all boards
                            at once.
                        </p>
                    </template>
                    <template v-else-if="mode === 'speed'">
                        <p>
                            Start with 3 minutes on the clock. Each word you solve earns bonus time
                            — solve in fewer guesses for bigger bonuses (+60s for 1 guess, +10s for
                            6). Failed words cost 30 seconds.
                        </p>
                        <p>
                            Build combos by solving consecutive words for up to a 3x score
                            multiplier. The pressure ramps up as you solve more words — the timer
                            ticks faster every 3 words.
                        </p>
                    </template>
                    <template v-else>
                        <p>
                            You have 6 tries to guess a hidden 5-letter word. Use the color clues to
                            narrow down the answer.
                            <template v-if="mode === 'unlimited'">
                                After each game, press "Play Again" to get a new word instantly —
                                there's no daily limit.
                            </template>
                        </p>
                    </template>
                </div>
            </section>

            <div class="editorial-rule" />

            <!-- ─── Section 3: Game Modes Grid ─── -->
            <section class="space-y-5">
                <h3 class="heading-section text-xl text-ink text-center">More Game Modes</h3>
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
                            <div class="heading-section text-sm text-ink">{{ m.label }}</div>
                            <p class="text-xs text-muted mt-0.5 leading-snug">
                                {{ m.description }}
                            </p>
                        </div>
                    </a>
                </div>
            </section>

            <div class="editorial-rule" />

            <!-- ─── Section 4: Language Grid ─── -->
            <section class="space-y-5">
                <div class="text-center space-y-1">
                    <h3 class="heading-section text-xl text-ink">Play in 80+ Languages</h3>
                    <p class="text-xs text-muted">Every language is free. No account needed.</p>
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-3 border border-rule">
                    <a
                        v-for="l in TOP_LANGUAGES"
                        :key="l.code"
                        :href="`/${l.code}${isClassic ? '' : '/' + mode}`"
                        class="flex items-center gap-3 px-4 py-3 border-b border-r border-rule hover:bg-paper-warm transition-colors"
                    >
                        <img
                            v-if="useFlag(l.code)"
                            :src="useFlag(l.code)!"
                            :alt="l.name"
                            class="flag-icon-sm"
                            width="20"
                            height="20"
                            loading="lazy"
                        />
                        <div class="min-w-0">
                            <div class="text-sm font-semibold text-ink truncate">
                                {{ l.native }}
                            </div>
                            <div class="text-xs text-muted">{{ l.name }}</div>
                        </div>
                    </a>
                </div>
                <p class="text-center">
                    <a
                        href="https://wordle.global/"
                        class="text-sm text-muted underline hover:text-ink transition-colors"
                        >Browse all 80+ languages</a
                    >
                </p>
            </section>

            <div class="editorial-rule" />

            <!-- ─── Section 5: FAQ (details/summary accordions) ─── -->
            <section class="space-y-4">
                <h3 class="heading-section text-xl text-ink text-center">
                    Frequently Asked Questions
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

            <!-- ─── Footer ─── -->
            <footer class="text-center space-y-2 pt-4">
                <div class="editorial-rule" />
                <p class="mono-label pt-4">
                    <a href="https://wordle.global/" class="hover:text-ink transition-colors"
                        >wordle.global</a
                    >
                    — the free daily word game in 80+ languages
                </p>
            </footer>
        </div>
    </div>
</template>
