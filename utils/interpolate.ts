/**
 * Simple placeholder interpolation for SEO templates and language config strings.
 *
 * Replaces `{key}` occurrences with the corresponding value from `vars`. Unknown
 * placeholders are left literal (as `{key}`) so missing data fails loud during
 * development rather than silently producing empty snippets.
 *
 * Used by `composables/useGameSeo.ts` and standalone pages that render
 * translated SEO titles/descriptions from `language_config.json` templates.
 */
export function interpolate(
    text: string | undefined | null,
    vars: Record<string, string | number>
): string {
    if (!text) return '';
    return text.replace(/\{(\w+)\}/g, (_, key) =>
        vars[key] !== undefined ? String(vars[key]) : `{${key}}`
    );
}
