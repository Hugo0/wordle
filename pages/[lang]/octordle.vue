<script setup lang="ts">
definePageMeta({ layout: 'game', key: (route) => `${route.params.lang}-octordle` });

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
} = await useMultiBoardModePage('octordle');
</script>

<template>
    <GamePageShell
        :lang="lang"
        :language-name="config?.name_native || config?.name || lang"
        current-mode="octordle"
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

    <GameSeoNoscript :lang="lang" mode="octordle" :seo="seo" />
</template>
