/**
 * Maps language codes to circle-flags icon codes for flag display.
 *
 * Language → country is not always 1:1 (e.g., "en" → "gb", "ar" → "sa").
 * This mapping uses the most recognizable/neutral flag for each language,
 * preferring sub-national or ethnic flags where available (e.g., "ca" → "es-ct").
 * Constructed/fictional languages use custom icons (Esperanto star, Klingon emblem, etc.).
 */

/** Language code → circle-flags icon code (ISO country, sub-national, or ethnic) */
const LANG_TO_FLAG: Record<string, string> = {
    ar: 'lang-ar', // Arabic → Arabic language flag (lang- prefix avoids collision with Argentina)
    az: 'az', // Azerbaijani
    bg: 'bg', // Bulgarian
    bn: 'bd', // Bengali → Bangladesh
    br: 'fr-bre', // Breton → Brittany
    ca: 'es-ct', // Catalan → Catalonia
    ckb: 'iq', // Central Kurdish → Iraq
    cs: 'cz', // Czech → Czechia
    da: 'dk', // Danish → Denmark
    de: 'de', // German
    el: 'gr', // Greek → Greece
    en: 'gb', // English → UK
    eo: 'eo', // Esperanto → Esperanto flag
    es: 'es', // Spanish
    et: 'ee', // Estonian → Estonia
    eu: 'es-pv', // Basque → Basque Country
    fa: 'ir', // Persian → Iran
    fi: 'fi', // Finnish
    fo: 'fo', // Faroese → Faroe Islands
    fr: 'fr', // French
    fur: 'it-36', // Friulian → Friuli-Venezia Giulia
    fy: 'nl-fr', // Frisian → Friesland
    ga: 'ie', // Irish → Ireland
    gd: 'gb-sct', // Scottish Gaelic → Scotland
    gl: 'es-ga', // Galician → Galicia
    ha: 'hausa', // Hausa → Hausa ethnic flag
    he: 'il', // Hebrew → Israel
    hi: 'in', // Hindi → India
    hr: 'hr', // Croatian
    hu: 'hu', // Hungarian
    hy: 'am', // Armenian
    hyw: 'am', // Western Armenian
    ia: 'ia', // Interlingua → Interlingua flag
    id: 'id', // Indonesian
    ie: 'lang-ie', // Interlingue → Interlingue flag (lang- prefix avoids collision with Ireland)
    is: 'is', // Icelandic
    it: 'it', // Italian
    ja: 'jp', // Japanese → Japan
    ka: 'ge', // Georgian
    ko: 'kr', // Korean → South Korea
    la: 'lang-la', // Latin → Latin language flag (lang- prefix avoids collision with Laos)
    lb: 'lu', // Luxembourgish
    lt: 'lt', // Lithuanian
    ltg: 'lv', // Latgalian → Latvia
    lv: 'lv', // Latvian
    mi: 'maori', // Māori → Māori flag
    mk: 'mk', // Macedonian
    mn: 'mn', // Mongolian
    mr: 'lang-mr', // Marathi → Marathi language flag (lang- prefix avoids collision with Mauritania)
    ms: 'my', // Malay → Malaysia
    nb: 'no', // Norwegian Bokmål → Norway
    nds: 'de', // Low German → Germany
    ne: 'np', // Nepali → Nepal
    nl: 'nl', // Dutch
    nn: 'no', // Norwegian Nynorsk → Norway
    oc: 'occitania', // Occitan → Occitania
    pa: 'punjabi', // Punjabi → Khanda symbol on saffron (Wikimedia, PD)
    pau: 'pw', // Palauan → Palau
    pl: 'pl', // Polish
    pt: 'pt', // Portuguese
    qya: 'quenya', // Quenya → White Tree of Gondor
    ro: 'ro', // Romanian
    ru: 'ru', // Russian
    rw: 'rw', // Kinyarwanda → Rwanda
    sk: 'sk', // Slovak
    sl: 'si', // Slovenian → Slovenia
    sq: 'al', // Albanian
    sr: 'rs', // Serbian
    sv: 'se', // Swedish → Sweden
    sw: 'tz', // Swahili → Tanzania
    tk: 'tm', // Turkmen → Turkmenistan
    tl: 'ph', // Tagalog → Philippines
    tlh: 'klingon', // Klingon → Klingon Empire emblem
    tr: 'tr', // Turkish
    uk: 'ua', // Ukrainian → Ukraine
    ur: 'pk', // Urdu → Pakistan
    uz: 'uz', // Uzbek
    vi: 'vn', // Vietnamese → Vietnam
    yo: 'yorubaland', // Yoruba → Yorubaland flag
};

/**
 * Get the flag SVG path for a language code.
 * Returns the path to the circle-flags SVG, or null for languages
 * without a mapping (unknown language codes).
 */
export function useFlag(langCode: string): string | null {
    const countryCode = LANG_TO_FLAG[langCode];
    if (!countryCode) return null;
    // circle-flags package stores SVGs at this path
    return `/flags/${countryCode}.svg`;
}

/**
 * Get the country code for a language code (for use in templates).
 */
export function useFlagCountryCode(langCode: string): string | null {
    return LANG_TO_FLAG[langCode] ?? null;
}
