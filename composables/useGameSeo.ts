/**
 * Unified SEO composable for ALL game pages (daily, unlimited, speed, dordle, quordle, etc.).
 *
 * Handles: useSeoMeta, useHead (htmlAttrs, canonical, JSON-LD), hreflang.
 * Replaces the old useGameModeSeo + inline SEO in the daily page.
 *
 * For non-game pages (homepage, stats, word archive), SEO is handled inline
 * because they have fundamentally different schemas and content.
 */

import { GAME_MODE_CONFIG } from '~/utils/game-modes';
import type { GameMode } from '~/utils/game-modes';
import type { LanguageConfig } from '~/utils/types';
import { getModeSeoContent } from '~/utils/seo-content';
import type { FaqItem, HowToStep } from '~/utils/seo-content';

const VALID_SHARE_RESULTS = ['1', '2', '3', '4', '5', '6', 'x'];

export interface GameSeoOptions {
    lang: string;
    mode: GameMode;
    config: LanguageConfig;
    langStore: { rightToLeft: boolean };
    /** Language codes for hreflang alternate links. Pass from useFetch('/api/languages'). */
    allLangCodes?: string[];
    /** Share result from ?r= query param (daily page only). */
    shareResult?: string;
}

export interface GameSeoResult {
    title: string;
    description: string;
    canonicalUrl: string;
    langName: string;
    langNative: string;
    modeLabel: string;
    faq: FaqItem[];
    howToSteps: HowToStep[];
}

