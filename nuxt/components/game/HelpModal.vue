<template>
    <div
        v-show="visible"
        id="HelpModal"
        class="fixed top-10 left-0 w-full h-full z-50 items-center flex mx-auto"
    >
        <div
            class="modal-animate bg-white dark:bg-neutral-800 rounded-lg shadow-lg p-5 m-4 border-2 border-slate-200 dark:border-neutral-600 mx-auto w-full max-w-md sm:max-w-lg"
        >
            <div class="flex flex-col gap-2 relative">
                <!-- Close (X) button -->
                <button
                    type="button"
                    aria-label="Close"
                    class="absolute top-0 right-0 p-1 ml-auto z-50"
                    @click="$emit('close')"
                >
                    <span
                        class="leading-[0.25] h-5 w-5 text-3xl text-neutral-400 block outline-none focus:outline-none"
                        >&times;</span
                    >
                </button>

                <!-- Title -->
                <h2 class="flex mx-auto uppercase font-bold text-2xl tracking-wider">
                    Wordle
                    <span
                        class="ml-1 text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-blue-500"
                    >
                        {{ lang.config?.name_native }}
                    </span>
                </h2>

                <h3 class="font-bold text-lg">{{ help.title }}</h3>

                <!-- How to play text -->
                <p class="text-sm">
                    {{ help.text_1_1_1 }}
                    <a class="font-bold uppercase">Wordle</a>
                    {{ help.text_1_1_2 }}
                </p>
                <p class="text-sm">{{ help.text_1_2 }}</p>
                <p class="text-sm">{{ help.text_1_3 }}</p>

                <div class="border-t-2 border-gray-300 dark:border-gray-600" />

                <!-- Example tiles -->
                <div class="justify-center items-center flex flex-col gap-2">
                    <h2
                        class="text-md font-semibold text-gray-900 dark:text-gray-100"
                    >
                        {{ help.title_2 }}
                    </h2>

                    <!-- Example 1: correct (green) on first letter -->
                    <div
                        v-if="exampleWord1.length"
                        class="grid grid-cols-5 gap-1 w-full max-w-xs"
                    >
                        <div
                            v-for="(c, i) in exampleWord1"
                            :key="'ex1-' + i"
                            class="w-full h-full inline-flex justify-center items-center text-2xl tiny:text-4xl uppercase font-bold select-none"
                            :class="
                                i === 0
                                    ? 'correct text-white'
                                    : 'aspect-square border-2 border-neutral-500'
                            "
                        >
                            {{ c }}
                        </div>
                    </div>
                    <p v-if="exampleWord1.length" class="text-sm mb-2">
                        <span class="font-bold uppercase">{{
                            exampleWord1[0]
                        }}</span>
                        {{ help.text_2_1 }}
                    </p>

                    <!-- Example 2: semicorrect (yellow) on third letter -->
                    <div
                        v-if="exampleWord2.length"
                        class="grid grid-cols-5 gap-1 w-full max-w-xs"
                    >
                        <div
                            v-for="(c, i) in exampleWord2"
                            :key="'ex2-' + i"
                            class="w-full h-full inline-flex justify-center items-center text-2xl tiny:text-4xl uppercase font-bold select-none"
                            :class="
                                i === 2
                                    ? 'semicorrect text-white'
                                    : 'aspect-square border-2 border-neutral-500'
                            "
                        >
                            {{ c }}
                        </div>
                    </div>
                    <p v-if="exampleWord2.length" class="text-sm mb-2">
                        <span class="font-bold uppercase">{{
                            exampleWord2[2]
                        }}</span>
                        {{ help.text_2_2 }}
                    </p>

                    <!-- Example 3: incorrect (gray) on fifth letter -->
                    <div
                        v-if="exampleWord3.length"
                        class="grid grid-cols-5 gap-1 w-full max-w-xs"
                    >
                        <div
                            v-for="(c, i) in exampleWord3"
                            :key="'ex3-' + i"
                            class="w-full h-full inline-flex justify-center items-center text-2xl tiny:text-4xl uppercase font-bold select-none"
                            :class="
                                i === 4
                                    ? 'incorrect text-white'
                                    : 'aspect-square border-2 border-neutral-500'
                            "
                        >
                            {{ c }}
                        </div>
                    </div>
                    <p v-if="exampleWord3.length" class="text-sm mb-2">
                        <span class="font-bold uppercase">{{
                            exampleWord3[4]
                        }}</span>
                        {{ help.text_2_3 }}
                    </p>
                </div>

                <div class="border-t-2 border-gray-300 dark:border-gray-600" />

                <!-- Links -->
                <div class="flex flex-col gap-2 py-2">
                    <a
                        href="https://github.com/Hugo0/wordle/issues"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-4 w-4"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            stroke-width="2"
                            stroke="currentColor"
                            fill="none"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        >
                            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                            <path
                                d="M9 19c-4.3 1.4 -4.3 -2.5 -6 -3m12 5v-3.5c0 -1 .1 -1.4 -.5 -2c2.8 -.3 5.5 -1.4 5.5 -6a4.6 4.6 0 0 0 -1.3 -3.2a4.2 4.2 0 0 0 -.1 -3.2s-1.1 -.3 -3.5 1.3a12.3 12.3 0 0 0 -6.2 0c-2.4 -1.6 -3.5 -1.3 -3.5 -1.3a4.2 4.2 0 0 0 -.1 3.2a4.6 4.6 0 0 0 -1.3 3.2c0 4.6 2.7 5.7 5.5 6c-.6 .6 -.6 1.2 -.5 2v3.5"
                            />
                        </svg>
                        {{ lang.config?.ui?.report_issue || 'Report an Issue' }}
                    </a>
                    <a
                        href="https://github.com/Hugo0/wordle"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-4 w-4"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            stroke-width="2"
                            stroke="currentColor"
                            fill="none"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        >
                            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                            <path
                                d="M10 14a3.5 3.5 0 0 0 5 0l4 -4a3.5 3.5 0 0 0 -5 -5l-.5 .5"
                            />
                            <path
                                d="M14 10a3.5 3.5 0 0 0 -5 0l-4 4a3.5 3.5 0 0 0 5 5l.5 -.5"
                            />
                        </svg>
                        {{ lang.config?.ui?.view_source || 'View Source Code' }}
                    </a>
                </div>

                <div class="border-t-2 border-gray-300 dark:border-gray-600" />

                <!-- Close button -->
                <button
                    class="uppercase font-bold text-sm tracking-wider"
                    @click="$emit('close')"
                >
                    {{ help.close }}
                    <span class="text-lg text-neutral-400">&times;</span>
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useLanguageStore } from '~/stores/language';

defineProps<{ visible: boolean }>();
defineEmits<{ close: [] }>();

const lang = useLanguageStore();

/** Shorthand for help translations, with safe fallbacks. */
const help = computed(() => lang.config?.help ?? ({} as Record<string, string>));

/**
 * Example words: we take the first three words from the word list
 * and split them into character arrays for the template tiles.
 */
const exampleWord1 = computed(() => [...(lang.wordList[0] ?? '')]);
const exampleWord2 = computed(() => [...(lang.wordList[1] ?? '')]);
const exampleWord3 = computed(() => [...(lang.wordList[2] ?? '')]);
</script>
