/**
 * Compute dayIdx from a Date. Same formula as server/lib/day-index.ts
 * but works on an arbitrary date (not "today").
 *
 * Used to recover dayIdx for historical localStorage imports so the
 * unique constraint on game_results can properly dedup daily plays.
 */

const EPOCH_OFFSET = 18992;
const WORDLE_OFFSET = 195;

export function dateToDayIdx(date: Date): number {
    const epoch = new Date(Date.UTC(1970, 0, 1));
    const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const nDays = Math.floor((utcDate.getTime() - epoch.getTime()) / (86400 * 1000));
    return nDays - EPOCH_OFFSET + WORDLE_OFFSET;
}
