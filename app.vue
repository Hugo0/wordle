<script setup lang="ts">
import { usePageDirection } from '~/composables/usePageDirection';

const { direction } = usePageDirection();
const { showLoginModal, closeLoginModal } = useLoginModal();

/** Direction-aware page transition. No 'out-in' — it causes blank screens
 *  because Nuxt's Suspense blocks the enter while out-in already removed
 *  the leave. Leave-active CSS uses position:absolute to handle the overlap. */
const pageTransition = computed(() => ({
    name: `page-${direction.value}`,
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
