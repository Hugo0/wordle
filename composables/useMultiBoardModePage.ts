/**
 * Shared setup for multi-board mode pages (Dordle through Duotrigordle).
 *
 * Handles: data fetch, game page setup, SEO, hreflang, multi-board init.
 * Each page file just calls this and uses the returned values in the template.
 */
import { GAME_MODE_CONFIG } from '~/utils/game-modes';
import type { GameMode } from '~/utils/game-modes';

export async function useMultiBoardModePage(mode: GameMode) {
    const modeDef = GAME_MODE_CONFIG[mode];
    const route = useRoute();
    const lang = route.params.lang as string;

    const { data: gameData, error } = await useFetch(`/api/${lang}/data`);
    if (error.value || !gameData.value) {
        throw createError({ statusCode: 404, message: 'Language not found' });
    }

    const { langStore, game, sidebarOpen, toggleSidebar, closeSidebar, config } = useGamePage(
        gameData,
        lang
    );

    useGameModeSeo({
        lang,
        modeSlug: mode,
        modeLabel: modeDef.label,
        description: `Play ${modeDef.label} in ${config.value?.name}. Solve ${modeDef.boardCount} Wordle boards at once with ${modeDef.maxGuesses} guesses. Free, no account needed.`,
        langStore,
        config: config.value,
    });

    const { data: allLangs } = await useFetch('/api/languages');
    if (allLangs.value?.language_codes) useHreflang(allLangs.value.language_codes, `/${mode}`);

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
        sidebarOpen,
        toggleSidebar,
        closeSidebar,
        multiBoardRef,
        startNewGame,
    };
}
