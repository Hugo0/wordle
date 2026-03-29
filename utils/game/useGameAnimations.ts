/**
 * Game board animation utilities.
 *
 * Extracted from the game store to decouple DOM manipulation from
 * Pinia state management. The store calls these functions and passes
 * in the DOM elements (obtained via template refs) rather than
 * querying the DOM directly.
 */

import { WORD_LENGTH } from '~/utils/types';

// ---------------------------------------------------------------------------
// Animation constants
// ---------------------------------------------------------------------------

const FLIP_DURATION = 500;
const FLIP_MIDPOINT = 250;
const FLIP_STAGGER = 200;

const BOUNCE_STAGGER = 150;
const BOUNCE_DURATION = 1000;

// ---------------------------------------------------------------------------
// Tile flip reveal animation
// ---------------------------------------------------------------------------

export interface RevealCallbacks {
    /** Called at midpoint for each tile — swap visual color and character. */
    onMidpoint: (tileIdx: number) => void;
    /** Called when all tiles have finished animating. */
    onComplete: () => void;
}

/**
 * Staggered flip animation for a completed row.
 *
 * RTL is handled by CSS `direction: rtl` on the tile grid, so the animation
 * always iterates in DOM order (0→4). CSS flips the visual direction.
 *
 * @param boardEl - The `.game-board` DOM element (from a template ref)
 * @param rowIndex - Which row to animate (0-based)
 * @param callbacks - Midpoint and completion callbacks
 */
export function animateRevealRow(
    boardEl: HTMLElement | null,
    rowIndex: number,
    callbacks: RevealCallbacks,
    speedMultiplier: number = 1
): void {
    const rowEl = boardEl?.children[rowIndex] as HTMLElement | undefined;
    const tileCount = rowEl?.children.length ?? WORD_LENGTH;
    const isSpeedMode = speedMultiplier < 1;
    // Skip animations for 8+ board modes (game store passes speedMultiplier >= 2)
    const isManyBoards = speedMultiplier >= 2;
    const reduceMotion =
        isManyBoards ||
        (typeof window !== 'undefined' &&
            (window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
                (!isSpeedMode &&
                    document.documentElement.classList.contains('reduce-animations'))));

    const flipDuration = Math.round(FLIP_DURATION * speedMultiplier);
    const flipMidpoint = Math.round(FLIP_MIDPOINT * speedMultiplier);
    const flipStagger = Math.round(FLIP_STAGGER * speedMultiplier);

    for (let t = 0; t < tileCount; t++) {
        const delay = reduceMotion ? 0 : t * flipStagger;

        setTimeout(() => {
            const tileEl = rowEl?.children[t] as HTMLElement | undefined;
            if (tileEl && !reduceMotion) {
                tileEl.style.animation = `flipReveal ${flipDuration}ms ease-in-out`;
            }

            // At midpoint (or immediately if reduced motion): swap visual state
            setTimeout(
                () => {
                    callbacks.onMidpoint(t);
                },
                reduceMotion ? 0 : flipMidpoint
            );

            // Clean up after animation
            setTimeout(
                () => {
                    if (tileEl) tileEl.style.animation = '';
                    if (t === tileCount - 1) callbacks.onComplete();
                },
                reduceMotion ? 0 : flipDuration
            );
        }, delay);
    }
}

// ---------------------------------------------------------------------------
// Keyboard key nudge animation
// ---------------------------------------------------------------------------

/**
 * Animate a keyboard key with a CSS animation class.
 *
 * @param keyboardEl - The keyboard container DOM element (from a template ref)
 * @param char - The character on the key to animate
 * @param animClass - CSS animation class name (e.g., 'key-pulse', 'key-shake')
 */
export function animateKeyNudge(
    keyboardEl: HTMLElement | null,
    char: string,
    animClass: string
): void {
    if (!keyboardEl) return;
    const el = keyboardEl.querySelector(`button[data-char="${CSS.escape(char)}"]`);
    if (!el) return;
    el.classList.remove(animClass);
    void (el as HTMLElement).offsetWidth; // Force reflow
    el.classList.add(animClass);
    el.addEventListener('animationend', () => el.classList.remove(animClass), {
        once: true,
    });
}
