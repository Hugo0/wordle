/**
 * Shared SEO composable for game mode pages (Unlimited, Speed, Dordle, Tridle, Quordle).
 *
 * Handles: useSeoMeta, useHead (htmlAttrs, canonical, JSON-LD), hreflang.
 * The classic daily page (pages/[lang]/index.vue) has more complex SEO
 * (share links, dynamic images, locale descriptions) so it does NOT use this.
 */

interface GameModeSeoOptions {
    lang: string;
    modeSlug: string;
    modeLabel: string;
    /** Fallback description if no translated version exists in language_config.json */
    description: string;
    langStore: { rightToLeft: boolean };
    config:
        | {
              name_native?: string;
              name?: string;
              meta?: {
                  locale?: string;
                  modes?: Record<string, { title?: string; description?: string }>;
              };
          }
        | undefined;
}

export function useGameModeSeo(opts: GameModeSeoOptions) {
    const { lang, modeSlug, modeLabel, langStore, config } = opts;

    // Prefer translated description from language_config.json, fall back to English
    const translatedMode = config?.meta?.modes?.[modeSlug];
    const description = translatedMode?.description || opts.description;

    const wordleBase = `Wordle ${config?.name_native}`;
    const title = translatedMode?.title
        ? `${wordleBase} — ${translatedMode.title}`
        : `${wordleBase} — ${modeLabel}`;
    const canonicalUrl = `https://wordle.global/${lang}/${modeSlug}`;

    useSeoMeta({
        title,
        description,
        ogTitle: title,
        ogDescription: description,
        ogUrl: canonicalUrl,
        ogType: 'website',
        twitterCard: 'summary_large_image',
        twitterTitle: title,
        twitterDescription: description,
    });

    useHead({
        htmlAttrs: {
            lang: config?.meta?.locale?.split('_')[0] || lang,
            dir: langStore.rightToLeft ? 'rtl' : 'ltr',
            translate: 'no',
        },
        meta: [{ name: 'google', content: 'notranslate' }],
        link: [{ rel: 'canonical', href: canonicalUrl }],
        script: [
            {
                type: 'application/ld+json',
                innerHTML: JSON.stringify({
                    '@context': 'https://schema.org',
                    '@type': 'WebApplication',
                    name: title,
                    url: canonicalUrl,
                    description,
                    applicationCategory: 'GameApplication',
                    operatingSystem: 'Any',
                    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
                    inLanguage: [lang],
                }),
            },
            {
                type: 'application/ld+json',
                innerHTML: JSON.stringify({
                    '@context': 'https://schema.org',
                    '@type': 'BreadcrumbList',
                    itemListElement: [
                        {
                            '@type': 'ListItem',
                            position: 1,
                            name: 'Wordle Global',
                            item: 'https://wordle.global/',
                        },
                        {
                            '@type': 'ListItem',
                            position: 2,
                            name: wordleBase,
                            item: `https://wordle.global/${lang}`,
                        },
                        {
                            '@type': 'ListItem',
                            position: 3,
                            name: modeLabel,
                            item: canonicalUrl,
                        },
                    ],
                }),
            },
        ],
    });

    // OG image — static file generated at build time
    useSeoMeta({
        ogImage: `https://wordle.global/images/modes/${modeSlug}/${lang}.png`,
        ogImageWidth: 1200,
        ogImageHeight: 630,
    });

    return { title, description, canonicalUrl };
}

/**
 * Fetch all language codes and set hreflang tags for a game mode page.
 * Uses useAsyncData with a unique key per mode to avoid SSR conflicts.
 */
export async function useGameModeHreflang(modeSlug: string) {
    const { data } = await useAsyncData(`hreflang-${modeSlug}`, () =>
        $fetch('/api/languages')
    );
    if (data.value?.language_codes) {
        useHreflang(data.value.language_codes as string[], `/${modeSlug}`);
    }
}
