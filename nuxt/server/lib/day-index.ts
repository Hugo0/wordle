/**
 * Day index calculation — shared between data-loader and word-selection.
 *
 * Extracted to its own module to break the circular dependency between
 * data-loader.ts (which needs getTodaysIdx at startup) and
 * word-selection.ts (which imports from data-loader).
 *
 * Formula: dayIdx = nDaysSinceEpoch - 18992 + 195
 * Matches Python: webapp/app.py get_todays_idx()
 */

/** Magic offset constants matching the Python implementation. */
const EPOCH_OFFSET = 18992;
const WORDLE_OFFSET = 195;

/**
 * Calculate the daily word index based on timezone.
 */
export function getTodaysIdx(timezone: string = 'UTC'): number {
    const now = new Date();
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
    const nDays = Math.floor(
        (localDate.getTime() - epoch.getTime()) / (86400 * 1000),
    );
    return nDays - EPOCH_OFFSET + WORDLE_OFFSET;
}

/**
 * Reverse of getTodaysIdx: convert a day index back to a calendar date.
 */
export function idxToDate(dayIdx: number): Date {
    const nDays = dayIdx + EPOCH_OFFSET - WORDLE_OFFSET;
    return new Date(Date.UTC(1970, 0, 1 + nDays));
}
