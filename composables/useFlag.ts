/**
 * Maps language codes to circle-flags country codes for flag display.
 *
 * Language → country is not always 1:1 (e.g., "en" → "gb", "ar" → "sa").
 * This mapping uses the most recognizable/neutral country for each language.
 * For constructed/fictional languages, we return null (no flag).
 */

/** Language code → ISO 3166-1 alpha-2 country code */
const LANG_TO_COUNTRY: Record<string, string> = {
    ar: 'sa', // Arabic → Saudi Arabia
    az: 'az', // Azerbaijani
    bg: 'bg', // Bulgarian
    bn: 'bd', // Bengali → Bangladesh
    br: 'fr', // Breton → France (Brittany has no circle-flag)
    ca: 'es', // Catalan → Spain (Catalonia doesn't have a circle-flag)
    ckb: 'iq', // Central Kurdish → Iraq
    cs: 'cz', // Czech → Czechia
    da: 'dk', // Danish → Denmark
    de: 'de', // German
    el: 'gr', // Greek → Greece
    en: 'gb', // English → UK
    // eo: Esperanto — no country, skip
    es: 'es', // Spanish
    et: 'ee', // Estonian → Estonia
    eu: 'es', // Basque → Spain
    fa: 'ir', // Persian → Iran
    fi: 'fi', // Finnish
    fo: 'fo', // Faroese → Faroe Islands
    fr: 'fr', // French
    fur: 'it', // Friulian → Italy
    fy: 'nl', // Frisian → Netherlands
    ga: 'ie', // Irish → Ireland
    gd: 'gb', // Scottish Gaelic → UK
    gl: 'es', // Galician → Spain
    ha: 'ng', // Hausa → Nigeria
    he: 'il', // Hebrew → Israel
    hi: 'in', // Hindi → India
    hr: 'hr', // Croatian
    hu: 'hu', // Hungarian
    hy: 'am', // Armenian
    hyw: 'am', // Western Armenian
    // ia: Interlingua — constructed language, no country
    id: 'id', // Indonesian
    // ie: Interlingue — constructed language, no country
    is: 'is', // Icelandic
    it: 'it', // Italian
    ja: 'jp', // Japanese → Japan
    ka: 'ge', // Georgian
    ko: 'kr', // Korean → South Korea
    la: 'va', // Latin → Vatican
    lb: 'lu', // Luxembourgish
    lt: 'lt', // Lithuanian
    ltg: 'lv', // Latgalian → Latvia
    lv: 'lv', // Latvian
    mi: 'nz', // Māori → New Zealand
    mk: 'mk', // Macedonian
    mn: 'mn', // Mongolian
    mr: 'in', // Marathi → India
    ms: 'my', // Malay → Malaysia
    nb: 'no', // Norwegian Bokmål → Norway
    nds: 'de', // Low German → Germany
    ne: 'np', // Nepali → Nepal
    nl: 'nl', // Dutch
    nn: 'no', // Norwegian Nynorsk → Norway
    oc: 'fr', // Occitan → France
    pa: 'in', // Punjabi → India
    pau: 'pw', // Palauan → Palau
    pl: 'pl', // Polish
    pt: 'pt', // Portuguese
    // qya: Quenya (Tolkien) — no country, skip
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
    // tlh: Klingon — no country, skip
    tr: 'tr', // Turkish
    uk: 'ua', // Ukrainian → Ukraine
    ur: 'pk', // Urdu → Pakistan
    uz: 'uz', // Uzbek
    vi: 'vn', // Vietnamese → Vietnam
    yo: 'ng', // Yoruba → Nigeria
};

/**
 * Get the flag SVG path for a language code.
 * Returns the path to the circle-flags SVG, or null for languages
 * without a country mapping (constructed languages like Esperanto, Klingon, Quenya).
 */
export function useFlag(langCode: string): string | null {
    const countryCode = LANG_TO_COUNTRY[langCode];
    if (!countryCode) return null;
    // circle-flags package stores SVGs at this path
    return `/flags/${countryCode}.svg`;
}

/**
 * Get the country code for a language code (for use in templates).
 */
export function useFlagCountryCode(langCode: string): string | null {
    return LANG_TO_COUNTRY[langCode] ?? null;
}
