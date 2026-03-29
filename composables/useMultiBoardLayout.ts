/**
 * Responsive layout config for multi-board modes.
 *
 * All boards are always rendered (no pagination). The container scrolls
 * vertically when boards overflow. The composable determines grid columns,
 * visible row truncation, and scroll behavior based on board count + viewport.
 */

export interface MultiBoardLayoutConfig {
    /** CSS grid columns */
    gridCols: number;
    /** Max visible rows per board (0 = show all rows) */
    visibleRows: number;
    /** Whether boards need vertical scrolling */
    scrollable: boolean;
}

// Min tile width in px for readable letters
const MIN_TILE_MOBILE = 20;
const MIN_TILE_DESKTOP = 16;
const TILES_PER_WORD = 5;
const GAP_PX = 6;

// All rows shown by default — no truncation. Users can click to focus a board.

export function useMultiBoardLayout(
    boardCount: Ref<number>,
    maxGuesses: Ref<number>,
    containerWidth: Ref<number>
) {
    return computed<MultiBoardLayoutConfig>(() => {
        const bc = boardCount.value;
        const mg = maxGuesses.value;
        const w = containerWidth.value;
        const minTile = w < 768 ? MIN_TILE_MOBILE : MIN_TILE_DESKTOP;

        // Dordle/Quordle: always 2 cols, full rows, no scroll
        if (bc <= 4) return { gridCols: 2, visibleRows: 0, scrollable: false };

        // 8+ boards: find max columns where tiles stay readable.
        // Cap at 4 cols — more than 4 creates visual disconnect with the
        // centered keyboard and makes individual boards too small to track.
        const maxCols = Math.min(bc, 4);
        let bestCols = 2;

        for (let cols = maxCols; cols >= 2; cols--) {
            if (bc % cols !== 0 && cols !== bestCols) continue;
            const totalTileCols = cols * TILES_PER_WORD;
            const gaps = (cols - 1) * GAP_PX + 16;
            const tileW = (w - gaps) / totalTileCols;
            if (tileW >= minTile) {
                bestCols = cols;
                break;
            }
        }

        const rows = Math.ceil(bc / bestCols);

        return { gridCols: bestCols, visibleRows: 0, scrollable: rows > 2 };
    });
}
