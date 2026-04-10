<script setup lang="ts">
import { usePageDirection } from '~/composables/usePageDirection';

const { direction } = usePageDirection();
const { showLoginModal, closeLoginModal } = useLoginModal();

/** Dynamic transition name based on navigation direction:
 *  page-forward (slide left), page-back (slide right), page-lateral (crossfade).
 *  View Transitions API supersedes this in supported browsers (Tier 3). */
const pageTransition = computed(() => ({
    name: `page-${direction.value}`,
    mode: 'out-in' as const,
}));

useHead({
    htmlAttrs: { lang: 'en' },
    script: [
        {
            // Dark mode flash prevention — must run before first paint
            innerHTML: `(function(){try{if(localStorage.getItem('darkMode')==='true'||(!localStorage.getItem('darkMode')&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()`,
            tagPosition: 'head',
        },
    ],
});
</script>

<template>
    <NuxtLayout>
        <NuxtPage :transition="pageTransition" />
    </NuxtLayout>
    <AccountBadgeEarned />
    <AccountLoginModal :visible="showLoginModal" @close="closeLoginModal" />
</template>
