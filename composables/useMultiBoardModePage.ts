/**
 * Shared setup for multi-board mode pages (Dordle through Duotrigordle).
 *
 * Handles: data fetch, game page setup, SEO, hreflang, multi-board init.
 * Each page file just calls this and uses the returned values in the template.
 *
 * IMPORTANT: In Nuxt 3, the composable context (Nuxt instance) is lost after
 * any `await`. All composable calls that need context (useGameStore, etc.)
 * must happen BEFORE the first await, or use callWithNuxt().
 * We solve this by fetching data first, then calling all composables after.
 */
import { GAME_MODE_CONFIG } from '~/utils/game-modes';
import type { GameMode } from '~/utils/game-modes';

export async function useMultiBoardModePage(mode: GameMode) {
    const modeDef = GAME_MODE_CONFIG[mode];
    const route = useRoute();
    const lang = route.params.lang as string;
    const nuxtApp = useNuxtApp();

    // --- Fetch data (these are the awaits that lose context) ---
    const { data: gameData, error } = await useFetch(`/api/${lang}/data`);
    if (error.value || !gameData.value) {
        const isNetworkError = error.value && !error.value.statusCode;
        throw createError({
            statusCode: isNetworkError ? 500 : 404,
            message: isNetworkError ? 'Failed to load game data' : 'Language not found',
        });
    }

    const { data: allLangs } = await useFetch('/api/languages');

    // --- All composable calls after awaits must use callWithNuxt ---
    return callWithNuxt(nuxtApp, () => {
        const { langStore, game, sidebarOpen, toggleSidebar, closeSidebar, config } = useGamePage(
            gameData,
            lang
        );

        const seo = useGameSeo({
            lang,
            mode,
            config: config.value!,
            langStore,
            allLangCodes: allLangs.value?.language_codes,
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
    });
}
