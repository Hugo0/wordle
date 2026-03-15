/**
 * Hreflang Composable
 *
 * Adds <link rel="alternate" hreflang="..."> tags for all supported languages.
 * Critical for multi-language SEO.
 */

export function useHreflang(langCodes: string[], currentPath: string = '') {
    const links = langCodes.map((code) => ({
        rel: 'alternate',
        hreflang: code,
        href: `https://wordle.global/${code}${currentPath}`,
    }));

    // Add x-default pointing to homepage
    links.push({
        rel: 'alternate',
        hreflang: 'x-default',
        href: 'https://wordle.global/',
    });

    useHead({ link: links });
}
