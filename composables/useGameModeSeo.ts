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
    /** FAQ items for FAQPage structured data (question + answer pairs) */
    faq?: Array<{ question: string; answer: string }>;
    /** HowTo steps for HowTo structured data */
    howToSteps?: Array<{ name: string; text: string }>;
}

export function useGameModeSeo(opts: GameModeSeoOptions) {
    const { lang, modeSlug, modeLabel, langStore, config } = opts;

    // Prefer translated description from language_config.json, fall back to English
    const translatedMode = config?.meta?.modes?.[modeSlug];
    const description = translatedMode?.description || opts.description;

    const wordleBase = `Wordle ${config?.name_native}`;
    let title = translatedMode?.title
        ? `${wordleBase} — ${translatedMode.title}`
        : `${wordleBase} — ${modeLabel}`;
    if (title.length > 60) title = `${wordleBase} — ${modeLabel}`;

    const canonicalUrl = `https://wordle.global/${lang}/${modeSlug}`;

    useSeoMeta({
        title,
        description: description.length > 160 ? description.substring(0, 155) + '...' : description,
        ogTitle: title,
        ogDescription: description,
        ogUrl: canonicalUrl,
        ogType: 'website',
        ogLocale: config?.meta?.locale || lang,
        ogImage: `https://wordle.global/images/modes/${modeSlug}/${lang}.png`,
        ogImageWidth: 1200,
        ogImageHeight: 630,
        twitterCard: 'summary_large_image',
        twitterTitle: title,
        twitterDescription: description,
        twitterImage: `https://wordle.global/images/modes/${modeSlug}/${lang}.png`,
    });

    const jsonLdScripts = [
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
    ];

    // FAQPage structured data — triggers FAQ rich results in SERPs
    if (opts.faq?.length) {
        jsonLdScripts.push({
            type: 'application/ld+json',
            innerHTML: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'FAQPage',
                mainEntity: opts.faq.map((item) => ({
                    '@type': 'Question',
                    name: item.question,
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: item.answer,
                    },
                })),
            }),
        });
    }

    // HowTo structured data — triggers step-by-step cards in SERPs
    if (opts.howToSteps?.length) {
        jsonLdScripts.push({
            type: 'application/ld+json',
            innerHTML: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'HowTo',
                name: `How to Play ${modeLabel}`,
                step: opts.howToSteps.map((step, i) => ({
                    '@type': 'HowToStep',
                    position: i + 1,
                    name: step.name,
                    text: step.text,
                })),
            }),
        });
    }

    useHead({
        htmlAttrs: {
            lang: config?.meta?.locale?.split('_')[0] || lang,
            dir: langStore.rightToLeft ? 'rtl' : 'ltr',
            translate: 'no',
        },
        meta: [{ name: 'google', content: 'notranslate' }],
        link: [{ rel: 'canonical', href: canonicalUrl }],
        script: jsonLdScripts,
    });

    return { title, description, canonicalUrl };
}
