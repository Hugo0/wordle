/**
 * Game share/clipboard composable.
 *
 * Single source of truth for sharing game results via Web Share API,
 * clipboard, or legacy execCommand fallback. Used by:
 *   - stores/game.ts (classic/unlimited/multi-board share)
 *   - pages/[lang]/speed.vue (speed streak share)
 */
import { ref } from 'vue';
import type { TileColor } from '~/utils/types';

export function useGameShare() {
    const shareButtonState = ref<'idle' | 'success'>('idle');

    /** Generate the emoji grid from tile colors. */
    function buildEmojiBoard(
        tileColors: TileColor[][],
        highContrast: boolean
    ): { board: string; attemptCount: string } {
        let board = '';
        let attemptCount = '0';
        const greenEmoji = highContrast ? '🟦' : '🟩';
        const yellowEmoji = highContrast ? '🟧' : '🟨';

        for (let i = 0; i < tileColors.length; i++) {
            const row = tileColors[i];
            if (!row) continue;

            for (const color of row) {
                if (color === 'correct') {
                    board += greenEmoji;
                } else if (color === 'semicorrect') {
                    board += yellowEmoji;
                } else if (color === 'incorrect') {
                    board += '⬜';
                } else {
                    attemptCount = String(i);
                    return { board, attemptCount };
                }
            }
            if (i < tileColors.length - 1) board += '\n';
            attemptCount = String(i + 1);
        }

        return { board, attemptCount };
    }

    /** Build the full share text for classic/multi-board modes. */
    function getShareText(opts: {
        emojiBoard: string;
        attempts: string;
        todaysIdx: number;
        namaNative: string;
        hardMode: boolean;
        gameWon: boolean;
    }): string {
        const hardModeFlag = opts.hardMode ? ' *' : '';
        return `Wordle ${opts.namaNative} #${opts.todaysIdx} — ${opts.attempts}/6${hardModeFlag}\n\n${opts.emojiBoard}`;
    }

    /**
     * Share results via Web Share API, clipboard, or legacy execCommand fallback.
     *
     * Callbacks allow callers to handle notifications and final fallback UI:
     *   - onNotify: called on successful copy with a suggested message
     *   - onAllFailed: called when all share methods fail (e.g., show a manual copy modal)
     */
    async function shareResults(opts: {
        shareText: string;
        langCode: string;
        gameWon: boolean;
        attempts: string;
        emojiBoard: string;
        gameMode?: string;
        onNotify?: (message: string) => void;
        onAllFailed?: (text: string) => void;
    }): Promise<void> {
        if (!import.meta.client) return;

        const analytics = useAnalytics();
        const modePath = opts.gameMode && opts.gameMode !== 'classic' ? `/${opts.gameMode}` : '';
        const url = `https://wordle.global/${opts.langCode}${modePath}?r=${opts.gameWon ? opts.attempts : 'x'}`;
        const fullText = `${opts.shareText}\n\n${url}`;

        const shareParams = {
            language: opts.langCode,
            won: opts.gameWon,
            attempts: opts.attempts,
            game_mode: opts.gameMode,
        };

        const onSuccess = (method: 'native' | 'clipboard' | 'fallback') => {
            shareButtonState.value = 'success';
            analytics.trackShareSuccess({ ...shareParams, method });
            if (opts.emojiBoard) {
                analytics.trackShareContentGenerated(
                    opts.langCode,
                    opts.gameWon,
                    opts.attempts,
                    opts.emojiBoard
                );
            }
            setTimeout(() => {
                shareButtonState.value = 'idle';
            }, 2000);
        };

        // Try Web Share API
        if (navigator.share) {
            analytics.trackShareClick({ ...shareParams, method: 'native' });
            try {
                await navigator.share({ text: fullText });
                opts.onNotify?.('Shared!');
                onSuccess('native');
                return;
            } catch (error) {
                if (error instanceof Error && error.name === 'AbortError') return;
                analytics.trackShareFail(opts.langCode, 'native', 'share_api_failed');
            }
        }

        // Try Clipboard API
        if (navigator.clipboard?.writeText && window.isSecureContext) {
            analytics.trackShareClick({ ...shareParams, method: 'clipboard' });
            try {
                await navigator.clipboard.writeText(fullText);
                opts.onNotify?.('Copied to clipboard!');
                onSuccess('clipboard');
                return;
            } catch (error) {
                if (error instanceof Error) {
                    analytics.trackShareFail(opts.langCode, 'clipboard', error.message);
                }
            }
        }

        // Legacy execCommand fallback
        analytics.trackShareClick({ ...shareParams, method: 'fallback' });
        if (copyViaExecCommand(fullText)) {
            opts.onNotify?.('Copied to clipboard!');
            onSuccess('fallback');
            return;
        }

        analytics.trackShareFail(opts.langCode, 'fallback', 'all_methods_failed');
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
        shareButtonState,
        buildEmojiBoard,
        getShareText,
        shareResults,
    };
}
