/**
 * useSemanticGame — client-side state for the Semantic Explorer game mode.
 *
 * Owns: guesses list, session id, map mode (UMAP vs axis slice), compass
 * hints, LLM hint state. Does NOT use the main `game` Pinia store (that's
 * for tile-based games); semantic state is local to the page.
 *
 * Syncs to the stats store at end-of-game via recordGameResult.
 */

import { computed, ref } from 'vue';
import { readJson, removeLocal, writeJson } from '~/utils/storage';
import { GAME_MODE_CONFIG } from '~/utils/game-modes';

/** The LLM-hint button unlocks after this many guesses. */
export const LLM_HINT_UNLOCK_AT = 5;

/** One compass row — mirrors server-side `CompassHint` in server/utils/semantic.ts.
 *  Copy is rendered from anchor words directly ("more like X than Y"); magnitude
 *  tier comes from the fraction of the travel direction this axis explains. */
export type CompassHint = {
    axis: string;
    lowAnchor: string;
    highAnchor: string;
    /** sign of (axis · r) — 'positive' means target is on the high-anchor side of guess */
    direction: 'positive' | 'negative';
    magnitudeTier: 'slight' | 'clear' | 'strong';
    /** signed projection (axis · r) in raw embedding space */
    delta: number;
    /** (axis · r)² / ‖r‖² — fraction of travel direction captured by this axis */
    explained: number;
};

/** Server-reported compass status:
 *    'ok'    → show hints as usual
 *    'close' → target and guess are too similar for meaningful hints;
 *              show a "you're close, try a different angle" fallback */
export type CompassStatus = 'ok' | 'close';

export type SemanticGuess = {
    word: string;
    /** 1-indexed rank in target's cosine-sorted neighbour list */
    rank: number;
    /** Total ranked neighbours (vocab size) */
    totalRanked: number;
    /** Log-scaled display value [0, 1] derived from rank */
    display: number;
    umapPosition: [number, number];
    /** Per-axis projection cache — used for client-side axis slice rendering */
    allProjectionsNormalized: Record<string, number>;
    compass: CompassHint[];
    compassStatus: CompassStatus;
    /** Fraction of ‖target − guess‖² captured by the chosen axis subspace */
    compassExplained: number;
    guessNumber: number;
};

export type Neighbour = {
    word: string;
    rank: number;
    totalRanked: number;
    display: number;
    umapPosition: [number, number];
    allProjectionsNormalized: Record<string, number>;
};

/** Compass slice view: 'umap' = target-centered rank-polar (default),
 *  'slice' = 2-axis anchor projection for compass-driven drilldown. */
export type MapMode = 'umap' | 'slice';

type StartResponse = {
    targetId: string;
    lang: string;
    dayIdx: number;
    vocabularySize: number;
    axes: string[];
    axesCoherence: Record<string, number>;
    axisAnchors: Record<string, { low: string; high: string }>;
    modelName: string;
    targetUmapPosition: [number, number];
    maxGuesses: number;
    totalRanked: number;
};

type GuessResponse = {
    valid: boolean;
    word?: string;
    reason?: string;
    rank?: number;
    totalRanked?: number;
    display?: number;
    similarity?: number;
    umapPosition?: [number, number];
    allProjectionsNormalized?: Record<string, number>;
    compass?: CompassHint[];
    compassStatus?: CompassStatus;
    compassExplained?: number;
    won?: boolean;
    guessNumber?: number;
    targetWord?: string;
};

type HintResponse = {
    hint: string | null;
    cached?: boolean;
    error?: string;
};

type RevealResponse = {
    targetWord: string;
    targetUmapPosition: [number, number];
    neighbours: Neighbour[];
};

/** Shape of the data we persist to localStorage. Minimal: just the bits
 *  that can't be re-derived from the server session. */
type SavedSemanticState = {
    dayIdx: number;
    guesses: SemanticGuess[];
    won: boolean;
    gameOver: boolean;
    llmHint: string | null;
    llmHintUsed: boolean;
    finalTargetWord: string | null;
    neighbours: Neighbour[];
};

function storageKey(lang: string, play?: string): string {
    return play === 'unlimited' ? `semantic_game_${lang}_unlimited` : `semantic_game_${lang}`;
}

