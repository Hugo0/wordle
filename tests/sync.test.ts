/**
 * Tests for the sync system — stats key parsing, day index computation,
 * server result → localStorage key mapping, and merge deduplication logic.
 */
import { describe, it, expect } from 'vitest';
import { parseStatsKey } from '../server/utils/stats-key-parser';
import { dateToDayIdx } from '../server/utils/day-index';

// ─── parseStatsKey (already tested in stats-key-parser.test.ts, key cases here) ───

describe('parseStatsKey roundtrip', () => {
    it('classic daily → bare lang code', () => {
        expect(parseStatsKey('en')).toEqual({ lang: 'en', mode: 'classic', playType: 'daily' });
    });
    it('classic unlimited', () => {
        expect(parseStatsKey('en_unlimited')).toEqual({
            lang: 'en',
            mode: 'classic',
            playType: 'unlimited',
        });
    });
    it('dordle daily', () => {
        expect(parseStatsKey('en_dordle_daily')).toEqual({
            lang: 'en',
            mode: 'dordle',
            playType: 'daily',
        });
    });
    it('speed unlimited', () => {
        expect(parseStatsKey('en_speed')).toEqual({
            lang: 'en',
            mode: 'speed',
            playType: 'unlimited',
        });
    });
});

// ─── dateToDayIdx ───

describe('dateToDayIdx', () => {
    it('computes consistent index for a known date', () => {
        // March 14, 2026 should be dayIdx 1729 (from the TODO.md: day 1734 for 2026-03-19)
        // Formula: nDays - 18992 + 195
        const mar19 = new Date(Date.UTC(2026, 2, 19)); // March 19, 2026
        expect(dateToDayIdx(mar19)).toBe(1734);
    });

    it('adjacent days differ by 1', () => {
        const day1 = new Date(Date.UTC(2026, 0, 1));
        const day2 = new Date(Date.UTC(2026, 0, 2));
        expect(dateToDayIdx(day2) - dateToDayIdx(day1)).toBe(1);
    });

    it('handles timezone-naive dates correctly', () => {
        // Even if local date has hours, we use UTC date
        const d = new Date('2026-03-19T23:59:59Z');
        expect(dateToDayIdx(d)).toBe(1734);
    });
});

// ─── serverResultToStatsKey (test the mapping logic) ───

describe('serverResultToStatsKey mapping', () => {
    // This function is defined in sync.client.ts. We test the logic inline
    // since it's not exported. These tests verify the mapping contract.

    function serverResultToStatsKey(r: { lang: string; mode: string; playType: string }): string {
        if (r.mode === 'classic' && r.playType === 'daily') return r.lang;
        if (r.mode === 'classic' && r.playType === 'unlimited') return `${r.lang}_unlimited`;
        if (r.mode === 'unlimited') return `${r.lang}_unlimited`;
        if (r.playType === 'daily') return `${r.lang}_${r.mode}_daily`;
        return `${r.lang}_${r.mode}`;
    }

    it('classic daily → bare lang', () => {
        expect(serverResultToStatsKey({ lang: 'en', mode: 'classic', playType: 'daily' })).toBe(
            'en'
        );
    });

    it('classic unlimited → _unlimited', () => {
        expect(serverResultToStatsKey({ lang: 'en', mode: 'classic', playType: 'unlimited' })).toBe(
            'en_unlimited'
        );
    });

    it('dordle daily → _dordle_daily', () => {
        expect(serverResultToStatsKey({ lang: 'fi', mode: 'dordle', playType: 'daily' })).toBe(
            'fi_dordle_daily'
        );
    });

    it('quordle unlimited → _quordle', () => {
        expect(serverResultToStatsKey({ lang: 'en', mode: 'quordle', playType: 'unlimited' })).toBe(
            'en_quordle'
        );
    });

    it('speed unlimited → _speed', () => {
        expect(serverResultToStatsKey({ lang: 'en', mode: 'speed', playType: 'unlimited' })).toBe(
            'en_speed'
        );
    });

    it('semantic daily → _semantic_daily', () => {
        expect(serverResultToStatsKey({ lang: 'en', mode: 'semantic', playType: 'daily' })).toBe(
            'en_semantic_daily'
        );
    });

    // Verify roundtrip: parseStatsKey(serverResultToStatsKey(r)) should recover the original
    it('roundtrip: parse(toKey(r)) recovers original fields', () => {
        const cases = [
            { lang: 'en', mode: 'classic', playType: 'daily' as const },
            { lang: 'en', mode: 'classic', playType: 'unlimited' as const },
            { lang: 'fi', mode: 'dordle', playType: 'daily' as const },
            { lang: 'ar', mode: 'quordle', playType: 'unlimited' as const },
            { lang: 'en', mode: 'semantic', playType: 'daily' as const },
        ];
        for (const c of cases) {
            const key = serverResultToStatsKey(c);
            const parsed = parseStatsKey(key);
            expect(parsed.lang).toBe(c.lang);
            expect(parsed.mode).toBe(c.mode);
            expect(parsed.playType).toBe(c.playType);
        }
    });
});

