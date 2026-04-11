/**
 * Canonical URL builders for the word detail/Explorer page.
 *
 * The word page lives at `/[lang]/word/[slug]`. Slug is a lowercase word
 * name; numeric day indices are redirected by the page, but internal links
 * should always prefer the word name. Callers should pass the word when
 * they know it, and fall back to the day index only when the word is
 * unknown (e.g. a future scheduled entry).
 */

export function wordDetailPath(lang: string, word: string): string {
    return `/${lang}/word/${encodeURIComponent(word.toLowerCase())}`;
}

export function wordDetailPathOrIdx(
    lang: string,
    entry: { word?: string | null; day_idx: number }
): string {
    return entry.word ? wordDetailPath(lang, entry.word) : `/${lang}/word/${entry.day_idx}`;
}

export function wordDetailUrl(lang: string, word: string): string {
    return `https://wordle.global${wordDetailPath(lang, word)}`;
}

export function wordImagePath(lang: string, word: string, dayIdx?: number | null): string {
    const base = `/api/${lang}/word-image/${encodeURIComponent(word)}`;
    return dayIdx != null ? `${base}?day_idx=${dayIdx}` : base;
}

export function wordImageUrl(lang: string, word: string, dayIdx?: number | null): string {
    return `https://wordle.global${wordImagePath(lang, word, dayIdx)}`;
}