export function useGameSeo(opts: GameSeoOptions): GameSeoResult {
    const { lang, mode, config, langStore } = opts;
    const isClassic = mode === 'classic';
    const modeDef = GAME_MODE_CONFIG[mode];

    const langName = config.name || lang;
    const langNative = config.name_native || langName;
    const wordleBase = `Wordle ${langNative}`;

    // -------------------------------------------------------------------------
    // Title
    // -------------------------------------------------------------------------
    let title: string;

    if (isClassic) {
        // Daily page: use config.meta.title (translated page title)
        const wordleNative = config.meta?.wordle_native || '';
        const wordleShort = wordleNative ? `${wordleBase} (${wordleNative})` : wordleBase;
        const metaTitle = (config.meta?.title || 'The daily word game').trim();
        const isUntranslated = metaTitle === 'The daily word game' && config.language_code !== 'en';

        title = isUntranslated
            ? `${wordleBase} — Play in ${langName}`
            : `${wordleShort} — ${metaTitle}`;
        if (title.length > 60) title = wordleShort;
    } else {
        // Mode pages: use config.meta.modes[mode].title
        const modeTitle = config.meta?.modes?.[mode]?.title;
        title = modeTitle ? `${wordleBase} — ${modeTitle}` : `${wordleBase} — ${modeDef.label}`;
        if (title.length > 60) title = `${wordleBase} — ${modeDef.label}`;
    }

    // -------------------------------------------------------------------------
    // Description
    // -------------------------------------------------------------------------
    let description: string;

    if (isClassic) {
        const nativeDesc = (
            config.meta?.description ||
            'Guess the hidden word in 6 tries (or less). A new puzzle is available each day!'
        ).trim();
        const isUntranslated =
            nativeDesc ===
                'Guess the hidden word in 6 tries (or less). A new puzzle is available each day!' &&
            config.language_code !== 'en';
        description = isUntranslated
            ? `Play Wordle in ${langName} (${langNative}) — ${nativeDesc}`
            : `${nativeDesc} | Wordle ${langName}`;
    } else {
        const modeDesc = config.meta?.modes?.[mode]?.description;
        description =
            modeDesc ||
            `Play ${modeDef.label} in ${langName}. ${
                modeDef.boardCount > 1
                    ? `Solve ${modeDef.boardCount} Wordle boards at once with ${modeDef.maxGuesses} guesses.`
                    : 'No waiting — get a new word every time.'
            } Free, no account needed.`;
    }

    if (description.length > 160) description = description.substring(0, 155) + '...';

    // -------------------------------------------------------------------------
    // Share link overrides (daily only)
    // -------------------------------------------------------------------------
    const shareResult = opts.shareResult;
    const isShareLink = shareResult !== undefined && VALID_SHARE_RESULTS.includes(shareResult);

    let ogImageUrl: string;

    // Modes that have per-language OG images in public/images/modes/{mode}/
    const MODES_WITH_PER_LANG_OG = new Set([
        'dordle',
        'tridle',
        'quordle',
        'octordle',
        'sedecordle',
        'duotrigordle',
        'unlimited',
        'speed',
    ]);

    if (isShareLink) {
        const configText = config.text || ({} as Record<string, string>);
        if (shareResult === 'x') {
            title = `${wordleBase} — X/6`;
            description =
                configText.share_challenge_lose || "I didn't get today's Wordle. Can you?";
        } else {
            title = `${wordleBase} — ${shareResult}/6`;
            const challengeWin =
                configText.share_challenge_win || "I got today's Wordle in {n}. Can you beat me?";
            description = challengeWin.replace('{n}', shareResult!);
        }
        ogImageUrl = `https://wordle.global/images/share/${lang}_${shareResult}.png`;
    } else if (isClassic) {
        ogImageUrl = 'https://wordle.global/images/og-image.png';
    } else if (MODES_WITH_PER_LANG_OG.has(mode)) {
        ogImageUrl = `https://wordle.global/images/modes/${mode}/${lang}.png`;
    } else {
        // Fallback to generic mode OG image (or main OG if none exists)
        ogImageUrl = `https://wordle.global/images/og-${mode}.png`;
    }

    // -------------------------------------------------------------------------
    // Canonical URL
    // -------------------------------------------------------------------------
    const pathSuffix = isClassic ? '' : `/${mode}`;
    const canonicalUrl = `https://wordle.global/${lang}${pathSuffix}`;

    // -------------------------------------------------------------------------
    // FAQ & HowTo (auto-generated from templates)
    // -------------------------------------------------------------------------
    const { faq, howToSteps } = getModeSeoContent(mode, {
        langName,
        lang,
        boardCount: modeDef.boardCount,
        maxGuesses: modeDef.maxGuesses,
    });

    // -------------------------------------------------------------------------
    // Meta tags
    // -------------------------------------------------------------------------
    useSeoMeta({
        title,
        description,
        ogTitle: title,
        ogDescription: description,
        ogUrl: canonicalUrl,
        ogType: 'website',
        ogLocale: config.meta?.locale || lang,
        ogImage: ogImageUrl,
        ogImageWidth: 1200,
        ogImageHeight: 630,
        twitterCard: 'summary_large_image',
        twitterTitle: title,
        twitterDescription: description,
        twitterImage: ogImageUrl,
    });

    // -------------------------------------------------------------------------
    // JSON-LD structured data
    // -------------------------------------------------------------------------
    const jsonLdScripts: Array<{ type: string; innerHTML: string }> = [
        {
            type: 'application/ld+json',
            innerHTML: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'WebApplication',
                name: wordleBase,
                url: canonicalUrl,
                description,
                applicationCategory: 'GameApplication',
                operatingSystem: 'Any',
                offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
                inLanguage: [lang],
            }),
        },
    ];

    // Breadcrumb: 2 levels for classic, 3 for modes
    const breadcrumbItems = [
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
    ];
    if (!isClassic) {
        breadcrumbItems.push({
            '@type': 'ListItem',
            position: 3,
            name: modeDef.label,
            item: canonicalUrl,
        });
    }
    jsonLdScripts.push({
        type: 'application/ld+json',
        innerHTML: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: breadcrumbItems,
        }),
    });

    // FAQPage
    if (faq.length) {
        jsonLdScripts.push({
            type: 'application/ld+json',
            innerHTML: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'FAQPage',
                mainEntity: faq.map((item) => ({
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

    // HowTo
    if (howToSteps.length) {
        jsonLdScripts.push({
            type: 'application/ld+json',
            innerHTML: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'HowTo',
                name: `How to Play ${isClassic ? `Wordle in ${langName}` : modeDef.label}`,
                step: howToSteps.map((step, i) => ({
                    '@type': 'HowToStep',
                    position: i + 1,
                    name: step.name,
                    text: step.text,
                })),
            }),
        });
    }

    // -------------------------------------------------------------------------
    // Head (htmlAttrs, canonical, JSON-LD)
    // -------------------------------------------------------------------------
    useHead({
        htmlAttrs: {
            lang: config.meta?.locale?.split('_')[0] || lang,
            dir: langStore.rightToLeft ? 'rtl' : 'ltr',
            translate: 'no',
        },
        meta: [{ name: 'google', content: 'notranslate' }],
        link: [{ rel: 'canonical', href: canonicalUrl }],
        script: jsonLdScripts,
    });

    // -------------------------------------------------------------------------
    // Hreflang
    // -------------------------------------------------------------------------
    if (opts.allLangCodes?.length) {
        useHreflang(opts.allLangCodes, pathSuffix);
    }

    return {
        title,
        description,
        canonicalUrl,
        langName,
        langNative,
        modeLabel: modeDef.label,
        faq,
        howToSteps,
    };
}