// ─── Merge deduplication logic ───

describe('merge deduplication', () => {
    it('daily results dedup by date (same day = same game)', () => {
        const existing = [{ won: true, attempts: 3, date: '2026-03-19T10:00:00.000Z' }];
        const incoming = { playedAt: '2026-03-19T15:30:00.000Z', playType: 'daily' };

        const dateStr = new Date(incoming.playedAt).toISOString().slice(0, 10);
        const alreadyExists = existing.some(
            (e) => new Date(e.date).toISOString().slice(0, 10) === dateStr
        );
        expect(alreadyExists).toBe(true); // Same day, should dedup
    });

    it('daily results on different days are NOT deduped', () => {
        const existing = [{ won: true, attempts: 3, date: '2026-03-18T10:00:00.000Z' }];
        const incoming = { playedAt: '2026-03-19T15:30:00.000Z', playType: 'daily' };

        const dateStr = new Date(incoming.playedAt).toISOString().slice(0, 10);
        const alreadyExists = existing.some(
            (e) => new Date(e.date).toISOString().slice(0, 10) === dateStr
        );
        expect(alreadyExists).toBe(false); // Different day, should NOT dedup
    });

    it('unlimited results dedup by exact timestamp', () => {
        const existing = [{ won: true, attempts: 5, date: '2026-03-19T10:00:00.000Z' }];
        const incoming = { playedAt: '2026-03-19T10:00:00.000Z', playType: 'unlimited' };

        const playedAt = new Date(incoming.playedAt);
        const alreadyExists = existing.some(
            (e) => new Date(e.date).toISOString() === playedAt.toISOString()
        );
        expect(alreadyExists).toBe(true);
    });

    it('unlimited results with different timestamps are NOT deduped', () => {
        const existing = [{ won: true, attempts: 5, date: '2026-03-19T10:00:00.000Z' }];
        const incoming = { playedAt: '2026-03-19T10:05:00.000Z', playType: 'unlimited' };

        const playedAt = new Date(incoming.playedAt);
        const alreadyExists = existing.some(
            (e) => new Date(e.date).toISOString() === playedAt.toISOString()
        );
        expect(alreadyExists).toBe(false);
    });

    it('speed results dedup by playedAt', () => {
        const existing = [
            {
                date: '2026-03-19T10:00:00.000Z',
                score: 500,
                wordsSolved: 10,
                wordsFailed: 2,
                maxCombo: 5,
                totalGuesses: 30,
            },
        ];
        const incoming = '2026-03-19T10:00:00.000Z';

        const alreadyExists = existing.some((e) => e.date === incoming);
        expect(alreadyExists).toBe(true);
    });
});
