<script setup lang="ts">
definePageMeta({ layout: 'game', key: (route) => `${route.params.lang}-quordle` });

const route = useRoute();
const lang = route.params.lang as string;
const { data: gameData, error } = await useFetch(`/api/${lang}/data`);
if (error.value || !gameData.value) throw createError({ statusCode: 404, message: 'Language not found' });
const { data: allLangs } = await useFetch('/api/languages');

const { modeDef, config, sidebarOpen, toggleSidebar, closeSidebar, multiBoardRef, startNewGame, seo } =
    useMultiBoardModePage('quordle', lang, gameData, allLangs.value?.language_codes);
</script>

<template>
    <GamePageShell
        :lang="lang"
        :language-name="config?.name_native || config?.name || lang"
        current-mode="quordle"
        :title="seo.modeLabel"
        :subtitle="config?.name_native || lang"
        :sidebar-open="sidebarOpen"
        :max-width="modeDef.shellMaxWidth || 'lg'"
        :visible="!!gameData"
        @toggle-sidebar="toggleSidebar"
        @close-sidebar="closeSidebar"
        @new-game="startNewGame"
    >
        <GameMultiBoardLayout ref="multiBoardRef" />
    </GamePageShell>

    <GameSeoNoscript :lang="lang" mode="quordle" :seo="seo" />
</template>
