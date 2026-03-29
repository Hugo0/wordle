/**
 * Unified SEO composable for ALL game pages (daily, unlimited, speed, dordle, quordle, etc.).
 *
 * Handles: useSeoMeta, useHead (htmlAttrs, canonical, JSON-LD), hreflang.
 *
 * All FAQ, HowTo, and content comes from config.seo (language_config.json).
 * Placeholders ({langName}, {lang}, {modeName}, {boardCount}, {maxGuesses})
 * are interpolated at runtime.
 */

import { GAME_MODE_CONFIG } from '~/utils/game-modes';
import type { GameMode } from '~/utils/game-modes';
import type { LanguageConfig, SeoFaqItem, SeoHowToStep } from '~/utils/types';

const VALID_SHARE_RESULTS = ['1', '2', '3', '4', '5', '6', 'x'];

// Modes that have per-language OG images in public/images/modes/{mode}/
const MODES_WITH_PER_LANG_OG = new Set([
    'dordle',
    'quordle',
    'octordle',
    'sedecordle',
    'duotrigordle',
    'unlimited',
    'speed',
]);

export interface FaqItem {
    question: string;
    answer: string;
}

/** Re-export SeoHowToStep shape as HowToStep for public API */
export type HowToStep = SeoHowToStep;

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

/**
 * Interpolate placeholders in a string.
 * Supports: {langName}, {lang}, {modeName}, {boardCount}, {maxGuesses}
 */
export function interpolate(text: string, vars: Record<string, string | number>): string {
    return text.replace(/\{(\w+)\}/g, (_, key) =>
        vars[key] !== undefined ? String(vars[key]) : `{${key}}`
    );
}

function interpolateFaq(items: SeoFaqItem[], vars: Record<string, string | number>): FaqItem[] {
    return items.map((item) => ({
        question: interpolate(item.q, vars),
        answer: interpolate(item.a, vars),
    }));
}

function interpolateHowTo(
    items: SeoHowToStep[],
    vars: Record<string, string | number>
): HowToStep[] {
    return items.map((item) => ({
        name: interpolate(item.name, vars),
        text: interpolate(item.text, vars),
    }));
}

export function useGameSeo(opts: GameSeoOptions): GameSeoResult {
    const { lang, mode, config, langStore } = opts;
    const isClassic = mode === 'classic';
    const modeDef = GAME_MODE_CONFIG[mode];

    const langName = config.name || lang;
    const langNative = config.name_native || langName;
    const wordleBase = `Wordle ${langNative}`;

    // Interpolation variables available to all SEO content
    const vars: Record<string, string | number> = {
        langName,
        lang,
        modeName: modeDef.label,
        boardCount: modeDef.boardCount,
        maxGuesses: modeDef.maxGuesses,
    };

    // -------------------------------------------------------------------------
    // Title
    // -------------------------------------------------------------------------
    let title: string;

    if (isClassic) {
        const wordleNative = config.meta?.wordle_native || '';
        const wordleShort = wordleNative ? `${wordleBase} (${wordleNative})` : wordleBase;
        const metaTitle = (config.meta?.title || 'The daily word game').trim();
        const isUntranslated = metaTitle === 'The daily word game' && config.language_code !== 'en';

        title = isUntranslated
            ? `${wordleBase} — Play in ${langName}`
            : `${wordleShort} — ${metaTitle}`;
        if (title.length > 60) title = wordleShort;
    } else {
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
        ogImageUrl = `https://wordle.global/images/og-${mode}.png`;
    }

    // -------------------------------------------------------------------------
    // Canonical URL
    // -------------------------------------------------------------------------
    const pathSuffix = isClassic ? '' : `/${mode}`;
    const canonicalUrl = `https://wordle.global/${lang}${pathSuffix}`;

    // -------------------------------------------------------------------------
    // FAQ & HowTo from config.seo (single source of truth)
    // -------------------------------------------------------------------------
    const seo = config.seo;

    // FAQ: mode-specific → multiboard template (for boardCount > 1) → generic default
    const isMultiBoard = modeDef.boardCount > 1;
    const faqKey = isMultiBoard ? 'multiboard' : mode;
    const rawFaq = seo?.mode_faq?.[mode] ?? seo?.mode_faq?.[faqKey] ?? seo?.faq ?? [];
    const faq = interpolateFaq(rawFaq, vars);

    // HowTo: same lookup chain
    const rawHowTo = seo?.mode_howto?.[mode] ?? seo?.mode_howto?.[faqKey] ?? seo?.howto ?? [];
    const howToSteps = interpolateHowTo(rawHowTo, vars);

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

    // Breadcrumb
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
