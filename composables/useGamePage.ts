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
import { readLocal, writeLocal, STORAGE_KEYS } from '~/utils/storage';
import { buildStatsKey } from '~/utils/game-modes';

export function useGamePage(gameData: Ref<GameData | null>, lang: string) {
    const langStore = useLanguageStore();
    const game = useGameStore();
    const settings = useSettingsStore();
    const stats = useStatsStore();

    // Server sync — watches game/speed/settings state and syncs if logged in.
    // Runs in component setup context where useUserSession() is safe.
    useSync();

    // Initialize language store from API response (runs during SSR + client)
    if (gameData.value) {
        langStore.init(gameData.value);
    }

    // --- Sidebar state ---
    // Always starts closed — sidebar is a transient overlay, not a persistent layout element.
    // The hamburger icon is always visible for users to open it when needed.
    const sidebarOpen = ref(false);

    function toggleSidebar() {
        sidebarOpen.value = !sidebarOpen.value;
    }

    function closeSidebar() {
        sidebarOpen.value = false;
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
        // Pass board DOM ref to game store for animations
        // (keyboard ref is wired by GamePageShell)
        game.setBoardEl(() => gameBoardRef.value?.boardEl ?? null);

        // Keyboard event listener
        window.addEventListener('keydown', handleKeyDown);
        onUnmounted(() => {
            window.removeEventListener('keydown', handleKeyDown);
        });

        // Update preferred language — homepage reads this to detect the right language
        try { localStorage.setItem(STORAGE_KEYS.PREFERRED_LANGUAGE, lang); } catch {}

        // Initialize settings + stats. loadSpeedResults hydrates the
        // speed_results blob so finishSpeedSession() merges instead of clobbering.
        settings.init();
        stats.loadGameResults(langStore.languageCode);
        stats.loadSpeedResults();
        game.initTimingState();

        // Calculate stats for the current game mode so the stats modal has data on reload
        const statsKey = buildStatsKey(game.gameConfig);
        stats.calculateStats(statsKey, game.gameConfig.maxGuesses);
        stats.calculateTotalStats(); // Overall streak for header badge

        // Analytics initialization — shared across ALL game mode pages
        try {
            const analytics = useAnalytics();
            // Pageviews handled by PostHog's built-in $pageview (capture_pageview: 'history_change')
            // Register language + game_mode as super properties on all future PostHog events
            analytics.registerLanguage(langStore.languageCode);
            // Defer trackGameStart to nextTick so mode pages (unlimited, speed, etc.)
            // have a chance to set their gameConfig.mode in their own onMounted hooks first.
            nextTick(() => {
                analytics.registerGameMode(game.gameConfig.mode);
                // Only fire game_start when the game is actually playable
                if (!game.gameOver) {
                    analytics.trackGameStart({
                        language: langStore.languageCode,
                        is_returning: stats.stats.n_games > 0,
                        current_streak: stats.stats.current_streak,
                        game_mode: game.gameConfig.mode,
                        play_type: game.gameConfig.playType,
                    });
                }
            });
            analytics.trackPWASession(langStore.languageCode);

            // Referral tracking — detect ?r= param from shared links
            const route = useRoute();
            const shareResult = route.query.r as string | undefined;
            if (shareResult) {
                analytics.trackReferralLanding(langStore.languageCode, shareResult);
            }
            analytics.initAbandonTracking(() => ({
                language: langStore.languageCode,
                activeRow: game.activeRow,
                gameOver: game.gameOver,
                lastGuessValid: true,
                game_mode: game.gameConfig.mode,
            }));
            // Only identify new users — returning users are already identified
            // from a previous session (PostHog persists distinct_id in localStorage).
            // This saves ~$identify + $set events for every returning-user page load.
            const isNewUser = !readLocal('first_seen_date');
            const userProps = isNewUser
                ? analytics.identifyUser(stats.gameResults)
                : analytics.computeUserProperties(stats.gameResults);

            // Retention — merge returning_player + re_engagement into one event
            const lastPlayed = readLocal('last_played_date');
            const daysSinceLast = analytics.daysSince(lastPlayed ?? undefined);
            if (stats.stats.n_games > 0 && daysSinceLast !== undefined && daysSinceLast >= 1) {
                analytics.trackReturningPlayer(
                    langStore.languageCode,
                    daysSinceLast,
                    stats.stats.current_streak,
                    userProps.languagesPlayed.length
                );
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
            writeLocal('last_played_date', new Date().toISOString().split('T')[0]!);
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
