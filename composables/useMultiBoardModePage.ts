/**
 * Shared setup for multi-board mode pages (Dordle through Duotrigordle).
 *
 * Synchronous-only — handles game page setup, SEO, multi-board init.
 * The async data fetching (useFetch) must stay in each page's <script setup>
 * because Nuxt's context-preserving compiler transform only works there,
 * not in extracted composable functions.
 */
import { GAME_MODE_CONFIG } from '~/utils/game-modes';
import type { GameMode } from '~/utils/game-modes';
import type { Ref } from 'vue';
import type { GameData } from '~/utils/types';

export function useMultiBoardModePage(
    mode: GameMode,
    lang: string,
    gameData: Ref<GameData | null>,
    allLangCodes?: string[]
) {
    const modeDef = GAME_MODE_CONFIG[mode];

    const { langStore, game, sidebarOpen, toggleSidebar, closeSidebar, config } = useGamePage(
        gameData,
        lang
    );

    const seo = useGameSeo({
        lang,
        mode,
        config: config.value!,
        langStore,
        allLangCodes,
    });

    const wordList = gameData.value?.daily_words?.length
        ? gameData.value.daily_words
        : (gameData.value?.word_list ?? []);

    const { multiBoardRef, startNewGame } = useMultiBoardPage(
        mode,
        wordList,
        modeDef.boardCount
    );

    return {
        lang,
        mode,
        modeDef,
        config,
        gameData,
        seo,
        sidebarOpen,
        toggleSidebar,
        closeSidebar,
        multiBoardRef,
        startNewGame,
    };
}
