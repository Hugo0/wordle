import { d as defineEventHandler, g as getRouterParam, c as createError, a as getQuery } from '../../../../nitro/nitro.mjs';
import { l as loadAllData } from '../../../../_/data-loader.mjs';
import { f as fetchDefinition } from '../../../../_/definitions.mjs';
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

const _word__get = defineEventHandler(async (event) => {
  const lang = getRouterParam(event, "lang");
  const word = getRouterParam(event, "word");
  const data = loadAllData();
  if (!data.languageCodes.includes(lang)) {
    throw createError({ statusCode: 404, message: "Unknown language" });
  }
  const wordLower = word.toLowerCase();
  const allWords = /* @__PURE__ */ new Set([
    ...data.wordLists[lang],
    ...data.supplements[lang]
  ]);
  if (!allWords.has(wordLower)) {
    throw createError({ statusCode: 404, message: "Unknown word" });
  }
  const query = getQuery(event);
  const skipCache = query.refresh === "1";
  const result = await fetchDefinition(wordLower, lang, {
    skipNegativeCache: skipCache
  });
  if (result) return result;
  throw createError({ statusCode: 404, message: "No definition found" });
});

export { _word__get as default };
//# sourceMappingURL=_word_.get.mjs.map
