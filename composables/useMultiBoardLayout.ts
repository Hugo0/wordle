/**
 * Responsive layout config for multi-board modes.
 *
 * All boards are always rendered (no pagination). The container scrolls
 * vertically when boards overflow. Grid columns are chosen to balance
 * readable tile size with good space utilization.
 *
 * Key constraint: mobile (< 640px) always gets max 2 columns.
 * Desktop can go up to 4 cols (keyboard-aligned) or more for 16+ boards.
 */

export interface MultiBoardLayoutConfig {
    gridCols: number;
    visibleRows: number;
    scrollable: boolean;
}

const TILES_PER_WORD = 5;
const GAP_PX = 6;

// Target tile size ranges — the composable picks columns to land tiles in this range
const TARGET_TILE_MIN = 18; // below this, tiles are hard to read
const TARGET_TILE_MAX = 44; // above this, tiles waste space

export function useMultiBoardLayout(
    boardCount: Ref<number>,
    maxGuesses: Ref<number>,
    containerWidth: Ref<number>
) {
    return computed<MultiBoardLayoutConfig>(() => {
        const bc = boardCount.value;
        const mg = maxGuesses.value;
        const w = containerWidth.value;
        const isMobile = w < 640;

        // Dordle/Quordle: always 2 cols, fit in view
        if (bc <= 4) return { gridCols: 2, visibleRows: 0, scrollable: false };

        // For 8+ boards with many guesses, collapse rows by default.
        // The expand button lets users see all rows.
        const visRows = mg > 9 ? 7 : 0;

        // Mobile: always 2 cols for 8+ boards (scrollable)
        if (isMobile) {
            return { gridCols: 2, visibleRows: visRows, scrollable: true };
        }

        // Desktop 8+ boards: find the column count that puts tiles closest
        // to the target range. Try all valid column counts.
        let bestCols = 2;
        let bestScore = -Infinity;

        for (let cols = Math.min(bc, 8); cols >= 2; cols--) {
            // Prefer symmetric grids (even rows)
            if (bc % cols !== 0) continue;

            const totalTileCols = cols * TILES_PER_WORD;
            const gaps = (cols - 1) * GAP_PX + 16;
            const tileW = (w - gaps) / totalTileCols;

            if (tileW < TARGET_TILE_MIN) continue; // too small

            // Score: prefer tile sizes in the middle of the target range
            const midTarget = (TARGET_TILE_MIN + TARGET_TILE_MAX) / 2;
            const clamped = Math.min(tileW, TARGET_TILE_MAX);
            const score = -Math.abs(clamped - midTarget); // closer to mid = better

            if (score > bestScore) {
                bestScore = score;
                bestCols = cols;
            }
        }

        const rows = Math.ceil(bc / bestCols);
        return { gridCols: bestCols, visibleRows: visRows, scrollable: rows > 2 };
    });
}
