/**
 * Shared composable for ALL game mode pages.
 *
 * Handles everything common across Classic, Unlimited, Dordle, Tridle, Quordle, Speed:
 *   - langStore.init() from API response
 *   - Sidebar state (init + toggle)
 *   - Template refs for board/keyboard DOM
 *   - Keyboard event handler setup + cleanup
 *   - Settings & stats store init
 *
 * Each page calls `useGamePage(gameData, lang)` after `useFetch`, then uses the
 * returned refs/stores to wire up its mode-specific logic.
 */
import type { Ref } from 'vue';
import type { GameData } from '~/utils/types';
import { buildStatsKey } from '~/utils/game-modes';

const SIDEBAR_STORAGE_KEY = 'sidebar_open';

export function useGamePage(gameData: Ref<GameData | null>, lang: string) {
    const langStore = useLanguageStore();
    const game = useGameStore();
    const settings = useSettingsStore();
    const stats = useStatsStore();

    // Initialize language store from API response (runs during SSR + client)
    if (gameData.value) {
        langStore.init(gameData.value);
    }

    // --- Sidebar state ---
    const sidebarOpen = ref(false);

    function initSidebar() {
        // Game pages default to closed — users discover via hamburger icon.
        // Respect explicit localStorage preference from prior toggle.
        try {
            const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
            sidebarOpen.value = stored === 'true';
        } catch {
            sidebarOpen.value = false;
        }
    }

    function toggleSidebar() {
        sidebarOpen.value = !sidebarOpen.value;
        persistSidebar();
    }

    function closeSidebar() {
        sidebarOpen.value = false;
        persistSidebar();
    }

    function persistSidebar() {
        try {
            localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarOpen.value));
        } catch {
            // localStorage unavailable
        }
    }

    // --- Template ref for board (keyboard ref is owned by GamePageShell) ---
    const gameBoardRef = ref<{ boardEl: HTMLElement | null } | null>(null);

    // --- Keyboard handler ---
    function handleKeyDown(e: KeyboardEvent) {
        // Don't handle if a modal is open and it's not Escape
        if (
            e.key !== 'Escape' &&
            (game.showHelpModal || game.showStatsModal || game.showOptionsModal)
        ) {
            return;
        }
        // Speed mode: block input during countdown/finished
        if (game.gameConfig.mode === 'speed' && game.speedState.countdownPhase !== 'playing') {
            if (e.key === 'Escape') {
                game.showHelpModal = false;
                game.showStatsModal = false;
                game.showOptionsModal = false;
            }
            return;
        }
        game.keyDown(e);
    }

    // --- Config shorthand ---
    const config = computed(() => gameData.value?.config);

    // --- Lifecycle ---
    onMounted(() => {
        initSidebar();

        // Pass board DOM ref to game store for animations
        // (keyboard ref is wired by GamePageShell)
        game.setBoardEl(() => gameBoardRef.value?.boardEl ?? null);

        // Keyboard event listener
        window.addEventListener('keydown', handleKeyDown);
        onUnmounted(() => {
            window.removeEventListener('keydown', handleKeyDown);
        });

        // Initialize settings + stats
        settings.init();
        stats.loadGameResults(langStore.languageCode);
        game.initTimingState();

        // Calculate stats for the current game mode so the stats modal has data on reload
        const statsKey = buildStatsKey(game.gameConfig);
        stats.calculateStats(statsKey, game.gameConfig.maxGuesses);

        // Analytics initialization — shared across ALL game mode pages
        try {
            const analytics = useAnalytics();
            // Pageviews handled by PostHog's built-in $pageview (capture_pageview: 'history_change')
            // Register language + game_mode as super properties on all future PostHog events
            analytics.registerLanguage(langStore.languageCode);
            analytics.registerGameMode(game.gameConfig.mode);
            // Defer trackGameStart to nextTick so mode pages (unlimited, speed, etc.)
            // have a chance to set their gameConfig.mode in their own onMounted hooks first.
            nextTick(() => {
                analytics.registerGameMode(game.gameConfig.mode);
                analytics.trackGameStart({
                    language: langStore.languageCode,
                    is_returning: stats.stats.n_games > 0,
                    current_streak: stats.stats.current_streak,
                    game_mode: game.gameConfig.mode,
                });
            });
            analytics.trackPWASession(langStore.languageCode);
            analytics.initAbandonTracking(() => ({
                language: langStore.languageCode,
                activeRow: game.activeRow,
                gameOver: game.gameOver,
                lastGuessValid: true,
                game_mode: game.gameConfig.mode,
            }));
            const userProps = analytics.identifyUser(stats.gameResults);

            // Retention events — based on last_played_date in localStorage
            const lastPlayed = localStorage.getItem('last_played_date');
            const daysSinceLast = analytics.daysSince(lastPlayed ?? undefined);
            if (stats.stats.n_games > 0 && daysSinceLast !== undefined && daysSinceLast >= 1) {
                analytics.trackReturningPlayer(
                    langStore.languageCode,
                    daysSinceLast,
                    stats.stats.current_streak,
                    userProps.languagesPlayed.length
                );
                if (daysSinceLast >= 7) {
                    analytics.trackReEngagement(langStore.languageCode, daysSinceLast);
                }
            }

            // Multi-language: detect first play of a new language
            if (
                userProps.languagesPlayed.length >= 1 &&
                !userProps.languagesPlayed.includes(langStore.languageCode)
            ) {
                analytics.trackSecondLanguageStart(
                    langStore.languageCode,
                    userProps.languagesPlayed
                );
            }

            // Update last_played_date for future sessions
            localStorage.setItem('last_played_date', new Date().toISOString().split('T')[0]!);
        } catch {
            // Analytics should never break the app
        }
    });

    return {
        langStore,
        game,
        settings,
        stats,
        sidebarOpen,
        toggleSidebar,
        closeSidebar,
        gameBoardRef,
        config,
    };
}
