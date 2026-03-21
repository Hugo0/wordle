<template>
    <SharedBaseModal :visible="visible" size="md" @close="$emit('close')">
        <div class="flex flex-col gap-2">
            <!-- Speed Streak help -->
            <template v-if="isSpeedMode">
                <h2 class="heading-body text-2xl text-center text-ink">Speed Streak</h2>

                <div class="editorial-rule" />

                <h3 class="heading-section text-base text-ink">How it works</h3>
                <p class="text-sm text-ink">
                    You start with <strong>3 minutes</strong> on the clock. Solve words to earn
                    bonus time. Miss a word and you lose 30 seconds.
                </p>

                <div class="editorial-rule" />

                <h3 class="heading-section text-base text-ink">Time bonuses</h3>
                <div class="grid grid-cols-6 gap-1 text-center">
                    <div v-for="n in 6" :key="n" class="py-2">
                        <div class="font-mono text-xs text-muted">{{ n }}</div>
                        <div class="font-mono text-sm font-bold text-ink">
                            +{{ [60, 50, 40, 30, 20, 10][n - 1] }}s
                        </div>
                    </div>
                </div>
                <p class="text-xs text-muted">Guesses used → time earned</p>

                <div class="editorial-rule" />

                <h3 class="heading-section text-base text-ink">Scoring</h3>
                <p class="text-sm text-ink">
                    Points = (7 &minus; guesses) &times; 100 &times; combo multiplier. Consecutive
                    solves build your combo up to 3x. A failed word resets your combo.
                </p>

                <div class="editorial-rule" />

                <h3 class="heading-section text-base text-ink">Pressure ramp</h3>
                <p class="text-sm text-ink">
                    Every 3 words solved, the timer speeds up. The longer you survive, the harder it
                    gets.
                </p>
            </template>

            <!-- Classic/default help -->
            <template v-else>
                <h2 class="heading-body text-2xl text-center text-ink">
                    Wordle
                    <span class="text-accent">{{ lang.config?.name_native }}</span>
                </h2>

                <h3 class="heading-section text-lg text-ink">{{ help.title }}</h3>

                <p class="text-sm text-ink">
                    {{ help.text_1_1_1 }}
                    <span class="font-bold uppercase">Wordle</span>
                    {{ help.text_1_1_2 }}
                </p>
                <p class="text-sm text-ink">{{ help.text_1_2 }}</p>
                <p class="text-sm text-ink">{{ help.text_1_3 }}</p>

                <div class="editorial-rule" />

                <!-- Example tiles -->
                <div class="justify-center items-center flex flex-col gap-2">
                    <h2 class="heading-section text-base text-ink">
                        {{ help.title_2 }}
                    </h2>

                    <div v-if="exampleWord1.length" class="grid grid-cols-5 gap-1 w-full max-w-xs">
                        <div
                            v-for="(c, i) in exampleWord1"
                            :key="'ex1-' + i"
                            class="tile w-full h-full inline-flex justify-center items-center text-2xl tiny:text-4xl uppercase font-display font-bold select-none"
                            :class="i === 0 ? 'correct text-white' : 'aspect-square filled'"
                        >
                            {{ c }}
                        </div>
                    </div>
                    <p v-if="exampleWord1.length" class="text-sm text-ink mb-2">
                        <span class="font-bold uppercase">{{ exampleWord1[0] }}</span>
                        {{ help.text_2_1 }}
                    </p>

                    <div v-if="exampleWord2.length" class="grid grid-cols-5 gap-1 w-full max-w-xs">
                        <div
                            v-for="(c, i) in exampleWord2"
                            :key="'ex2-' + i"
                            class="tile w-full h-full inline-flex justify-center items-center text-2xl tiny:text-4xl uppercase font-display font-bold select-none"
                            :class="i === 2 ? 'semicorrect text-white' : 'aspect-square filled'"
                        >
                            {{ c }}
                        </div>
                    </div>
                    <p v-if="exampleWord2.length" class="text-sm text-ink mb-2">
                        <span class="font-bold uppercase">{{ exampleWord2[2] }}</span>
                        {{ help.text_2_2 }}
                    </p>

                    <div v-if="exampleWord3.length" class="grid grid-cols-5 gap-1 w-full max-w-xs">
                        <div
                            v-for="(c, i) in exampleWord3"
                            :key="'ex3-' + i"
                            class="tile w-full h-full inline-flex justify-center items-center text-2xl tiny:text-4xl uppercase font-display font-bold select-none"
                            :class="i === 4 ? 'incorrect text-white' : 'aspect-square filled'"
                        >
                            {{ c }}
                        </div>
                    </div>
                    <p v-if="exampleWord3.length" class="text-sm text-ink mb-2">
                        <span class="font-bold uppercase">{{ exampleWord3[4] }}</span>
                        {{ help.text_2_3 }}
                    </p>
                </div>
            </template>

            <div class="editorial-rule" />

            <!-- Close button -->
            <button
                class="mono-label-md text-ink hover:text-accent transition-colors"
                @click="$emit('close')"
            >
                {{ help.close || 'Close' }} &times;
            </button>
        </div>
    </SharedBaseModal>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useLanguageStore } from '~/stores/language';

defineProps<{ visible: boolean }>();
defineEmits<{ close: [] }>();

const lang = useLanguageStore();
const game = useGameStore();

const isSpeedMode = computed(() => game.gameConfig.mode === 'speed');

const help = computed(() => lang.config?.help ?? ({} as Record<string, string>));

const exampleWord1 = computed(() => [...(lang.wordList[0] ?? '')]);
const exampleWord2 = computed(() => [...(lang.wordList[1] ?? '')]);
const exampleWord3 = computed(() => [...(lang.wordList[2] ?? '')]);
</script>
