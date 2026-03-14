import { d as defineEventHandler } from '../../nitro/nitro.mjs';
import { l as loadAllData } from '../../_/data-loader.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'node:url';
import 'fs';
import 'path';

const LANGUAGE_POPULARITY = [
  "fi",
  "en",
  "ar",
  "tr",
  "hr",
  "bg",
  "de",
  "he",
  "sv",
  "ru",
  "hu",
  "es",
  "et",
  "da",
  "sr",
  "ro",
  "ca",
  "sk",
  "it",
  "az",
  "fr",
  "lv",
  "la",
  "gl",
  "mk",
  "uk",
  "pt",
  "vi",
  "pl",
  "hy",
  "nb",
  "sl",
  "nl",
  "cs",
  "hyw",
  "fa",
  "eu",
  "gd",
  "ga",
  "ko",
  "ka",
  "nn",
  "is",
  "ckb",
  "el",
  "lt",
  "pau",
  "mn",
  "ia",
  "mi",
  "lb",
  "br",
  "ne",
  "eo",
  "fy",
  "nds",
  "tlh",
  "ie",
  "tk",
  "fo",
  "oc",
  "fur",
  "ltg",
  "qya",
  "rw"
];
const languages_get = defineEventHandler(() => {
  const data = loadAllData();
  return {
    languages: data.languages,
    language_codes: data.languageCodes,
    language_popularity: LANGUAGE_POPULARITY
  };
});

export { languages_get as default };
//# sourceMappingURL=languages.get.mjs.map
