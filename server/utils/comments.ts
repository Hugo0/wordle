/**
 * Shared utilities for the comments system — badge types, appearance parsing.
 */

export interface CommentBadge {
    mode: string;
    attempts: number;
    won: boolean;
}

export interface ParsedAppearance {
    mode: string;
    dayIdx: number;
}

/** Parse "classic:1756,quordle:42" → structured appearances array (capped at 20) */
export function parseAppearances(raw: string): ParsedAppearance[] {
    return raw
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean)
        .slice(0, 20)
        .map((a) => {
            const [mode, dayStr] = a.split(':');
            return { mode: mode!, dayIdx: parseInt(dayStr!, 10) };
        })
        .filter((a) => a.mode && !isNaN(a.dayIdx));
}
