import { _ as __nuxt_component_0, b as useRoute, c as createError, u as useSeoMeta, a as useHead } from "../server.mjs";
import { defineComponent, mergeProps, withCtx, createTextVNode, createVNode, toDisplayString, useSSRContext, ref, computed, resolveComponent, unref, withAsyncContext } from "vue";
import { ssrRenderAttrs, ssrRenderComponent, ssrInterpolate, ssrRenderList, ssrRenderClass, ssrRenderAttr, ssrRenderStyle } from "vue/server-renderer";
import { defineStore } from "pinia";
import "/home/hugo/Projects/wordle/.claude/worktrees/nuxt-migration/nuxt/node_modules/.pnpm/hookable@5.5.3/node_modules/hookable/dist/index.mjs";
import { u as useFetch } from "./fetch-CcWu1k-3.js";
import "/home/hugo/Projects/wordle/.claude/worktrees/nuxt-migration/nuxt/node_modules/.pnpm/ofetch@1.5.1/node_modules/ofetch/dist/node.mjs";
import "#internal/nuxt/paths";
import "/home/hugo/Projects/wordle/.claude/worktrees/nuxt-migration/nuxt/node_modules/.pnpm/unctx@2.5.0/node_modules/unctx/dist/index.mjs";
import "/home/hugo/Projects/wordle/.claude/worktrees/nuxt-migration/nuxt/node_modules/.pnpm/h3@1.15.6/node_modules/h3/dist/index.mjs";
import "/home/hugo/Projects/wordle/.claude/worktrees/nuxt-migration/nuxt/node_modules/.pnpm/defu@6.1.4/node_modules/defu/dist/defu.mjs";
import "/home/hugo/Projects/wordle/.claude/worktrees/nuxt-migration/nuxt/node_modules/.pnpm/ufo@1.6.3/node_modules/ufo/dist/index.mjs";
import "/home/hugo/Projects/wordle/.claude/worktrees/nuxt-migration/nuxt/node_modules/.pnpm/klona@2.0.6/node_modules/klona/dist/index.mjs";
import "/home/hugo/Projects/wordle/.claude/worktrees/nuxt-migration/nuxt/node_modules/.pnpm/@unhead+vue@2.1.12_vue@3.5.30_typescript@5.9.3_/node_modules/@unhead/vue/dist/index.mjs";
import "/home/hugo/Projects/wordle/.claude/worktrees/nuxt-migration/nuxt/node_modules/.pnpm/ohash@2.0.11/node_modules/ohash/dist/index.mjs";
import "/home/hugo/Projects/wordle/.claude/worktrees/nuxt-migration/nuxt/node_modules/.pnpm/perfect-debounce@2.1.0/node_modules/perfect-debounce/dist/index.mjs";
const _sfc_main$8 = /* @__PURE__ */ defineComponent({
  __name: "GameHeader",
  __ssrInlineRender: true,
  props: {
    langCode: {}
  },
  emits: ["help", "stats", "settings"],
  setup(__props) {
    return (_ctx, _push, _parent, _attrs) => {
      const _component_NuxtLink = __nuxt_component_0;
      _push(`<header${ssrRenderAttrs(mergeProps({ class: "relative flex flex-row justify-between items-center h-[50px] my-auto p-1 px-3 lg:px-1 border-b border-neutral-300 dark:border-neutral-600" }, _attrs))}><button class="z-40 text-neutral-500" aria-label="instructions"><svg xmlns="http://www.w3.org/2000/svg" class="text-neutral-500" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><circle cx="12" cy="12" r="9"></circle><line x1="12" y1="8" x2="12.01" y2="8"></line><polyline points="11 12 12 12 12 16 13 16"></polyline></svg></button><div class="absolute text-center right-0 left-0"><h1 class="uppercase font-bold text-2xl sm:text-4xl tracking-wider">`);
      _push(ssrRenderComponent(_component_NuxtLink, { to: "/" }, {
        default: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(` Wordle <span class="text-xl sm:text-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded px-1 py-0"${_scopeId}>${ssrInterpolate(__props.langCode)}</span>`);
          } else {
            return [
              createTextVNode(" Wordle "),
              createVNode("span", { class: "text-xl sm:text-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded px-1 py-0" }, toDisplayString(__props.langCode), 1)
            ];
          }
        }),
        _: 1
      }, _parent));
      _push(`</h1></div><div class="flex flex-row gap-3 z-30"><button class="m-0 sm:my-1"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-neutral-500" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><rect x="3" y="12" width="6" height="8" rx="1"></rect><rect x="9" y="8" width="6" height="12" rx="1"></rect><rect x="15" y="4" width="6" height="16" rx="1"></rect><line x1="4" y1="20" x2="18" y2="20"></line></svg></button><button class="m-0 sm:my-1"><svg xmlns="http://www.w3.org/2000/svg" class="text-neutral-500" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z"></path><circle cx="12" cy="12" r="3"></circle></svg></button></div></header>`);
    };
  }
});
const _sfc_setup$8 = _sfc_main$8.setup;
_sfc_main$8.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/game/GameHeader.vue");
  return _sfc_setup$8 ? _sfc_setup$8(props, ctx) : void 0;
};
function buildNormalizeMap(config) {
  const map = /* @__PURE__ */ new Map();
  if (!config.diacritic_map) return map;
  for (const [base, variants] of Object.entries(config.diacritic_map)) {
    for (const variant of variants) {
      map.set(variant, base);
    }
  }
  return map;
}
function normalizeChar(char, normalizeMap) {
  return normalizeMap.get(char) || char;
}
function normalizeWord(word, normalizeMap) {
  return [...word].map((c) => normalizeChar(c, normalizeMap)).join("");
}
function buildNormalizedWordMap(wordList, normalizeMap) {
  const map = /* @__PURE__ */ new Map();
  for (const word of wordList) {
    const normalized = normalizeWord(word, normalizeMap);
    if (!map.has(normalized)) {
      map.set(normalized, word);
    }
  }
  return map;
}
function buildFinalFormReverseMap(config) {
  const map = /* @__PURE__ */ new Map();
  if (!config.final_form_map) return map;
  for (const [regular, final] of Object.entries(config.final_form_map)) {
    map.set(final, regular);
  }
  return map;
}
function toFinalForm(char, isAtEnd, config) {
  if (!isAtEnd || !config.final_form_map) return char;
  return config.final_form_map[char] || char;
}
function toRegularForm(char, reverseMap) {
  return reverseMap.get(char) || char;
}
const useLanguageStore = defineStore("language", () => {
  const config = ref(void 0);
  const wordList = ref([]);
  const wordListSupplement = ref([]);
  const characters = ref([]);
  const todaysIdx = ref(0);
  const todaysWord = ref("");
  const timezoneOffset = ref(0);
  const keyboard = ref([]);
  const keyboardLayouts = ref({});
  const activeLayout = ref("");
  const keyDiacriticHints = ref({});
  const normalizeMap = ref(/* @__PURE__ */ new Map());
  const finalFormReverseMap = ref(/* @__PURE__ */ new Map());
  const acceptableCharacters = computed(() => characters.value.join(""));
  const rightToLeft = computed(() => config.value?.right_to_left === "true");
  const graphemeMode = computed(() => config.value?.grapheme_mode === "true");
  const languageCode = computed(() => config.value?.language_code ?? "");
  const wordListSet = computed(() => new Set(wordList.value));
  const wordListSupplementSet = computed(() => new Set(wordListSupplement.value));
  function init(data) {
    config.value = data.config;
    wordList.value = data.word_list;
    wordListSupplement.value = data.word_list_supplement;
    characters.value = data.characters;
    todaysIdx.value = data.todays_idx;
    todaysWord.value = data.todays_word;
    timezoneOffset.value = data.timezone_offset;
    keyboard.value = data.keyboard;
    keyboardLayouts.value = data.keyboard_layouts;
    activeLayout.value = data.keyboard_layout_name;
    keyDiacriticHints.value = data.key_diacritic_hints;
    normalizeMap.value = buildNormalizeMap(data.config);
    finalFormReverseMap.value = buildFinalFormReverseMap(data.config);
  }
  function setKeyboardLayout(layoutName) {
    const layout = keyboardLayouts.value[layoutName];
    if (!layout) return;
    activeLayout.value = layoutName;
    keyboard.value = layout.rows;
  }
  return {
    // State
    config,
    wordList,
    wordListSupplement,
    characters,
    todaysIdx,
    todaysWord,
    timezoneOffset,
    keyboard,
    keyboardLayouts,
    activeLayout,
    keyDiacriticHints,
    normalizeMap,
    finalFormReverseMap,
    // Computed
    acceptableCharacters,
    rightToLeft,
    graphemeMode,
    languageCode,
    wordListSet,
    wordListSupplementSet,
    // Actions
    init,
    setKeyboardLayout
  };
});
function writeLocal(key, value) {
  return;
}
const useSettingsStore = defineStore("settings", () => {
  const darkMode = ref(false);
  const feedbackEnabled = ref(true);
  const wordInfoEnabled = ref(true);
  const hardMode = ref(false);
  const highContrast = ref(false);
  function init() {
    return;
  }
  function toggleDarkMode() {
    darkMode.value = !darkMode.value;
    writeLocal("darkMode", darkMode.value ? "true" : "false");
  }
  function setDarkMode(value) {
    darkMode.value = value;
  }
  function toggleFeedback() {
    feedbackEnabled.value = !feedbackEnabled.value;
    writeLocal("feedbackEnabled", feedbackEnabled.value ? "true" : "false");
  }
  function setFeedbackEnabled(value) {
    feedbackEnabled.value = value;
  }
  function toggleWordInfo() {
    wordInfoEnabled.value = !wordInfoEnabled.value;
    writeLocal("wordInfoEnabled", wordInfoEnabled.value ? "true" : "false");
  }
  function setWordInfoEnabled(value) {
    wordInfoEnabled.value = value;
  }
  function toggleHardMode() {
    hardMode.value = !hardMode.value;
    writeLocal("hardMode", hardMode.value ? "true" : "false");
  }
  function setHardMode(value) {
    hardMode.value = value;
  }
  function toggleHighContrast() {
    highContrast.value = !highContrast.value;
    writeLocal("highContrast", highContrast.value ? "true" : "false");
  }
  function setHighContrast(value) {
    highContrast.value = value;
  }
  return {
    // State
    darkMode,
    feedbackEnabled,
    wordInfoEnabled,
    hardMode,
    highContrast,
    // Init
    init,
    // Toggles (flip current value and persist)
    toggleDarkMode,
    toggleFeedback,
    toggleWordInfo,
    toggleHardMode,
    toggleHighContrast,
    // Setters (explicit value and persist)
    setDarkMode,
    setFeedbackEnabled,
    setWordInfoEnabled,
    setHardMode,
    setHighContrast
  };
});
const EMPTY_DISTRIBUTION = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
function emptyStats() {
  return {
    n_wins: 0,
    n_losses: 0,
    n_games: 0,
    n_attempts: 0,
    avg_attempts: 0,
    win_percentage: 0,
    longest_streak: 0,
    current_streak: 0,
    guessDistribution: { ...EMPTY_DISTRIBUTION }
  };
}
function emptyTotalStats() {
  return {
    total_games: 0,
    game_stats: {},
    languages_won: [],
    total_win_percentage: 0,
    longest_overall_streak: 0,
    current_overall_streak: 0,
    n_victories: 0,
    n_losses: 0
  };
}
const useStatsStore = defineStore("stats", () => {
  const gameResults = ref({});
  const stats = ref(emptyStats());
  const totalStats = ref(emptyTotalStats());
  function loadGameResults(langCode = "unknown") {
    return;
  }
  function saveResult(langCode, won, attempts) {
    if (!langCode) return;
    const result = { won, attempts, date: /* @__PURE__ */ new Date() };
    if (!gameResults.value[langCode]) {
      gameResults.value[langCode] = [];
    }
    gameResults.value[langCode].push(result);
  }
  function calculateStats(languageCode) {
    if (!languageCode) {
      return emptyStats();
    }
    const results = gameResults.value[languageCode];
    if (!results?.length) {
      return emptyStats();
    }
    let n_wins = 0;
    let n_losses = 0;
    let n_attempts = 0;
    let current_streak = 0;
    let longest_streak = 0;
    const guessDistribution = { ...EMPTY_DISTRIBUTION };
    for (const result of results) {
      const attempts = typeof result.attempts === "string" ? parseInt(result.attempts, 10) || 0 : result.attempts;
      if (result.won) {
        n_wins++;
        current_streak++;
        longest_streak = Math.max(longest_streak, current_streak);
        if (attempts >= 1 && attempts <= 6) {
          guessDistribution[attempts]++;
        }
      } else {
        n_losses++;
        current_streak = 0;
      }
      n_attempts += attempts;
    }
    const total = n_wins + n_losses;
    const computed2 = {
      n_wins,
      n_losses,
      n_games: results.length,
      n_attempts,
      avg_attempts: n_attempts / results.length,
      win_percentage: total > 0 ? Math.round(n_wins / total * 100) : 0,
      longest_streak,
      current_streak,
      guessDistribution
    };
    stats.value = computed2;
    return computed2;
  }
  function calculateTotalStats() {
    let n_victories = 0;
    let n_losses = 0;
    let current_overall_streak = 0;
    let longest_overall_streak = 0;
    const languages_won = [];
    const game_stats = {};
    const all_results = [];
    for (const [language_code, results] of Object.entries(gameResults.value)) {
      for (const result of results) {
        all_results.push({ ...result, language: language_code });
      }
    }
    all_results.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    for (const result of all_results) {
      if (result.won) {
        n_victories++;
        current_overall_streak++;
        longest_overall_streak = Math.max(
          longest_overall_streak,
          current_overall_streak
        );
      } else {
        n_losses++;
        current_overall_streak = 0;
      }
    }
    for (const language_code of Object.keys(gameResults.value)) {
      const langStats = calculateStats(language_code);
      game_stats[language_code] = langStats;
      if (langStats.n_wins > 0) {
        languages_won.push(language_code);
      }
    }
    const total_games = n_victories + n_losses;
    const computed2 = {
      total_games,
      game_stats,
      languages_won,
      total_win_percentage: total_games > 0 ? n_victories / total_games * 100 : 0,
      longest_overall_streak,
      current_overall_streak,
      n_victories,
      n_losses
    };
    totalStats.value = computed2;
    return computed2;
  }
  return {
    // State
    gameResults,
    stats,
    totalStats,
    // Actions
    loadGameResults,
    saveResult,
    calculateStats,
    calculateTotalStats
  };
});
const segmenter = new Intl.Segmenter(void 0, { granularity: "grapheme" });
function splitWord(word, graphemeMode) {
  if (!graphemeMode) return [...word];
  return [...segmenter.segment(word)].map((s) => s.segment);
}
const WIN_WORDS = ["Genius", "Magnificent", "Impressive", "Splendid", "Great", "Phew"];
const DEFAULT_TILE_CLASS = "border-2 border-neutral-300";
const ACTIVE_TILE_CLASS = "text-2xl tiny:text-4xl uppercase font-bold select-none border-2 border-neutral-500 pop";
const BASE_REVEALED_CLASS = "text-2xl tiny:text-4xl uppercase font-bold select-none text-white";
function makeEmptyGrid(rows, cols, value) {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => value));
}
function makeEmptyNotification() {
  return {
    show: false,
    fading: false,
    message: "",
    top: 0,
    timeout: 0,
    fadeTimeout: 0,
    slideInterval: 0
  };
}
const useGameStore = defineStore("game", () => {
  const tiles = ref(makeEmptyGrid(6, 5, ""));
  const tileClasses = ref(makeEmptyGrid(6, 5, DEFAULT_TILE_CLASS));
  const tilesVisual = ref(makeEmptyGrid(6, 5, ""));
  const tileClassesVisual = ref(makeEmptyGrid(6, 5, DEFAULT_TILE_CLASS));
  const activeRow = ref(0);
  const activeCell = ref(0);
  const fullWordInputted = ref(false);
  const gameOver = ref(false);
  const gameLost = ref(false);
  const gameWon = ref(false);
  const attempts = ref("0");
  const keyClasses = ref({});
  const pendingKeyUpdates = ref([]);
  const animating = ref(false);
  const shakingRow = ref(-1);
  const showHelpModal = ref(false);
  const showStatsModal = ref(false);
  const showOptionsModal = ref(false);
  const notification = ref(makeEmptyNotification());
  const emojiBoard = ref("");
  const timeUntilNextDay = ref("");
  const communityPercentile = ref(null);
  const communityIsTopScore = ref(false);
  const communityTotal = ref(0);
  const communityStatsLink = ref(null);
  const shareButtonState = ref("idle");
  let _normalizedWordMap = null;
  let _normalizedSupplementMap = null;
  function getNormalizedWordMap() {
    if (_normalizedWordMap) return _normalizedWordMap;
    const lang = useLanguageStore();
    _normalizedWordMap = buildNormalizedWordMap(lang.wordList, lang.normalizeMap);
    return _normalizedWordMap;
  }
  function getNormalizedSupplementMap() {
    if (_normalizedSupplementMap) return _normalizedSupplementMap;
    const lang = useLanguageStore();
    _normalizedSupplementMap = buildNormalizedWordMap(
      lang.wordListSupplement,
      lang.normalizeMap
    );
    return _normalizedSupplementMap;
  }
  function fullNormalize(char) {
    const lang = useLanguageStore();
    const positionalNorm = toRegularForm(char, lang.finalFormReverseMap);
    return lang.normalizeMap.get(positionalNorm) || positionalNorm;
  }
  function fullCharsMatch(c1, c2) {
    return fullNormalize(c1) === fullNormalize(c2);
  }
  function initKeyClasses() {
    const lang = useLanguageStore();
    const keys = {};
    for (const char of lang.characters) {
      keys[char] = "";
    }
    keys["⟹"] = "";
    keys["ENTER"] = "";
    keys["DEL"] = "";
    keys["⌫"] = "";
    keyClasses.value = keys;
  }
  function resetCaches() {
    _normalizedWordMap = null;
    _normalizedSupplementMap = null;
  }
  function addChar(char) {
    const lang = useLanguageStore();
    const row = tiles.value[activeRow.value];
    const rowClasses = tileClasses.value[activeRow.value];
    if (row && rowClasses) {
      const isLastPosition = activeCell.value === 4;
      const displayChar = toFinalForm(char, isLastPosition, lang.config ?? {});
      row.splice(activeCell.value, 1, displayChar);
      rowClasses.splice(activeCell.value, 1, ACTIVE_TILE_CLASS);
    }
    activeCell.value = Math.min(activeCell.value + 1, 5);
    if (activeCell.value === 5) {
      fullWordInputted.value = true;
    }
  }
  function checkWord(word) {
    const lang = useLanguageStore();
    if (lang.wordListSet.has(word)) return word;
    if (lang.wordListSupplementSet.has(word)) return word;
    const normalized = normalizeWord(word, lang.normalizeMap);
    const canonical = getNormalizedWordMap().get(normalized);
    if (canonical) return canonical;
    const supplementCanonical = getNormalizedSupplementMap().get(normalized);
    if (supplementCanonical) return supplementCanonical;
    return null;
  }
  function updateColors() {
    const lang = useLanguageStore();
    const targetWord = lang.todaysWord;
    const targetChars = splitWord(targetWord, lang.graphemeMode);
    const charCounts = {};
    for (const char of targetChars) {
      const normalizedChar = fullNormalize(char);
      charCounts[normalizedChar] = (charCounts[normalizedChar] || 0) + 1;
    }
    const row = tiles.value[activeRow.value];
    const classes = tileClasses.value[activeRow.value];
    if (!row || !classes) return;
    pendingKeyUpdates.value = [];
    for (let i = 0; i < row.length; i++) {
      const guessChar = row[i];
      const targetChar = targetChars[i];
      if (guessChar && targetChar && fullCharsMatch(guessChar, targetChar)) {
        classes.splice(i, 1, `correct ${BASE_REVEALED_CLASS}`);
        row.splice(i, 1, targetChar);
        pendingKeyUpdates.value[i] = {
          char: guessChar,
          state: "key-correct"
        };
        const normalizedChar = fullNormalize(guessChar);
        const count = charCounts[normalizedChar];
        if (count !== void 0) charCounts[normalizedChar] = count - 1;
      }
    }
    for (let i = 0; i < row.length; i++) {
      const guessChar = row[i];
      if (!guessChar || classes[i]?.includes("correct")) continue;
      const normalizedGuess = fullNormalize(guessChar);
      const count = charCounts[normalizedGuess];
      const targetHasChar = targetChars.some((tc) => fullCharsMatch(guessChar, tc));
      if (targetHasChar && count !== void 0 && count > 0) {
        classes.splice(i, 1, `semicorrect ${BASE_REVEALED_CLASS}`);
        pendingKeyUpdates.value[i] = {
          char: guessChar,
          state: "key-semicorrect"
        };
        charCounts[normalizedGuess] = count - 1;
      } else {
        classes.splice(i, 1, `incorrect ${BASE_REVEALED_CLASS}`);
        pendingKeyUpdates.value[i] = {
          char: guessChar,
          state: "key-incorrect"
        };
      }
    }
  }
  function updateKeyColor(char, newState, keys) {
    const lang = useLanguageStore();
    const updateSingleKey = (key, state) => {
      const current = keys[key];
      if (current === "key-correct") {
        return;
      }
      if (current === "key-semicorrect" && state === "key-incorrect") {
        return;
      }
      if (current === "key-incorrect" && state === "key-incorrect") {
        return;
      }
      keys[key] = state;
    };
    updateSingleKey(char, newState);
    const normalizedChar = lang.normalizeMap.get(char) || char;
    for (const [diacritic, base] of lang.normalizeMap.entries()) {
      if (base === normalizedChar) {
        updateSingleKey(diacritic, newState);
      }
    }
    if (lang.normalizeMap.has(char)) {
      updateSingleKey(normalizedChar, newState);
    }
  }
  function keyClick(key) {
    keyDown({ key });
  }
  function keyDown(event) {
    if (animating.value) return;
    const key = event.key;
    if (key === "Escape") {
      showHelpModal.value = false;
      showStatsModal.value = false;
      showOptionsModal.value = false;
      return;
    }
    if (gameOver.value) return;
    const lang = useLanguageStore();
    const settings = useSettingsStore();
    if (["Enter", "⇨", "⟹", "ENTER"].includes(key)) {
      if (!fullWordInputted.value) {
        shakeRow(activeRow.value);
        return;
      }
      const row = tiles.value[activeRow.value];
      const typedWord = row ? row.join("").toLowerCase() : "";
      const canonicalWord = checkWord(typedWord);
      if (canonicalWord) {
        if (settings.hardMode) {
          const hardModeError = checkHardMode(canonicalWord);
          if (hardModeError) {
            shakeRow(activeRow.value);
            return;
          }
        }
        if (row && canonicalWord !== typedWord) {
          const canonicalChars = splitWord(canonicalWord, lang.graphemeMode);
          for (let i = 0; i < canonicalChars.length; i++) {
            row.splice(i, 1, canonicalChars[i]);
          }
        }
        updateColors();
        activeRow.value;
        activeRow.value++;
        activeCell.value = 0;
        fullWordInputted.value = false;
        animating.value = true;
        revealRow().then(() => {
          animating.value = false;
          showTiles();
          const normalizedGuess = normalizeWord(canonicalWord, lang.normalizeMap);
          const normalizedTarget = normalizeWord(lang.todaysWord, lang.normalizeMap);
          if (normalizedGuess === normalizedTarget) {
            handleGameWon();
          } else if (activeRow.value === 6) {
            handleGameLost();
          }
        });
      } else {
        shakeRow(activeRow.value);
      }
    } else if (["Backspace", "Delete", "⌫"].includes(key) && activeCell.value > 0) {
      activeCell.value--;
      const row = tiles.value[activeRow.value];
      const rowClasses = tileClasses.value[activeRow.value];
      if (row && rowClasses) {
        row.splice(activeCell.value, 1, "");
        rowClasses.splice(activeCell.value, 1, DEFAULT_TILE_CLASS);
      }
      fullWordInputted.value = false;
    } else if (!fullWordInputted.value && lang.acceptableCharacters.includes(key)) {
      addChar(key);
    }
    if (!animating.value) {
      showTiles();
    }
  }
  function showTiles() {
    const lang = useLanguageStore();
    for (let i = 0; i < tiles.value.length; i++) {
      const tilesRow = tiles.value[i];
      const classesRow = tileClasses.value[i];
      if (!tilesRow || !classesRow) continue;
      if (lang.rightToLeft) {
        tilesVisual.value.splice(i, 1, [...tilesRow].reverse());
        tileClassesVisual.value.splice(i, 1, [...classesRow].reverse());
      } else {
        tilesVisual.value.splice(i, 1, [...tilesRow]);
        tileClassesVisual.value.splice(i, 1, [...classesRow]);
      }
    }
  }
  function revealRow(rowIndex) {
    {
      showTiles();
      return Promise.resolve();
    }
  }
  function shakeRow(rowIndex) {
    shakingRow.value = rowIndex;
  }
  function bounceRow(rowIndex) {
    return;
  }
  function handleGameWon() {
    const lang = useLanguageStore();
    const statsStore = useStatsStore();
    gameOver.value = true;
    gameWon.value = true;
    emojiBoard.value = getEmojiBoard();
    WIN_WORDS[activeRow.value - 1] || "Phew";
    submitWordStats(true, activeRow.value);
    statsStore.saveResult(lang.languageCode, true, activeRow.value);
    statsStore.calculateStats(lang.languageCode);
    statsStore.calculateTotalStats();
  }
  function handleGameLost() {
    const lang = useLanguageStore();
    const statsStore = useStatsStore();
    showNotification(lang.todaysWord.toUpperCase(), 12);
    gameOver.value = true;
    gameWon.value = false;
    gameLost.value = true;
    attempts.value = "X";
    submitWordStats(false, activeRow.value);
    statsStore.saveResult(lang.languageCode, false, activeRow.value);
    statsStore.calculateStats(lang.languageCode);
    statsStore.calculateTotalStats();
  }
  function showNotification(message, duration = 3) {
    return;
  }
  function getEmojiBoard() {
    const settings = useSettingsStore();
    let board = "";
    const greenEmoji = settings.highContrast ? "🟦" : "🟩";
    const yellowEmoji = settings.highContrast ? "🟧" : "🟨";
    for (let i = 0; i < tileClasses.value.length; i++) {
      const row = tileClasses.value[i];
      if (!row) continue;
      for (const tileClass of row) {
        if (tileClass.includes("correct") && !tileClass.includes("semicorrect") && !tileClass.includes("incorrect")) {
          board += greenEmoji;
        } else if (tileClass.includes("semicorrect")) {
          board += yellowEmoji;
        } else if (tileClass.includes("incorrect")) {
          board += "⬜";
        } else {
          attempts.value = String(i);
          return board;
        }
      }
      if (i < tileClasses.value.length - 1) board += "\n";
      attempts.value = String(i + 1);
    }
    if (gameOver.value && !gameWon.value) attempts.value = "X";
    return board;
  }
  function getShareText() {
    const lang = useLanguageStore();
    const settings = useSettingsStore();
    const name = lang.config?.name_native || lang.config?.language_code || "";
    const hardModeFlag = settings.hardMode ? " *" : "";
    return `Wordle ${name} #${lang.todaysIdx} — ${attempts.value}/6${hardModeFlag}

${emojiBoard.value}`;
  }
  function saveToLocalStorage() {
    return;
  }
  function loadFromLocalStorage() {
    return;
  }
  function getTimeUntilNextDay() {
    const lang = useLanguageStore();
    const now = /* @__PURE__ */ new Date();
    const utcHours = now.getUTCHours();
    const utcMinutes = now.getUTCMinutes();
    const utcSeconds = now.getUTCSeconds();
    let localHours = utcHours + lang.timezoneOffset;
    if (localHours >= 24) localHours -= 24;
    if (localHours < 0) localHours += 24;
    const h = 23 - localHours;
    const m = 59 - utcMinutes;
    const s = 59 - utcSeconds;
    return `${h}h ${m}m ${s}s`;
  }
  function updateTimeUntilNextDay() {
    timeUntilNextDay.value = getTimeUntilNextDay();
  }
  function checkHardMode(guess) {
    for (let r = 0; r < activeRow.value; r++) {
      const row = tiles.value[r];
      const classes = tileClasses.value[r];
      if (!row || !classes) continue;
      for (let c = 0; c < row.length; c++) {
        const tileClass = classes[c] || "";
        const letter = row[c];
        if (!letter) continue;
        if (tileClass.includes("correct") && !tileClass.includes("semicorrect") && !tileClass.includes("incorrect")) {
          if (guess[c]?.toLowerCase() !== letter.toLowerCase()) {
            return `Hard mode: ${letter.toUpperCase()} must be in position ${c + 1}`;
          }
        } else if (tileClass.includes("semicorrect")) {
          if (!guess.toLowerCase().includes(letter.toLowerCase())) {
            return `Hard mode: guess must contain ${letter.toUpperCase()}`;
          }
        }
      }
    }
    return null;
  }
  function maybeShowTutorial() {
    return;
  }
  function submitWordStats(won, attemptsVal) {
    return;
  }
  async function shareResults() {
    return;
  }
  function copyEmojiBoard() {
    shareResults();
  }
  function share() {
    shareResults();
  }
  return {
    // State
    tiles,
    tileClasses,
    tilesVisual,
    tileClassesVisual,
    activeRow,
    activeCell,
    fullWordInputted,
    gameOver,
    gameLost,
    gameWon,
    attempts,
    keyClasses,
    pendingKeyUpdates,
    animating,
    shakingRow,
    showHelpModal,
    showStatsModal,
    showOptionsModal,
    notification,
    emojiBoard,
    timeUntilNextDay,
    communityPercentile,
    communityIsTopScore,
    communityTotal,
    communityStatsLink,
    shareButtonState,
    // hardMode is owned by settings store
    // Actions
    initKeyClasses,
    resetCaches,
    addChar,
    checkWord,
    updateColors,
    updateKeyColor,
    keyClick,
    keyDown,
    showTiles,
    revealRow,
    shakeRow,
    bounceRow,
    handleGameWon,
    handleGameLost,
    showNotification,
    getEmojiBoard,
    getShareText,
    saveToLocalStorage,
    loadFromLocalStorage,
    getTimeUntilNextDay,
    updateTimeUntilNextDay,
    checkHardMode,
    maybeShowTutorial,
    submitWordStats,
    shareResults,
    copyEmojiBoard,
    share
  };
});
const _sfc_main$7 = /* @__PURE__ */ defineComponent({
  __name: "GameBoard",
  __ssrInlineRender: true,
  setup(__props) {
    const game = useGameStore();
    return (_ctx, _push, _parent, _attrs) => {
      const _component_TileRow = resolveComponent("TileRow");
      _push(`<main${ssrRenderAttrs(mergeProps({ class: "flex flex-auto justify-center items-center" }, _attrs))}><div class="game-board grid grid-rows-6 relative w-full h-full max-w-[350px] max-h-[420px] gap-1 p-3 box-border"><!--[-->`);
      ssrRenderList(unref(game).tilesVisual, (row, i) => {
        _push(ssrRenderComponent(_component_TileRow, {
          key: i,
          tiles: row,
          classes: unref(game).tileClassesVisual[i] || [],
          shaking: unref(game).shakingRow === i
        }, null, _parent));
      });
      _push(`<!--]--></div></main>`);
    };
  }
});
const _sfc_setup$7 = _sfc_main$7.setup;
_sfc_main$7.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/game/GameBoard.vue");
  return _sfc_setup$7 ? _sfc_setup$7(props, ctx) : void 0;
};
const _sfc_main$6 = /* @__PURE__ */ defineComponent({
  __name: "GameKeyboard",
  __ssrInlineRender: true,
  props: {
    keyboard: {},
    hints: {}
  },
  setup(__props) {
    const game = useGameStore();
    return (_ctx, _push, _parent, _attrs) => {
      const _component_KeyboardKey = resolveComponent("KeyboardKey");
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "flex flex-col container mx-auto gap-2 w-full max-w-lg pb-2 md:pb-5 px-2" }, _attrs))}><!--[-->`);
      ssrRenderList(__props.keyboard, (row, i) => {
        _push(`<div class="flex gap-1"><!--[-->`);
        ssrRenderList(row, (key) => {
          _push(ssrRenderComponent(_component_KeyboardKey, {
            key,
            char: key,
            state: unref(game).keyClasses[key] || "",
            hint: __props.hints[key.toLowerCase()]?.text,
            "hint-above": __props.hints[key.toLowerCase()]?.above,
            onPress: unref(game).keyClick
          }, null, _parent));
        });
        _push(`<!--]--></div>`);
      });
      _push(`<!--]--></div>`);
    };
  }
});
const _sfc_setup$6 = _sfc_main$6.setup;
_sfc_main$6.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/game/GameKeyboard.vue");
  return _sfc_setup$6 ? _sfc_setup$6(props, ctx) : void 0;
};
const _sfc_main$5 = /* @__PURE__ */ defineComponent({
  __name: "ModalBackdrop",
  __ssrInlineRender: true,
  props: {
    visible: { type: Boolean }
  },
  emits: ["close"],
  setup(__props) {
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "opacity-25 fixed top-0 left-0 w-full h-full z-1 bg-black" }, _attrs, {
        style: __props.visible ? null : { display: "none" }
      }))}></div>`);
    };
  }
});
const _sfc_setup$5 = _sfc_main$5.setup;
_sfc_main$5.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/shared/ModalBackdrop.vue");
  return _sfc_setup$5 ? _sfc_setup$5(props, ctx) : void 0;
};
const _sfc_main$4 = /* @__PURE__ */ defineComponent({
  __name: "HelpModal",
  __ssrInlineRender: true,
  props: {
    visible: { type: Boolean }
  },
  emits: ["close"],
  setup(__props) {
    const lang = useLanguageStore();
    const help = computed(() => lang.config?.help ?? {});
    const exampleWord1 = computed(() => [...lang.wordList[0] ?? ""]);
    const exampleWord2 = computed(() => [...lang.wordList[1] ?? ""]);
    const exampleWord3 = computed(() => [...lang.wordList[2] ?? ""]);
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({
        id: "HelpModal",
        class: "fixed top-10 left-0 w-full h-full z-50 items-center flex mx-auto"
      }, _attrs, {
        style: __props.visible ? null : { display: "none" }
      }))}><div class="modal-animate bg-white dark:bg-neutral-800 rounded-lg shadow-lg p-5 m-4 border-2 border-slate-200 dark:border-neutral-600 mx-auto w-full max-w-md sm:max-w-lg"><div class="flex flex-col gap-2 relative"><button type="button" aria-label="Close" class="absolute top-0 right-0 p-1 ml-auto z-50"><span class="leading-[0.25] h-5 w-5 text-3xl text-neutral-400 block outline-none focus:outline-none">×</span></button><h2 class="flex mx-auto uppercase font-bold text-2xl tracking-wider"> Wordle <span class="ml-1 text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-blue-500">${ssrInterpolate(unref(lang).config?.name_native)}</span></h2><h3 class="font-bold text-lg">${ssrInterpolate(help.value.title)}</h3><p class="text-sm">${ssrInterpolate(help.value.text_1_1_1)} <a class="font-bold uppercase">Wordle</a> ${ssrInterpolate(help.value.text_1_1_2)}</p><p class="text-sm">${ssrInterpolate(help.value.text_1_2)}</p><p class="text-sm">${ssrInterpolate(help.value.text_1_3)}</p><div class="border-t-2 border-gray-300 dark:border-gray-600"></div><div class="justify-center items-center flex flex-col gap-2"><h2 class="text-md font-semibold text-gray-900 dark:text-gray-100">${ssrInterpolate(help.value.title_2)}</h2>`);
      if (exampleWord1.value.length) {
        _push(`<div class="grid grid-cols-5 gap-1 w-full max-w-xs"><!--[-->`);
        ssrRenderList(exampleWord1.value, (c, i) => {
          _push(`<div class="${ssrRenderClass([
            i === 0 ? "correct text-white" : "aspect-square border-2 border-neutral-500",
            "w-full h-full inline-flex justify-center items-center text-2xl tiny:text-4xl uppercase font-bold select-none"
          ])}">${ssrInterpolate(c)}</div>`);
        });
        _push(`<!--]--></div>`);
      } else {
        _push(`<!---->`);
      }
      if (exampleWord1.value.length) {
        _push(`<p class="text-sm mb-2"><span class="font-bold uppercase">${ssrInterpolate(exampleWord1.value[0])}</span> ${ssrInterpolate(help.value.text_2_1)}</p>`);
      } else {
        _push(`<!---->`);
      }
      if (exampleWord2.value.length) {
        _push(`<div class="grid grid-cols-5 gap-1 w-full max-w-xs"><!--[-->`);
        ssrRenderList(exampleWord2.value, (c, i) => {
          _push(`<div class="${ssrRenderClass([
            i === 2 ? "semicorrect text-white" : "aspect-square border-2 border-neutral-500",
            "w-full h-full inline-flex justify-center items-center text-2xl tiny:text-4xl uppercase font-bold select-none"
          ])}">${ssrInterpolate(c)}</div>`);
        });
        _push(`<!--]--></div>`);
      } else {
        _push(`<!---->`);
      }
      if (exampleWord2.value.length) {
        _push(`<p class="text-sm mb-2"><span class="font-bold uppercase">${ssrInterpolate(exampleWord2.value[2])}</span> ${ssrInterpolate(help.value.text_2_2)}</p>`);
      } else {
        _push(`<!---->`);
      }
      if (exampleWord3.value.length) {
        _push(`<div class="grid grid-cols-5 gap-1 w-full max-w-xs"><!--[-->`);
        ssrRenderList(exampleWord3.value, (c, i) => {
          _push(`<div class="${ssrRenderClass([
            i === 4 ? "incorrect text-white" : "aspect-square border-2 border-neutral-500",
            "w-full h-full inline-flex justify-center items-center text-2xl tiny:text-4xl uppercase font-bold select-none"
          ])}">${ssrInterpolate(c)}</div>`);
        });
        _push(`<!--]--></div>`);
      } else {
        _push(`<!---->`);
      }
      if (exampleWord3.value.length) {
        _push(`<p class="text-sm mb-2"><span class="font-bold uppercase">${ssrInterpolate(exampleWord3.value[4])}</span> ${ssrInterpolate(help.value.text_2_3)}</p>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div><div class="border-t-2 border-gray-300 dark:border-gray-600"></div><div class="flex flex-col gap-2 py-2"><a href="https://github.com/Hugo0/wordle/issues" target="_blank" rel="noopener noreferrer" class="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M9 19c-4.3 1.4 -4.3 -2.5 -6 -3m12 5v-3.5c0 -1 .1 -1.4 -.5 -2c2.8 -.3 5.5 -1.4 5.5 -6a4.6 4.6 0 0 0 -1.3 -3.2a4.2 4.2 0 0 0 -.1 -3.2s-1.1 -.3 -3.5 1.3a12.3 12.3 0 0 0 -6.2 0c-2.4 -1.6 -3.5 -1.3 -3.5 -1.3a4.2 4.2 0 0 0 -.1 3.2a4.6 4.6 0 0 0 -1.3 3.2c0 4.6 2.7 5.7 5.5 6c-.6 .6 -.6 1.2 -.5 2v3.5"></path></svg> ${ssrInterpolate(unref(lang).config?.ui?.report_issue || "Report an Issue")}</a><a href="https://github.com/Hugo0/wordle" target="_blank" rel="noopener noreferrer" class="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M10 14a3.5 3.5 0 0 0 5 0l4 -4a3.5 3.5 0 0 0 -5 -5l-.5 .5"></path><path d="M14 10a3.5 3.5 0 0 0 -5 0l-4 4a3.5 3.5 0 0 0 5 5l.5 -.5"></path></svg> ${ssrInterpolate(unref(lang).config?.ui?.view_source || "View Source Code")}</a></div><div class="border-t-2 border-gray-300 dark:border-gray-600"></div><button class="uppercase font-bold text-sm tracking-wider">${ssrInterpolate(help.value.close)} <span class="text-lg text-neutral-400">×</span></button></div></div></div>`);
    };
  }
});
const _sfc_setup$4 = _sfc_main$4.setup;
_sfc_main$4.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/game/HelpModal.vue");
  return _sfc_setup$4 ? _sfc_setup$4(props, ctx) : void 0;
};
const _sfc_main$3 = /* @__PURE__ */ defineComponent({
  __name: "SettingsModal",
  __ssrInlineRender: true,
  props: {
    visible: { type: Boolean }
  },
  emits: ["close"],
  setup(__props) {
    const settings = useSettingsStore();
    const lang = useLanguageStore();
    const game = useGameStore();
    const allowAnyWord = ref(false);
    const canToggleHard = computed(
      () => settings.hardMode || game.activeRow === 0 || game.gameOver
    );
    return (_ctx, _push, _parent, _attrs) => {
      const _component_ToggleSwitch = resolveComponent("ToggleSwitch");
      const _component_NuxtLink = __nuxt_component_0;
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "fixed top-10 left-0 w-full h-full z-30 items-center mx-auto flex" }, _attrs, {
        style: __props.visible ? null : { display: "none" }
      }))}><div class="modal-animate bg-white dark:bg-neutral-800 rounded-lg shadow-lg p-5 m-4 border-2 border-slate-200 dark:border-neutral-600 mx-auto w-full max-w-xs sm:max-w-md"><div class="flex flex-col gap-2 relative"><button type="button" aria-label="Close" class="absolute top-0 right-0 p-1 ml-auto z-50"><span class="leading-[0.25] h-5 w-5 text-3xl text-neutral-400 block outline-none focus:outline-none">×</span></button><h3 class="uppercase font-bold text-xl tracking-wider mb-5">${ssrInterpolate(unref(lang).config?.ui?.settings || "Settings")}</h3><div class="space-y-4"><div class="flex flex-row items-center"><div class="flex-grow"><p>${ssrInterpolate(unref(lang).config?.ui?.dark_mode || "Dark Mode")}</p></div>`);
      _push(ssrRenderComponent(_component_ToggleSwitch, {
        "model-value": unref(settings).darkMode,
        "onUpdate:modelValue": ($event) => unref(settings).toggleDarkMode()
      }, null, _parent));
      _push(`</div><div class="border-t-2 border-gray-300 dark:border-gray-600"></div><div class="flex flex-row items-center"><div class="flex-grow"><p>${ssrInterpolate(unref(lang).config?.ui?.sound_and_haptics || "Sound & Haptics")}</p></div>`);
      _push(ssrRenderComponent(_component_ToggleSwitch, {
        "model-value": unref(settings).feedbackEnabled,
        "onUpdate:modelValue": ($event) => unref(settings).toggleFeedback()
      }, null, _parent));
      _push(`</div><div class="border-t-2 border-gray-300 dark:border-gray-600"></div><div class="flex flex-row items-center"><div class="flex-grow"><p>${ssrInterpolate(unref(lang).config?.ui?.word_info || "Word Info")}</p><p class="text-xs text-neutral-500 dark:text-neutral-400">${ssrInterpolate(unref(lang).config?.ui?.word_info_desc || "Definition & AI art after game")}</p></div>`);
      _push(ssrRenderComponent(_component_ToggleSwitch, {
        "model-value": unref(settings).wordInfoEnabled,
        "onUpdate:modelValue": ($event) => unref(settings).toggleWordInfo()
      }, null, _parent));
      _push(`</div><div class="border-t-2 border-gray-300 dark:border-gray-600"></div><div><p class="text-sm font-semibold mb-2">${ssrInterpolate(unref(lang).config?.ui?.difficulty || "Difficulty")}</p><div class="flex rounded-lg overflow-hidden border border-neutral-300 dark:border-neutral-600"><button type="button" class="${ssrRenderClass([
        allowAnyWord.value && !unref(settings).hardMode ? "bg-green-500 text-white" : "bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600",
        "flex-1 py-2 px-1 text-xs font-medium transition-colors"
      ])}"> Easy </button><button type="button" class="${ssrRenderClass([
        !allowAnyWord.value && !unref(settings).hardMode ? "bg-green-500 text-white" : "bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600",
        "flex-1 py-2 px-1 text-xs font-medium transition-colors border-x border-neutral-300 dark:border-neutral-600"
      ])}"> Normal </button><button type="button" class="${ssrRenderClass([[
        unref(settings).hardMode ? "bg-green-500 text-white" : "bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600",
        canToggleHard.value ? "" : "opacity-40 cursor-not-allowed"
      ], "flex-1 py-2 px-1 text-xs font-medium transition-colors"])}"> Hard </button></div>`);
      if (allowAnyWord.value && !unref(settings).hardMode) {
        _push(`<p class="text-xs text-neutral-500 dark:text-neutral-400 mt-1"> Any word accepted, even if not in the dictionary </p>`);
      } else {
        _push(`<!---->`);
      }
      if (!allowAnyWord.value && !unref(settings).hardMode) {
        _push(`<p class="text-xs text-neutral-500 dark:text-neutral-400 mt-1"> Guesses must be valid words from the dictionary </p>`);
      } else {
        _push(`<!---->`);
      }
      if (unref(settings).hardMode) {
        _push(`<p class="text-xs text-neutral-500 dark:text-neutral-400 mt-1"> Revealed hints must be used in subsequent guesses </p>`);
      } else {
        _push(`<!---->`);
      }
      if (!canToggleHard.value) {
        _push(`<p class="text-xs text-amber-500 mt-1"> Hard mode can be enabled before your first guess tomorrow </p>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div><div class="border-t-2 border-gray-300 dark:border-gray-600"></div><div class="flex flex-row items-center"><div class="flex-grow"><p>High Contrast</p><p class="text-xs text-neutral-500 dark:text-neutral-400"> Colorblind-friendly colors </p></div>`);
      _push(ssrRenderComponent(_component_ToggleSwitch, {
        "model-value": unref(settings).highContrast,
        "onUpdate:modelValue": ($event) => unref(settings).toggleHighContrast()
      }, null, _parent));
      _push(`</div><div class="border-t-2 border-gray-300 dark:border-gray-600"></div><div class="flex flex-row items-center"><p class="flex-grow">${ssrInterpolate(unref(lang).config?.ui?.language || "Language")}</p>`);
      _push(ssrRenderComponent(_component_NuxtLink, {
        to: "/",
        class: "border border-neutral-300 dark:border-neutral-600 rounded px-3 py-1 bg-white dark:bg-neutral-700 dark:text-white text-sm hover:bg-neutral-100 dark:hover:bg-neutral-600 transition-colors"
      }, {
        default: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`${ssrInterpolate(unref(lang).config?.ui?.change_language || "Change Language")}`);
          } else {
            return [
              createTextVNode(toDisplayString(unref(lang).config?.ui?.change_language || "Change Language"), 1)
            ];
          }
        }),
        _: 1
      }, _parent));
      _push(`</div>`);
      if (Object.keys(unref(lang).keyboardLayouts).length > 1) {
        _push(`<!--[--><div class="border-t-2 border-gray-300 dark:border-gray-600"></div><div class="flex flex-row items-center"><p class="flex-grow">${ssrInterpolate(unref(lang).config?.ui?.keyboard_layout || "Keyboard layout")}</p><select${ssrRenderAttr("value", unref(lang).activeLayout)} class="border border-neutral-300 dark:border-neutral-600 rounded px-2 py-1 bg-white dark:bg-neutral-700 dark:text-white"><!--[-->`);
        ssrRenderList(unref(lang).keyboardLayouts, (meta, name) => {
          _push(`<option${ssrRenderAttr("value", name)}>${ssrInterpolate(meta.label)}</option>`);
        });
        _push(`<!--]--></select></div><!--]-->`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div></div></div></div>`);
    };
  }
});
const _sfc_setup$3 = _sfc_main$3.setup;
_sfc_main$3.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/game/SettingsModal.vue");
  return _sfc_setup$3 ? _sfc_setup$3(props, ctx) : void 0;
};
const _sfc_main$2 = /* @__PURE__ */ defineComponent({
  __name: "StatsModal",
  __ssrInlineRender: true,
  props: {
    visible: { type: Boolean }
  },
  emits: ["close"],
  setup(__props) {
    const game = useGameStore();
    const statsStore = useStatsStore();
    const lang = useLanguageStore();
    const statsTab = ref("today");
    function isCurrentGuess(n) {
      return game.gameWon && game.attempts === String(n);
    }
    function getDistributionBarWidth(n) {
      const distribution = statsStore.stats.guessDistribution;
      if (!distribution) return 0;
      const count = distribution[n] ?? 0;
      const values = Object.values(distribution);
      const maxCount = Math.max(...values, 1);
      return count > 0 ? Math.max(count / maxCount * 100, 8) : 0;
    }
    function getLanguageName(code) {
      if (code === lang.languageCode) {
        return lang.config?.name_native || lang.config?.name || code;
      }
      return code;
    }
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "fixed top-10 left-0 w-full h-full z-50 items-center flex" }, _attrs, {
        style: __props.visible ? null : { display: "none" }
      }))}><div class="modal-animate relative mx-auto w-full max-w-lg z-50 border-2 border-slate-200 dark:border-neutral-600 rounded-xl max-h-[85vh] overflow-y-auto"><div class="border-0 rounded-lg drop-shadow-xl relative flex flex-col w-full bg-white dark:bg-neutral-800 outline-none focus:outline-none"><div class="flex-initial relative mx-5 mt-5 z-50"><h3 class="flex-auto text-center text-xl font-bold"> Wordle ${ssrInterpolate(unref(lang).config?.name_native)} #${ssrInterpolate(unref(lang).todaysIdx)} ${ssrInterpolate(unref(game).attempts)}/6 </h3><button type="button" aria-label="Close" class="absolute top-0 right-0 p-1 ml-auto z-50"><span class="leading-[0.25] h-5 w-5 text-3xl text-neutral-400 block outline-none focus:outline-none"> × </span></button></div><div class="flex mx-5 mt-2 border-b border-gray-200 dark:border-gray-600" role="tablist"><button role="tab"${ssrRenderAttr("aria-selected", statsTab.value === "today")} class="${ssrRenderClass([
        statsTab.value === "today" ? "text-neutral-900 dark:text-white border-neutral-800 dark:border-neutral-200" : "text-neutral-500 dark:text-neutral-400 border-transparent hover:text-neutral-700 dark:hover:text-neutral-300",
        "flex-1 py-2 text-xs font-medium transition-colors border-b-2"
      ])}">${ssrInterpolate(unref(lang).config?.ui?.today || "Today")}</button><button role="tab"${ssrRenderAttr("aria-selected", statsTab.value === "stats")} class="${ssrRenderClass([
        statsTab.value === "stats" ? "text-neutral-900 dark:text-white border-neutral-800 dark:border-neutral-200" : "text-neutral-500 dark:text-neutral-400 border-transparent hover:text-neutral-700 dark:hover:text-neutral-300",
        "flex-1 py-2 text-xs font-medium transition-colors border-b-2"
      ])}">${ssrInterpolate(unref(lang).config?.ui?.statistics || "Stats")}</button><button role="tab"${ssrRenderAttr("aria-selected", statsTab.value === "global")} class="${ssrRenderClass([
        statsTab.value === "global" ? "text-neutral-900 dark:text-white border-neutral-800 dark:border-neutral-200" : "text-neutral-500 dark:text-neutral-400 border-transparent hover:text-neutral-700 dark:hover:text-neutral-300",
        "flex-1 py-2 text-xs font-medium transition-colors border-b-2"
      ])}">${ssrInterpolate(unref(lang).config?.ui?.all_languages || "All Languages")}</button></div><div style="${ssrRenderStyle(statsTab.value === "today" ? null : { display: "none" })}">`);
      if (unref(game).gameOver) {
        _push(`<div class="px-6 pt-3 pb-1 text-center"><a${ssrRenderAttr("href", "/" + unref(lang).languageCode + "/word/" + unref(lang).todaysIdx)} class="inline-block group"><p class="text-lg font-bold tracking-widest uppercase text-neutral-800 dark:text-neutral-100 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">${ssrInterpolate(unref(lang).todaysWord)}</p></a></div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`<div id="definition-card" class="px-6 pb-2" style="${ssrRenderStyle({ "display": "none" })}"></div><div id="word-image-card" class="px-6 pt-1 pb-2" style="${ssrRenderStyle({ "display": "none" })}"></div><div class="px-6 py-3 border-t border-gray-200 dark:border-gray-600">`);
      if (unref(game).communityPercentile !== null) {
        _push(`<div class="pb-2 text-center"><a${ssrRenderAttr("href", unref(game).communityStatsLink)} class="inline-flex items-center gap-1 text-sm text-green-600 dark:text-green-400 hover:underline">`);
        if (unref(game).communityTotal <= 1) {
          _push(`<!--[--> First to play today! <!--]-->`);
        } else if (unref(game).communityIsTopScore) {
          _push(`<!--[--> Top score today! <!--]-->`);
        } else {
          _push(`<!--[-->${ssrInterpolate(unref(lang).config?.ui?.better_than || "Better than")} ${ssrInterpolate(unref(game).communityPercentile)}% ${ssrInterpolate(unref(lang).config?.ui?.of_players || "of players")}<!--]-->`);
        }
        _push(`<svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"></path><path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z"></path></svg></a></div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`<button class="${ssrRenderClass([
        unref(game).shareButtonState === "success" ? "bg-emerald-600 scale-105" : "bg-green-500 hover:bg-green-600 active:bg-green-700",
        "w-full py-2 px-4 text-white font-semibold rounded-lg shadow-lg transition-all duration-200"
      ])}">`);
      if (unref(game).shareButtonState === "success") {
        _push(`<span> ✓ ${ssrInterpolate(unref(lang).config?.text?.copied || "Copied!")}</span>`);
      } else {
        _push(`<span>${ssrInterpolate(unref(lang).config?.text?.share)}</span>`);
      }
      _push(`</button></div><div class="flex flex-col items-center py-2 px-6 border-t border-gray-200 dark:border-gray-600"><p class="uppercase font-semibold text-xs text-neutral-500 dark:text-neutral-400">${ssrInterpolate(unref(lang).config?.text?.next_word)}</p><p class="text-2xl font-bold">${unref(game).timeUntilNextDay ?? ""}</p></div></div><div style="${ssrRenderStyle(statsTab.value === "stats" ? null : { display: "none" })}"><div class="px-6 py-3"><h4 class="text-xs font-semibold uppercase tracking-wide mb-1 text-center text-neutral-500 dark:text-neutral-400">${ssrInterpolate(unref(lang).config?.ui?.guess_distribution || "Guess Distribution")}</h4><div class="space-y-0.5"><!--[-->`);
      ssrRenderList(6, (n) => {
        _push(`<div class="flex items-center gap-1.5"><span class="w-3 text-xs font-medium">${ssrInterpolate(n)}</span><div class="flex-1 h-4 bg-gray-100 dark:bg-neutral-700 rounded-sm overflow-hidden"><div class="${ssrRenderClass([
          isCurrentGuess(n) ? "bg-green-500" : "bg-gray-400 dark:bg-gray-500",
          "h-full flex items-center justify-end px-1 text-[10px] font-bold text-white transition-all duration-300"
        ])}" style="${ssrRenderStyle({
          width: getDistributionBarWidth(n) + "%"
        })}">`);
        if (unref(statsStore).stats.guessDistribution) {
          _push(`<span>${ssrInterpolate(unref(statsStore).stats.guessDistribution[n])}</span>`);
        } else {
          _push(`<!---->`);
        }
        _push(`</div></div></div>`);
      });
      _push(`<!--]--></div></div><div class="px-4 py-3 border-t border-gray-200 dark:border-gray-600"><div class="grid grid-cols-4 gap-1"><div class="text-center"><p class="text-xl font-bold">${ssrInterpolate(unref(statsStore).stats.n_games)}</p><p class="text-[10px] text-neutral-500 dark:text-neutral-400">${ssrInterpolate(unref(lang).config?.ui?.games || "Games")}</p></div><div class="text-center"><p class="text-xl font-bold">${ssrInterpolate(Math.round(unref(statsStore).stats.win_percentage))}% </p><p class="text-[10px] text-neutral-500 dark:text-neutral-400">${ssrInterpolate(unref(lang).config?.ui?.win_percent || "Win %")}</p></div><div class="text-center"><p class="text-xl font-bold">`);
      if (unref(statsStore).stats.current_streak > 0) {
        _push(`<span> 🔥 </span>`);
      } else {
        _push(`<!---->`);
      }
      _push(` ${ssrInterpolate(unref(statsStore).stats.current_streak)}</p><p class="text-[10px] text-neutral-500 dark:text-neutral-400">${ssrInterpolate(unref(lang).config?.ui?.streak || "Streak")}</p></div><div class="text-center"><p class="text-xl font-bold">${ssrInterpolate(unref(statsStore).stats.longest_streak)}</p><p class="text-[10px] text-neutral-500 dark:text-neutral-400">${ssrInterpolate(unref(lang).config?.ui?.best || "Best")}</p></div></div></div><div class="relative flex-auto mx-6 my-3 pt-3 border-t border-gray-200 dark:border-gray-600"><p id="emoji_board" class="text-md text-center whitespace-pre-line">${unref(game).emojiBoard ?? ""}</p>`);
      if (unref(game).attempts === "0") {
        _push(`<p class="text-center text-sm text-gray-600 dark:text-gray-400">${ssrInterpolate(unref(lang).config?.text?.no_attempts)}</p>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div><div class="px-6 pb-3"><button class="${ssrRenderClass([
        unref(game).shareButtonState === "success" ? "bg-emerald-600 scale-105" : "bg-green-500 hover:bg-green-600 active:bg-green-700",
        "w-full py-2 px-4 text-white font-semibold rounded-lg shadow-lg transition-all duration-200"
      ])}">`);
      if (unref(game).shareButtonState === "success") {
        _push(`<span> ✓ ${ssrInterpolate(unref(lang).config?.text?.copied || "Copied!")}</span>`);
      } else {
        _push(`<span>${ssrInterpolate(unref(lang).config?.text?.share)}</span>`);
      }
      _push(`</button></div></div><div style="${ssrRenderStyle(statsTab.value === "global" ? null : { display: "none" })}"><div class="px-4 py-3"><div class="grid grid-cols-4 gap-1 mb-2"><div class="text-center"><p class="text-xl font-bold">${ssrInterpolate(unref(statsStore).totalStats.total_games)}</p><p class="text-[10px] text-neutral-500 dark:text-neutral-400">${ssrInterpolate(unref(lang).config?.ui?.games || "Games")}</p></div><div class="text-center"><p class="text-xl font-bold">${ssrInterpolate(Math.round(
        unref(statsStore).totalStats.total_win_percentage
      ))}% </p><p class="text-[10px] text-neutral-500 dark:text-neutral-400">${ssrInterpolate(unref(lang).config?.ui?.win_percent || "Win %")}</p></div><div class="text-center"><p class="text-xl font-bold">`);
      if (unref(statsStore).totalStats.current_overall_streak > 0) {
        _push(`<span> 🔥 </span>`);
      } else {
        _push(`<!---->`);
      }
      _push(` ${ssrInterpolate(unref(statsStore).totalStats.current_overall_streak)}</p><p class="text-[10px] text-neutral-500 dark:text-neutral-400">${ssrInterpolate(unref(lang).config?.ui?.streak || "Streak")}</p></div><div class="text-center"><p class="text-xl font-bold">${ssrInterpolate(unref(statsStore).totalStats.languages_won?.length || 0)}</p><p class="text-[10px] text-neutral-500 dark:text-neutral-400">${ssrInterpolate(unref(lang).config?.ui?.languages || "Languages")}</p></div></div>`);
      if (Object.keys(
        unref(statsStore).totalStats.game_stats || {}
      ).length > 0) {
        _push(`<div class="max-h-32 overflow-y-auto border-t border-neutral-200 dark:border-neutral-600 pt-1"><!--[-->`);
        ssrRenderList(unref(statsStore).totalStats.game_stats, (langStats, code) => {
          _push(`<div class="flex items-center justify-between py-1 text-xs"><span class="font-medium">${ssrInterpolate(getLanguageName(code))}</span><span class="text-neutral-500 dark:text-neutral-400">${ssrInterpolate(langStats.n_games)} · ${ssrInterpolate(Math.round(langStats.win_percentage))}% `);
          if (langStats.current_streak > 0) {
            _push(`<span class="text-orange-500 ml-1"> 🔥${ssrInterpolate(langStats.current_streak)}</span>`);
          } else {
            _push(`<!---->`);
          }
          _push(`</span></div>`);
        });
        _push(`<!--]--></div>`);
      } else {
        _push(`<p class="text-xs text-neutral-500 dark:text-neutral-400 text-center pt-1 border-t border-neutral-200 dark:border-neutral-600">${ssrInterpolate(unref(lang).config?.ui?.play_more_languages || "Play more languages to see your global stats!")}</p>`);
      }
      _push(`</div></div></div></div></div>`);
    };
  }
});
const _sfc_setup$2 = _sfc_main$2.setup;
_sfc_main$2.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/game/StatsModal.vue");
  return _sfc_setup$2 ? _sfc_setup$2(props, ctx) : void 0;
};
const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "NotificationToast",
  __ssrInlineRender: true,
  props: {
    notification: {}
  },
  setup(__props) {
    return (_ctx, _push, _parent, _attrs) => {
      if (__props.notification.show) {
        _push(`<div${ssrRenderAttrs(mergeProps({
          class: ["fixed top-0 inset-x-0 mx-auto z-50 max-w-xs justify-items-center text-center transition-opacity duration-300", { "opacity-0": __props.notification.fading }]
        }, _attrs))}><div class="top-50 bg-black p-4 m-4 rounded-lg shadow-lg" style="${ssrRenderStyle({ top: __props.notification.top + "px" })}"><p class="font-bold text-white">${ssrInterpolate(__props.notification.message)}</p></div></div>`);
      } else {
        _push(`<!---->`);
      }
    };
  }
});
const _sfc_setup$1 = _sfc_main$1.setup;
_sfc_main$1.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/game/NotificationToast.vue");
  return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "index",
  __ssrInlineRender: true,
  async setup(__props) {
    let __temp, __restore;
    const route = useRoute();
    const lang = route.params.lang;
    const { data: gameData, error } = ([__temp, __restore] = withAsyncContext(() => useFetch(
      `/api/${lang}/data`,
      "$8mKy0Ag6h8"
      /* nuxt-injected */
    )), __temp = await __temp, __restore(), __temp);
    if (error.value || !gameData.value) {
      throw createError({ statusCode: 404, message: "Language not found" });
    }
    const langStore = useLanguageStore();
    const game = useGameStore();
    useSettingsStore();
    useStatsStore();
    langStore.init({
      word_list: gameData.value.word_list,
      word_list_supplement: gameData.value.word_list_supplement,
      characters: gameData.value.characters,
      config: gameData.value.config,
      todays_idx: gameData.value.todays_idx,
      todays_word: gameData.value.todays_word,
      timezone_offset: gameData.value.timezone_offset,
      keyboard: gameData.value.keyboard,
      keyboard_layouts: gameData.value.keyboard_layouts,
      keyboard_layout_name: gameData.value.keyboard_layout_name,
      key_diacritic_hints: gameData.value.key_diacritic_hints
    });
    const config = gameData.value.config;
    const wordleTitle = `Wordle ${config.name_native || config.name}`;
    useSeoMeta({
      title: `${wordleTitle} — ${config.meta?.title || "Daily Word Puzzle"}`,
      description: config.meta?.description || `Play Wordle in ${config.name}. Guess the daily 5-letter word!`,
      ogTitle: wordleTitle,
      ogDescription: config.meta?.description || `Play Wordle in ${config.name}`,
      ogUrl: `https://wordle.global/${lang}`,
      ogType: "website",
      ogLocale: config.meta?.locale || lang,
      ogImage: `https://wordle.global/images/share/${lang}_1.png`,
      twitterCard: "summary_large_image"
    });
    useHead({
      htmlAttrs: {
        lang: config.meta?.locale?.split("_")[0] || lang,
        dir: langStore.rightToLeft ? "rtl" : "ltr",
        translate: "no"
      },
      meta: [{ name: "google", content: "notranslate" }],
      link: [{ rel: "canonical", href: `https://wordle.global/${lang}` }]
    });
    return (_ctx, _push, _parent, _attrs) => {
      const _component_GameHeader = _sfc_main$8;
      const _component_GameBoard = _sfc_main$7;
      const _component_GameKeyboard = _sfc_main$6;
      const _component_SharedModalBackdrop = _sfc_main$5;
      const _component_GameHelpModal = _sfc_main$4;
      const _component_GameSettingsModal = _sfc_main$3;
      const _component_GameStatsModal = _sfc_main$2;
      const _component_GameNotificationToast = _sfc_main$1;
      if (unref(gameData)) {
        _push(`<div${ssrRenderAttrs(mergeProps({ class: "min-h-[100dvh] h-[100dvh] overflow-hidden overscroll-none" }, _attrs))}><div class="wrapper container mx-auto flex flex-col h-full w-full max-w-lg safe-area-inset">`);
        _push(ssrRenderComponent(_component_GameHeader, {
          "lang-code": unref(lang),
          onHelp: ($event) => unref(game).showHelpModal = true,
          onStats: ($event) => unref(game).showStatsModal = true,
          onSettings: ($event) => unref(game).showOptionsModal = true
        }, null, _parent));
        _push(ssrRenderComponent(_component_GameBoard, null, null, _parent));
        _push(ssrRenderComponent(_component_GameKeyboard, {
          keyboard: unref(langStore).keyboard,
          hints: unref(langStore).keyDiacriticHints
        }, null, _parent));
        _push(`</div>`);
        _push(ssrRenderComponent(_component_SharedModalBackdrop, {
          visible: unref(game).showHelpModal || unref(game).showStatsModal || unref(game).showOptionsModal,
          onClose: ($event) => {
            unref(game).showHelpModal = false;
            unref(game).showStatsModal = false;
            unref(game).showOptionsModal = false;
          }
        }, null, _parent));
        _push(ssrRenderComponent(_component_GameHelpModal, {
          visible: unref(game).showHelpModal,
          onClose: ($event) => unref(game).showHelpModal = false
        }, null, _parent));
        _push(ssrRenderComponent(_component_GameSettingsModal, {
          visible: unref(game).showOptionsModal,
          onClose: ($event) => unref(game).showOptionsModal = false
        }, null, _parent));
        _push(ssrRenderComponent(_component_GameStatsModal, {
          visible: unref(game).showStatsModal,
          onClose: ($event) => unref(game).showStatsModal = false
        }, null, _parent));
        _push(ssrRenderComponent(_component_GameNotificationToast, {
          notification: unref(game).notification
        }, null, _parent));
        _push(`</div>`);
      } else {
        _push(`<!---->`);
      }
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/[lang]/index.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
export {
  _sfc_main as default
};
//# sourceMappingURL=index-BH-xFwCE.js.map
