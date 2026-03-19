<template>
    <header
        class="relative flex flex-row justify-between items-center h-[50px] my-auto p-1 px-3 lg:px-1 border-b border-neutral-300 dark:border-neutral-600"
    >
        <button class="z-40 text-neutral-500 p-2" aria-label="How to play" @click="$emit('help')">
            <svg
                xmlns="http://www.w3.org/2000/svg"
                class="text-neutral-500"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                stroke-width="2"
                stroke="currentColor"
                fill="none"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
            >
                <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                <circle cx="12" cy="12" r="9" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
                <polyline points="11 12 12 12 12 16 13 16" />
            </svg>
        </button>
        <div class="absolute text-center right-0 left-0">
            <h1 class="uppercase font-bold text-2xl sm:text-4xl tracking-wider">
                <a href="/"
                    >Wordle
                    <span
                        class="text-xl sm:text-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded px-1 py-0"
                    >
                        {{ langCode }}</span
                    ></a
                >
            </h1>
        </div>
        <div class="flex flex-row gap-3 z-30">
            <button class="m-0 sm:my-1 p-2" aria-label="Statistics" @click="$emit('stats')">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-6 w-6 text-neutral-500"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    stroke-width="2"
                    stroke="currentColor"
                    fill="none"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                >
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                    <rect x="3" y="12" width="6" height="8" rx="1" />
                    <rect x="9" y="8" width="6" height="12" rx="1" />
                    <rect x="15" y="4" width="6" height="16" rx="1" />
                    <line x1="4" y1="20" x2="18" y2="20" />
                </svg>
            </button>
            <button class="m-0 sm:my-1 p-2" aria-label="Settings" @click="$emit('settings')">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="text-neutral-500"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    stroke-width="2"
                    stroke="currentColor"
                    fill="none"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                >
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                    <path
                        d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z"
                    />
                    <circle cx="12" cy="12" r="3" />
                </svg>
            </button>
        </div>
    </header>
</template>

<script setup lang="ts">
defineProps<{ langCode: string }>();
defineEmits<{ help: []; stats: []; settings: [] }>();
</script>
