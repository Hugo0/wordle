import { d as defineEventHandler, g as getRouterParam, c as createError, a as getQuery } from '../../../nitro/nitro.mjs';
import { l as loadAllData } from '../../../_/data-loader.mjs';
import { g as getTodaysIdx, a as getWordForDay } from '../../../_/word-selection.mjs';
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
import 'crypto';

function buildLanguageSession(langCode, requestedLayout) {
  const data = loadAllData();
  const config = data.configs[langCode];
  const wordList = data.wordLists[langCode];
  const wordListSupplement = data.supplements[langCode];
  const timezone = config.timezone || "UTC";
  let timezoneOffset = 0;
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "shortOffset"
    });
    const parts = formatter.formatToParts(/* @__PURE__ */ new Date());
    const tzPart = parts.find((p) => p.type === "timeZoneName");
    if (tzPart) {
      const match = tzPart.value.match(/GMT([+-]?\d+(?::(\d+))?)?/);
      if (match) {
        const hours = parseInt(match[1] || "0", 10);
        const minutes = parseInt(match[2] || "0", 10);
        timezoneOffset = hours + (hours >= 0 ? minutes : -minutes) / 60;
      }
    }
  } catch {
    timezoneOffset = 0;
  }
  const todaysIdx = getTodaysIdx(timezone);
  const dailyWord = getWordForDay(langCode, todaysIdx);
  const usedChars = /* @__PURE__ */ new Set();
  for (const word of wordList) {
    for (const char of word) usedChars.add(char);
  }
  const characters = data.characters[langCode].filter((c) => usedChars.has(c));
  const keyboardConfig = data.keyboards[langCode] || { default: null, layouts: {} };
  const keyboardLayouts = buildKeyboardLayouts(keyboardConfig, characters);
  const keyboardLayoutName = selectKeyboardLayout(
    keyboardLayouts,
    requestedLayout || null,
    keyboardConfig.default
  );
  const layoutMeta = keyboardLayouts[keyboardLayoutName];
  const keyboard = layoutMeta.rows;
  const keyboardLayoutLabel = layoutMeta.label;
  const keyDiacriticHints = buildKeyDiacriticHints(config, keyboard);
  return {
    languageCode: langCode,
    config,
    wordList,
    wordListSupplement,
    characters,
    dailyWord,
    todaysIdx,
    timezoneOffset,
    keyboard,
    keyboardLayouts,
    keyboardLayoutName,
    keyboardLayoutLabel,
    keyDiacriticHints
  };
}
function buildKeyboardLayouts(keyboardConfig, characters) {
  const layouts = {};
  for (const [name, meta] of Object.entries(keyboardConfig.layouts)) {
    layouts[name] = {
      label: meta.label || name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      rows: meta.rows || []
    };
  }
  if (Object.keys(layouts).length === 0) {
    layouts["alphabetical"] = {
      label: "Alphabetical",
      rows: generateAlphabeticalKeyboard(characters)
    };
  }
  return layouts;
}
function selectKeyboardLayout(layouts, requested, defaultLayout) {
  if (requested && requested in layouts) return requested;
  if (defaultLayout && defaultLayout in layouts) return defaultLayout;
  return Object.keys(layouts)[0];
}
function generateAlphabeticalKeyboard(characters) {
  const keyboard = [];
  for (let i = 0; i < characters.length; i++) {
    if (i % 10 === 0) keyboard.push([]);
    keyboard[keyboard.length - 1].push(characters[i]);
  }
  if (keyboard.length === 0) return keyboard;
  keyboard[keyboard.length - 1].splice(0, 0, "\u21E8");
  keyboard[keyboard.length - 1].push("\u232B");
  if (keyboard.length >= 2 && keyboard[keyboard.length - 1].length === 11) {
    const popped = keyboard[keyboard.length - 1].splice(1, 1)[0];
    keyboard[keyboard.length - 2].splice(-1, 0, popped);
  }
  if (keyboard.length >= 3 && keyboard[keyboard.length - 1].length === 12) {
    const popped1 = keyboard[keyboard.length - 2].splice(0, 1)[0];
    keyboard[keyboard.length - 3].splice(-1, 0, popped1);
    const popped2 = keyboard[keyboard.length - 1].splice(2, 1)[0];
    keyboard[keyboard.length - 2].splice(-1, 0, popped2);
    const popped3 = keyboard[keyboard.length - 1].splice(2, 1)[0];
    keyboard[keyboard.length - 2].splice(-1, 0, popped3);
  }
  return keyboard;
}
function buildKeyDiacriticHints(config, keyboard) {
  const diacriticMap = config.diacritic_map;
  if (!diacriticMap) return {};
  const keyboardKeys = /* @__PURE__ */ new Set();
  for (const row of keyboard) {
    for (const key of row) keyboardKeys.add(key.toLowerCase());
  }
  const hints = {};
  for (const [baseChar, variants] of Object.entries(diacriticMap)) {
    if (keyboardKeys.has(baseChar.toLowerCase())) {
      const numVariants = variants.length;
      let hintStr = variants.slice(0, 5).join("");
      if (numVariants > 5) hintStr += "\u2026";
      hints[baseChar.toLowerCase()] = {
        text: hintStr,
        above: numVariants >= 4
      };
    }
  }
  return hints;
}

const data_get = defineEventHandler((event) => {
  const lang = getRouterParam(event, "lang");
  const data = loadAllData();
  if (!data.languageCodes.includes(lang)) {
    throw createError({ statusCode: 404, message: "Unknown language" });
  }
  const query = getQuery(event);
  const layout = query.layout || void 0;
  const session = buildLanguageSession(lang, layout);
  return {
    word_list: session.wordList,
    word_list_supplement: session.wordListSupplement,
    characters: session.characters,
    config: session.config,
    todays_idx: session.todaysIdx,
    todays_word: session.dailyWord,
    timezone_offset: session.timezoneOffset,
    keyboard: session.keyboard,
    keyboard_layouts: session.keyboardLayouts,
    keyboard_layout_name: session.keyboardLayoutName,
    key_diacritic_hints: session.keyDiacriticHints
  };
});

export { data_get as default };
//# sourceMappingURL=data.get.mjs.map
