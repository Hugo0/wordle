<script setup lang="ts">
definePageMeta({ layout: 'game', key: (route) => `${route.params.lang}-duotrigordle` });

const {
    lang,
    modeDef,
    config,
    sidebarOpen,
    toggleSidebar,
    closeSidebar,
    multiBoardRef,
    startNewGame,
    gameData,
    seo,
} = await useMultiBoardModePage('duotrigordle');
</script>

<template>
    <GamePageShell
        :lang="lang"
        :language-name="config?.name_native || config?.name || lang"
        current-mode="duotrigordle"
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

    <GameSeoNoscript :lang="lang" mode="duotrigordle" :seo="seo" />
</template>
