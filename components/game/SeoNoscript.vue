<!--
  SEO content section for all game pages.

  Renders ~200 words of crawlable HTML below the game viewport.
  The game layout uses CSS scroll-snap (mandatory) so the game viewport
  is a magnetic snap point — users have to scroll deliberately past 50%
  to reach this section. Google's renderer sees it in the full DOM.
-->
<script setup lang="ts">
import { GAME_MODE_CONFIG } from '~/utils/game-modes';
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
</script>

<template>
    <div class="seo-content snap-start min-h-[100dvh] bg-paper text-muted px-6 py-12">
        <div class="max-w-xl mx-auto text-sm leading-relaxed space-y-4">
            <h2 class="text-base font-semibold text-ink">
                {{ isClassic ? `Wordle in ${seo.langName}` : seo.modeLabel }}
            </h2>
            <p>{{ seo.description }}</p>

            <h3 class="text-sm font-semibold text-ink pt-2">
                How to Play{{ isClassic ? ` Wordle in ${seo.langName}` : ` ${seo.modeLabel}` }}
            </h3>
            <template v-if="isMultiBoard">
                <p>
                    {{ seo.modeLabel }} is a multi-board Wordle variant. You solve
                    {{ modeDef.boardCount }} boards at the same time using
                    {{ modeDef.maxGuesses }} guesses. Each guess is entered on all unsolved boards
                    simultaneously.
                </p>
            </template>
            <template v-else-if="mode === 'speed'">
                <p>
                    Speed Streak is a timed Wordle mode. Start with 3 minutes and solve as many
                    words as you can. Solve quickly to earn bonus time. Build combos for higher
                    scores.
                </p>
            </template>
            <template v-else>
                <p>
                    Guess the hidden 5-letter word in 6 tries. After each guess, tiles change color:
                    green means correct letter and position, yellow means correct letter but wrong
                    position, gray means the letter is not in the word.
                    <template v-if="mode === 'unlimited'">
                        In Unlimited mode, press "Play Again" after each game to get a new word
                        instantly. There is no daily limit.
                    </template>
                </p>
            </template>

            <h3 class="text-sm font-semibold text-ink pt-2">Frequently Asked Questions</h3>
            <dl class="space-y-2">
                <template v-for="item in seo.faq.slice(0, 4)" :key="item.question">
                    <dt class="font-medium text-ink">{{ item.question }}</dt>
                    <dd>{{ item.answer }}</dd>
                </template>
            </dl>

            <h3 class="text-sm font-semibold text-ink pt-2">More Game Modes</h3>
            <nav class="flex flex-wrap gap-x-4 gap-y-1">
                <a v-if="!isClassic" :href="`/${lang}`" class="underline">Daily</a>
                <a v-if="mode !== 'unlimited'" :href="`/${lang}/unlimited`" class="underline"
                    >Unlimited</a
                >
                <a v-if="mode !== 'speed'" :href="`/${lang}/speed`" class="underline"
                    >Speed Streak</a
                >
                <a v-if="mode !== 'dordle'" :href="`/${lang}/dordle`" class="underline">Dordle</a>
                <a v-if="mode !== 'quordle'" :href="`/${lang}/quordle`" class="underline"
                    >Quordle</a
                >
            </nav>

            <p class="pt-2">
                <a href="https://wordle.global/" class="underline"
                    >Play Wordle in 80+ languages at wordle.global</a
                >
            </p>
        </div>
    </div>
</template>