export function useSemanticGame(lang: string) {
    // ── Session / meta ────────────────────────────────────────────────────
    let _currentPlay: string = 'daily'; // tracks daily vs unlimited for storage key
    const targetId = ref<string | null>(null);
    const dayIdx = ref<number>(0);
    const axisAnchors = ref<Record<string, { low: string; high: string }>>({});
    const targetUmapPosition = ref<[number, number]>([0.5, 0.5]);
    const maxGuesses = ref(GAME_MODE_CONFIG.semantic.maxGuesses);

    // ── Game state ────────────────────────────────────────────────────────
    const guesses = ref<SemanticGuess[]>([]);
    const won = ref(false);
    const gameOver = ref(false);
    const finalTargetWord = ref<string | null>(null);
    const neighbours = ref<Neighbour[]>([]);
    const starting = ref(false);
    const loading = ref(false);
    const invalidMessage = ref('');

    // ── LLM hint (once per game) ─────────────────────────────────────────
    const llmHint = ref<string | null>(null);
    const llmHintLoading = ref(false);
    const llmHintUsed = ref(false);

    // ── Wiggle signal for duplicate guesses ──────────────────────────────
    // The map watches this tuple; when the token changes it wiggles the dot
    // for the named word. Token increments so repeat-wiggles still fire.
    const wiggleSignal = ref<{ word: string; token: number } | null>(null);
    let wiggleToken = 0;
    function triggerWiggle(word: string) {
        wiggleToken += 1;
        wiggleSignal.value = { word, token: wiggleToken };
    }

    // ── Highlight signal: hovering a guess in the sidebar list pops the
    //    matching dot on the map. null = nothing highlighted.
    const highlightedWord = ref<string | null>(null);
    function setHighlightedWord(word: string | null) {
        highlightedWord.value = word;
    }

    // ── New-best signal: fires once when the player beats their previous
    //    best rank. Consumed by the leaderboard (sparkle + flash) and the
    //    map (target pulse). Token increments on each improvement so repeat
    //    bests re-trigger. The token lives inside the signal object so
    //    there's only one source of truth.
    const newBestSignal = ref<{ word: string; rank: number; token: number } | null>(null);
    let _prevBestRank: number | null = null;
    function triggerNewBest(word: string, rank: number) {
        const nextToken = (newBestSignal.value?.token ?? 0) + 1;
        newBestSignal.value = { word, rank, token: nextToken };
    }

    // ── Map view state ────────────────────────────────────────────────────
    const mapMode = ref<MapMode>('umap');
    /** When in slice mode: the pair of axis names defining the current 2D projection */
    const sliceAxes = ref<[string, string] | null>(null);

    const totalRanked = ref(0);

    // ── Derived ───────────────────────────────────────────────────────────
    const lastGuess = computed(() => guesses.value[guesses.value.length - 1] ?? null);
    /** The player's closest guess so far — the leaderboard hero. */
    const bestGuess = computed<SemanticGuess | null>(() => {
        if (!guesses.value.length) return null;
        return guesses.value.reduce((best, g) => (g.rank < best.rank ? g : best));
    });
    /** Guesses sorted closest first — the leaderboard order. */
    const sortedGuesses = computed(() => [...guesses.value].sort((a, b) => a.rank - b.rank));
    /** Number of guesses the player has made since their last new best.
     *  Used by the oracle nudge after prolonged stagnation. */
    const guessesSinceBest = computed(() => {
        if (!bestGuess.value || !guesses.value.length) return 0;
        const bestIdx = guesses.value.findIndex((g) => g.word === bestGuess.value!.word);
        return guesses.value.length - 1 - bestIdx;
    });
    // Always show the top 2 compass hints for the latest guess — do NOT
    // Show compass from the BEST guess (closest to target), not the last.
    // When the player regresses, the best guess's hints are more actionable
    // because they're computed from the target's neighborhood.
    const compassSource = computed(() => bestGuess.value ?? lastGuess.value);
    const lastCompass = computed<CompassHint[]>(
        () => compassSource.value?.compass?.slice(0, 2) ?? []
    );
    const lastCompassStatus = computed<CompassStatus | null>(
        () => compassSource.value?.compassStatus ?? null
    );
    const guessesRemaining = computed(() => maxGuesses.value - guesses.value.length);
    const llmHintUnlocked = computed(() => guesses.value.length >= LLM_HINT_UNLOCK_AT);
    const canSubmit = computed(
        () => !!targetId.value && !gameOver.value && !loading.value && !starting.value
    );

    // ── Actions ───────────────────────────────────────────────────────────
    async function startGame(
        opts: { target?: string; debug?: boolean; forceNew?: boolean; play?: string } = {}
    ) {
        if (starting.value) return; // Guard against overlapping calls
        starting.value = true;
        invalidMessage.value = '';
        mapMode.value = 'umap';
        sliceAxes.value = null;
        newBestSignal.value = null;
        _currentPlay = opts.play ?? 'daily';

        try {
            const resp = await $fetch<StartResponse>(`/api/${lang}/semantic/start`, {
                method: 'POST',
                body: {
                    target: opts.target,
                    debug: opts.debug,
                    play: opts.play,
                },
            });
            targetId.value = resp.targetId;
            dayIdx.value = resp.dayIdx;
            axisAnchors.value = resp.axisAnchors;
            targetUmapPosition.value = resp.targetUmapPosition;
            maxGuesses.value = resp.maxGuesses ?? GAME_MODE_CONFIG.semantic.maxGuesses;
            totalRanked.value = resp.totalRanked ?? resp.vocabularySize;

            // Attempt to restore saved state for the same daily word.
            // Skip restoration when a target override is active (debug/share)
            // or when the caller explicitly wants a fresh game.
            if (!opts.forceNew && !opts.target && restoreState(resp.dayIdx)) {
                // State restored — we have a fresh targetId for any new guesses
                // but the guess list, won/gameOver, hints are from localStorage.
                return;
            }

            // No saved state (or different day) — fresh game.
            guesses.value = [];
            won.value = false;
            gameOver.value = false;
            finalTargetWord.value = null;
            neighbours.value = [];
            llmHint.value = null;
            llmHintUsed.value = false;
            _prevBestRank = null;
            removeLocal(storageKey(lang, _currentPlay));
        } catch (e) {
            console.warn('[semantic-game] start failed', e);
            invalidMessage.value = 'Could not start game. Retry?';
        } finally {
            starting.value = false;
        }
    }

    async function submitGuess(rawWord: string): Promise<boolean> {
        const word = rawWord.toLowerCase().trim();
        if (!word || !canSubmit.value) return false;
        invalidMessage.value = '';
        loading.value = true;
        // Auto-exit slice view before a new guess — feels cleaner, and avoids
        // showing stale slice axes next to a fresh guess.
        if (mapMode.value === 'slice') {
            exitAxisSlice();
        }
        try {
            const resp = await $fetch<GuessResponse>(`/api/${lang}/semantic/guess`, {
                method: 'POST',
                body: {
                    targetId: targetId.value,
                    word,
                    guessNumber: guesses.value.length + 1,
                },
            });

            if (!resp.valid) {
                const reason = resp.reason;
                if (reason === 'bad_format') {
                    invalidMessage.value = `"${word}" isn't a single word.`;
                } else if (reason === 'not_a_word') {
                    invalidMessage.value = `"${word}" isn't in the dictionary.`;
                } else if (reason === 'embedding_failed') {
                    invalidMessage.value = `Couldn't look up "${word}". Try another word.`;
                } else {
                    invalidMessage.value = `Not a valid word: "${word}"`;
                }
                return false;
            }

            // Dedup: don't re-add the same word if the player submits it twice.
            // Wiggle the existing dot on the map to visually flag it.
            const existing = guesses.value.findIndex((g) => g.word === resp.word);
            if (existing >= 0) {
                invalidMessage.value = `Already guessed "${resp.word}"`;
                triggerWiggle(resp.word!);
                return false;
            }

            const guess: SemanticGuess = {
                word: resp.word!,
                rank: resp.rank ?? totalRanked.value,
                totalRanked: resp.totalRanked ?? totalRanked.value,
                display: resp.display ?? 0,
                umapPosition: resp.umapPosition ?? [0.5, 0.5],
                allProjectionsNormalized: resp.allProjectionsNormalized ?? {},
                compass: resp.compass ?? [],
                compassStatus: resp.compassStatus ?? 'ok',
                compassExplained: resp.compassExplained ?? 0,
                guessNumber: resp.guessNumber ?? guesses.value.length + 1,
            };
            guesses.value.push(guess);

            // New-best detection — fires when this guess beats the previous
            // best rank (or is the very first guess). Both leaderboard and map
            // watch the signal for celebratory effects.
            if (_prevBestRank === null || guess.rank < _prevBestRank) {
                triggerNewBest(guess.word, guess.rank);
                _prevBestRank = guess.rank;
            }

            if (resp.won || guesses.value.length >= maxGuesses.value) {
                won.value = !!resp.won;
                gameOver.value = true;
                // fetchReveal() always populates finalTargetWord; no need to
                // set it separately from resp.targetWord.
                await fetchReveal();
            }

            saveState();
            return true;
        } catch (e: unknown) {
            const status = (e as { statusCode?: number })?.statusCode;
            if (status === 404) {
                invalidMessage.value = 'Session expired — start a new game.';
                gameOver.value = true;
            } else {
                invalidMessage.value = 'Something went wrong. Retry?';
            }
            return false;
        } finally {
            loading.value = false;
        }
    }

    async function requestLlmHint(): Promise<void> {
        if (llmHintUsed.value || !llmHintUnlocked.value || llmHintLoading.value) return;
        if (!targetId.value) return;
        llmHintLoading.value = true;
        try {
            const resp = await $fetch<HintResponse>(`/api/${lang}/semantic/hint`, {
                method: 'POST',
                body: {
                    targetId: targetId.value,
                    previousGuesses: guesses.value.map((g) => g.word),
                },
            });
            if (resp.hint) {
                llmHint.value = resp.hint;
                llmHintUsed.value = true;
                saveState();
            }
        } catch (e) {
            console.warn('[semantic-game] hint failed', e);
        } finally {
            llmHintLoading.value = false;
        }
    }

    async function fetchReveal(): Promise<void> {
        if (!targetId.value) return;
        try {
            const resp = await $fetch<RevealResponse>(`/api/${lang}/semantic/reveal`, {
                method: 'POST',
                body: {
                    targetId: targetId.value,
                    exclude: guesses.value.map((g) => g.word),
                    k: 8,
                },
            });
            finalTargetWord.value = resp.targetWord;
            // Don't reassign targetUmapPosition unless it actually changed —
            // a no-op assignment still triggers reactive watchers that rebuild
            // all dots with a tween, causing a visible "shift" on game end.
            const [ox, oy] = targetUmapPosition.value;
            const [nx, ny] = resp.targetUmapPosition;
            if (Math.abs(ox - nx) > 1e-6 || Math.abs(oy - ny) > 1e-6) {
                targetUmapPosition.value = resp.targetUmapPosition;
            }
            neighbours.value = resp.neighbours ?? [];
        } catch (e) {
            console.warn('[semantic-game] reveal failed', e);
        }
    }

    function enterAxisSlice(axisA: string, axisB: string) {
        sliceAxes.value = [axisA, axisB];
        mapMode.value = 'slice';
    }

    function exitAxisSlice() {
        mapMode.value = 'umap';
        sliceAxes.value = null;
    }

    // ── Persistence ──────────────────────────────────────────────────────
    function saveState() {
        const state: SavedSemanticState = {
            dayIdx: dayIdx.value,
            guesses: guesses.value,
            won: won.value,
            gameOver: gameOver.value,
            llmHint: llmHint.value,
            llmHintUsed: llmHintUsed.value,
            finalTargetWord: finalTargetWord.value,
            neighbours: neighbours.value,
        };
        writeJson(storageKey(lang, _currentPlay), state);
    }

    /** Try to restore saved state for the current day. Returns true if
     *  state was successfully restored, false if no matching save exists. */
    function restoreState(currentDayIdx: number): boolean {
        const saved = readJson<SavedSemanticState>(storageKey(lang, _currentPlay));
        if (!saved || saved.dayIdx !== currentDayIdx) return false;
        if (!saved.guesses?.length) return false;
        // If game ended but target word was never revealed (session expired
        // before reveal API call), the state is corrupt — start fresh.
        if (saved.gameOver && !saved.finalTargetWord) return false;

        guesses.value = saved.guesses;
        won.value = saved.won;
        gameOver.value = saved.gameOver;
        llmHint.value = saved.llmHint;
        llmHintUsed.value = saved.llmHintUsed;
        finalTargetWord.value = saved.finalTargetWord;
        neighbours.value = saved.neighbours ?? [];

        // Rebuild _prevBestRank so new-best detection continues correctly
        const best = guesses.value.reduce((b, g) => (g.rank < b.rank ? g : b));
        _prevBestRank = best.rank;

        return true;
    }

    function toggleAxisSliceFromCompass() {
        // Clicking the slice button in slice mode always exits back to the
        // default UMAP map, regardless of which axes are currently displayed.
        if (mapMode.value === 'slice') {
            exitAxisSlice();
            return;
        }
        // Enter slice mode using the top 2 compass axes from the last guess.
        // After game over the last guess may have no compass hints (e.g. the
        // target word itself), so fall back to any 2 available axes.
        const currentCompass = lastCompass.value;
        if (currentCompass.length >= 2) {
            enterAxisSlice(currentCompass[0]!.axis, currentCompass[1]!.axis);
            return;
        }
        const availableAxes = Object.keys(axisAnchors.value);
        if (availableAxes.length >= 2) {
            enterAxisSlice(availableAxes[0]!, availableAxes[1]!);
        }
    }

    return {
        // meta
        dayIdx,
        axisAnchors,
        targetUmapPosition,
        maxGuesses,
        // state
        guesses,
        won,
        gameOver,
        finalTargetWord,
        neighbours,
        starting,
        loading,
        invalidMessage,
        // llm hint
        llmHint,
        llmHintLoading,
        llmHintUsed,
        llmHintUnlocked,
        // map view
        mapMode,
        sliceAxes,
        wiggleSignal,
        highlightedWord,
        newBestSignal,
        totalRanked,
        // derived
        bestGuess,
        sortedGuesses,
        guessesSinceBest,
        lastCompass,
        lastCompassStatus,
        guessesRemaining,
        // actions
        startGame,
        submitGuess,
        requestLlmHint,
        toggleAxisSliceFromCompass,
        setHighlightedWord,
    };
}
