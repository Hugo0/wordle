/**
 * Day index calculation — shared between data-loader and word-selection.
 *
 * Extracted to its own module to break the circular dependency between
 * data-loader.ts (which needs getTodaysIdx at startup) and
 * word-selection.ts (which imports from data-loader).
 *
 * Formula: dayIdx = nDaysSinceEpoch - 18992 + 195
 * Matches Python: scripts/word_pipeline/freeze.py get_todays_idx()
 */

/** Magic offset constants matching the Python implementation. */
const EPOCH_OFFSET = 18992;
const WORDLE_OFFSET = 195;

/**
 * Calculate the daily word index based on timezone.
 * Set DATE_OVERRIDE env var (e.g. "2026-04-15") to simulate a different date.
 */
export function getTodaysIdx(timezone: string = 'UTC'): number {
    const override = process.env.DATE_OVERRIDE;
    const now = override ? new Date(`${override}T12:00:00Z`) : new Date();
    let dateStr: string;
    try {
        const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });
        dateStr = formatter.format(now); // "YYYY-MM-DD"
    } catch {
        dateStr = now.toISOString().slice(0, 10);
    }
    const [y, m, d] = dateStr.split('-').map(Number);
    const localDate = new Date(Date.UTC(y!, m! - 1, d!));
    const epoch = new Date(Date.UTC(1970, 0, 1));
    const nDays = Math.floor((localDate.getTime() - epoch.getTime()) / (86400 * 1000));
    return nDays - EPOCH_OFFSET + WORDLE_OFFSET;
}

/**
 * Reverse of getTodaysIdx: convert a day index back to a calendar date.
 */
export function idxToDate(dayIdx: number): Date {
    const nDays = dayIdx + EPOCH_OFFSET - WORDLE_OFFSET;
    return new Date(Date.UTC(1970, 0, 1 + nDays));
}

// ---------------------------------------------------------------------------
// New mode day index — 1-based starting April 11 2026
// ---------------------------------------------------------------------------

/** April 11 2026 in the classic day-index coordinate space. */
const NEW_MODES_EPOCH_IDX = (() => {
    const epoch = new Date(Date.UTC(1970, 0, 1));
    const launch = new Date(Date.UTC(2026, 3, 11)); // April 11, 2026
    const nDays = Math.floor((launch.getTime() - epoch.getTime()) / (86400 * 1000));
    return nDays - EPOCH_OFFSET + WORDLE_OFFSET;
})();

/**
 * Convert a classic day index to a 1-based index for new game modes.
 * New modes (speed daily, semantic, multi-board daily) launched April 11 2026.
 * Returns 1 on launch day, 2 on April 12, etc.
 * Returns null for dates before launch.
 */
export function toModeDayIdx(classicIdx: number): number | null {
    const idx = classicIdx - NEW_MODES_EPOCH_IDX + 1;
    return idx >= 1 ? idx : null;
}

/**
 * Convert a mode day index (1-based from April 11 2026) back to a classic index.
 */
export function fromModeDayIdx(modeIdx: number): number {
    return modeIdx + NEW_MODES_EPOCH_IDX - 1;
}
