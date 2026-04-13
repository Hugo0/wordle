/**
 * Lightweight text moderation for user-submitted comments.
 *
 * Strategy: regex word-boundary match against a compact English blocklist.
 * This catches the most common abuse in the lingua franca of the internet.
 * It's not comprehensive for 80 languages — manual moderation via the
 * `hidden` flag covers the long tail.
 *
 * Returns { ok: true } or { ok: false, reason: string }.
 */

// Words that should never appear in a comment. Matched with word boundaries
// so "assess" doesn't trigger on "ass", "scunthorpe" doesn't trigger on "cunt", etc.
const BLOCKED_WORDS = [
    // Slurs & hate speech
    'nigger',
    'nigga',
    'faggot',
    'fag',
    'retard',
    'tranny',
    'kike',
    'chink',
    'spic',
    'wetback',
    // Sexual
    'fuck',
    'fucker',
    'fucking',
    'motherfucker',
    'shit',
    'shitty',
    'bullshit',
    'cunt',
    'dick',
    'cock',
    'pussy',
    'whore',
    'slut',
    'bitch',
    'porn',
    'hentai',
    'dildo',
    'blowjob',
    'handjob',
    // Threats / violence
    'kill yourself',
    'kys',
];

// Build a single regex: match any blocked word at word boundaries (case-insensitive)
const BLOCKED_RE = new RegExp(
    '\\b(' + BLOCKED_WORDS.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')\\b',
    'i'
);

// Detect spam patterns: URLs, repeated characters, ALL CAPS abuse
const URL_RE = /https?:\/\/|www\./i;
const REPEATED_CHAR_RE = /(.)\1{7,}/; // 8+ repeated chars
const EXCESSIVE_CAPS_RE = /^[^a-z]*[A-Z\s!?.]{30,}$/; // 30+ chars of all caps

export interface ModerationResult {
    ok: boolean;
    reason?: string;
}

export function moderateComment(text: string): ModerationResult {
    if (BLOCKED_RE.test(text)) {
        return { ok: false, reason: 'Your comment contains inappropriate language.' };
    }

    if (URL_RE.test(text)) {
        return { ok: false, reason: 'Links are not allowed in comments.' };
    }

    if (REPEATED_CHAR_RE.test(text)) {
        return { ok: false, reason: 'Your comment contains too many repeated characters.' };
    }

    if (EXCESSIVE_CAPS_RE.test(text) && text.length > 30) {
        return { ok: false, reason: "Please don't write in all caps." };
    }

    return { ok: true };
}
