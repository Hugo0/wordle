/**
 * Game share/clipboard composable.
 *
 * Single source of truth for sharing game results via Web Share API,
 * clipboard, or legacy execCommand fallback. Used by:
 *   - stores/game.ts (classic/unlimited/multi-board share)
 *   - pages/[lang]/speed.vue (speed streak share)
 */
import type { TileColor } from '~/utils/types';
import { rowToEmoji } from '~/utils/types';

export function useGameShare() {
    /** Generate the emoji grid from tile colors. */
    function buildEmojiBoard(
        tileColors: TileColor[][],
        highContrast: boolean
    ): { board: string; attemptCount: string } {
        const rows: string[] = [];
        let attemptCount = '0';

        for (let i = 0; i < tileColors.length; i++) {
            const row = tileColors[i];
            if (!row) continue;
            const emoji = rowToEmoji(row, highContrast);
            if (emoji === null) {
                attemptCount = String(i);
                return { board: rows.join('\n'), attemptCount };
            }
            rows.push(emoji);
            attemptCount = String(i + 1);
        }

        return { board: rows.join('\n'), attemptCount };
    }

    /**
     * Share results via Web Share API, clipboard, or legacy execCommand fallback.
     * Fires a single 'share' analytics event with result: 'success' or 'fail'.
     */
    async function shareResults(opts: {
        shareText: string;
        langCode: string;
        gameWon: boolean;
        attempts: string;
        emojiBoard: string;
        gameMode?: string;
        onNotify?: (message: string) => void;
        onSuccess?: () => void;
        onAllFailed?: (text: string) => void;
    }): Promise<void> {
        if (!import.meta.client) return;

        const analytics = useAnalytics();
        const modePath = opts.gameMode && opts.gameMode !== 'classic' ? `/${opts.gameMode}` : '';
        const url = `https://wordle.global/${opts.langCode}${modePath}?r=${opts.gameWon ? opts.attempts : 'x'}`;
        const fullText = `${opts.shareText}\n\n${url}`;

        const baseParams = {
            language: opts.langCode,
            won: opts.gameWon,
            attempts: opts.attempts,
            game_mode: opts.gameMode,
        };

        const trackSuccess = (method: 'native' | 'clipboard' | 'fallback') => {
            analytics.trackShare({
                ...baseParams,
                method,
                result: 'success',
                emojiPattern: opts.emojiBoard,
            });
            opts.onSuccess?.();
        };

        const trackFail = (method: 'native' | 'clipboard' | 'fallback', errorType: string) => {
            analytics.trackShare({
                ...baseParams,
                method,
                result: 'fail',
                error_type: errorType,
            });
        };

        // Try Web Share API
        if (navigator.share) {
            try {
                await navigator.share({ text: fullText });
                opts.onNotify?.('Shared!');
                trackSuccess('native');
                return;
            } catch (error) {
                if (error instanceof Error && error.name === 'AbortError') return;
                trackFail('native', 'share_api_failed');
            }
        }

        // Try Clipboard API
        if (navigator.clipboard?.writeText && window.isSecureContext) {
            try {
                await navigator.clipboard.writeText(fullText);
                opts.onNotify?.('Copied to clipboard!');
                trackSuccess('clipboard');
                return;
            } catch (error) {
                if (error instanceof Error) {
                    trackFail('clipboard', error.message);
                }
            }
        }

        // Legacy execCommand fallback
        if (copyViaExecCommand(fullText)) {
            opts.onNotify?.('Copied to clipboard!');
            trackSuccess('fallback');
            return;
        }

        trackFail('fallback', 'all_methods_failed');
        opts.onAllFailed?.(fullText);
    }

    /** Copy text via legacy execCommand. Returns true on success. */
    function copyViaExecCommand(text: string): boolean {
        if (!import.meta.client) return false;
        try {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.cssText = 'position:fixed;top:0;left:0;width:2em;height:2em;opacity:0;';
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();
            textarea.setSelectionRange(0, text.length);
            const success = document.execCommand('copy');
            document.body.removeChild(textarea);
            return success;
        } catch {
            return false;
        }
    }

    return {
        buildEmojiBoard,
        shareResults,
    };
}
