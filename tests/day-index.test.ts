/**
 * Tests for day index calculation — classic (Wordle-compatible) and
 * new mode indexes (1-based from April 11 2026 launch).
 */
import { describe, it, expect } from 'vitest';
import { getTodaysIdx, idxToDate, toModeDayIdx, fromModeDayIdx } from '../server/lib/day-index';

// ---------------------------------------------------------------------------
// Classic day index (unchanged, backward-compatible)
// ---------------------------------------------------------------------------

describe('getTodaysIdx', () => {
    it('returns a positive integer', () => {
        const idx = getTodaysIdx();
        expect(idx).toBeGreaterThan(0);
        expect(Number.isInteger(idx)).toBe(true);
    });

    it('returns same value for UTC timezone', () => {
        const a = getTodaysIdx('UTC');
        const b = getTodaysIdx('UTC');
        expect(a).toBe(b);
    });

    it('falls back gracefully for invalid timezone', () => {
        const idx = getTodaysIdx('Invalid/Zone');
        expect(idx).toBeGreaterThan(0);
    });
});

describe('idxToDate', () => {
    it('round-trips with getTodaysIdx', () => {
        const idx = getTodaysIdx('UTC');
        const date = idxToDate(idx);
        const today = new Date();
        expect(date.getUTCFullYear()).toBe(today.getUTCFullYear());
        expect(date.getUTCMonth()).toBe(today.getUTCMonth());
        expect(date.getUTCDate()).toBe(today.getUTCDate());
    });

    it('known date: March 19 2026 = index 1734', () => {
        const date = idxToDate(1734);
        expect(date.getUTCFullYear()).toBe(2026);
        expect(date.getUTCMonth()).toBe(2); // 0-indexed March
        expect(date.getUTCDate()).toBe(19);
    });

    it('consecutive indexes are 1 day apart', () => {
        const d1 = idxToDate(1000);
        const d2 = idxToDate(1001);
        const diffMs = d2.getTime() - d1.getTime();
        expect(diffMs).toBe(86400 * 1000);
    });
});

// ---------------------------------------------------------------------------
// New mode day index (1-based from April 11 2026)
// ---------------------------------------------------------------------------

describe('toModeDayIdx', () => {
    // April 11 2026 has classic index 1757
    const LAUNCH_CLASSIC_IDX = 1757;

    it('returns 1 on launch day (April 11 2026)', () => {
        expect(toModeDayIdx(LAUNCH_CLASSIC_IDX)).toBe(1);
    });

    it('returns 2 on April 12 2026', () => {
        expect(toModeDayIdx(LAUNCH_CLASSIC_IDX + 1)).toBe(2);
    });

    it('returns 100 on day 100', () => {
        expect(toModeDayIdx(LAUNCH_CLASSIC_IDX + 99)).toBe(100);
    });

    it('returns null for day before launch (April 10)', () => {
        expect(toModeDayIdx(LAUNCH_CLASSIC_IDX - 1)).toBeNull();
    });

    it('returns null for far past dates', () => {
        expect(toModeDayIdx(100)).toBeNull();
        expect(toModeDayIdx(0)).toBeNull();
    });

    it('does NOT affect classic index (classic stays at 1757+)', () => {
        // Classic game page uses todays_idx directly, not toModeDayIdx
        const classicIdx = getTodaysIdx('UTC');
        expect(classicIdx).toBeGreaterThan(1700);
    });

    it('increments by 1 per day', () => {
        const day1 = toModeDayIdx(LAUNCH_CLASSIC_IDX)!;
        const day2 = toModeDayIdx(LAUNCH_CLASSIC_IDX + 1)!;
        const day30 = toModeDayIdx(LAUNCH_CLASSIC_IDX + 29)!;
        expect(day2 - day1).toBe(1);
        expect(day30 - day1).toBe(29);
    });
});

describe('fromModeDayIdx', () => {
    const LAUNCH_CLASSIC_IDX = 1757;

    it('round-trips with toModeDayIdx', () => {
        for (const modeIdx of [1, 2, 10, 100, 365]) {
            const classicIdx = fromModeDayIdx(modeIdx);
            expect(toModeDayIdx(classicIdx)).toBe(modeIdx);
        }
    });

    it('mode day 1 maps to launch classic index', () => {
        expect(fromModeDayIdx(1)).toBe(LAUNCH_CLASSIC_IDX);
    });

    it('converts back to a date that is April 11 + offset', () => {
        const date = idxToDate(fromModeDayIdx(1));
        expect(date.getUTCFullYear()).toBe(2026);
        expect(date.getUTCMonth()).toBe(3); // 0-indexed April
        expect(date.getUTCDate()).toBe(11);

        const date30 = idxToDate(fromModeDayIdx(30));
        expect(date30.getUTCMonth()).toBe(4); // May
        expect(date30.getUTCDate()).toBe(10); // April 11 + 29 days = May 10
    });
});
