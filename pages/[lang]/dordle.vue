<script setup lang="ts">
definePageMeta({ layout: 'game', key: (route) => `${route.params.lang}-dordle` });

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
} = await useMultiBoardModePage('dordle');
</script>

<template>
    <GamePageShell
        :lang="lang"
        :language-name="config?.name_native || config?.name || lang"
        current-mode="dordle"
        :title="modeDef.label"
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

    <noscript data-allow-mismatch>
        <div
            style="
                max-width: 600px;
                margin: 40px auto;
                padding: 20px;
                font-family: system-ui, sans-serif;
                color: #333;
            "
        >
            <h1>Wordle {{ config?.name_native }} — {{ modeDef.label }}</h1>
            <p>
                Play {{ modeDef.label }} in {{ config?.name }}. Solve
                {{ modeDef.boardCount }} boards at once with {{ modeDef.maxGuesses }} guesses.
            </p>
            <p>
                <a :href="`/${lang}`">Play the daily Wordle in {{ config?.name }}</a>
            </p>
        </div>
    </noscript>
</template>
