<script setup lang="ts">
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
        <NuxtPage />
    </NuxtLayout>
</template>
