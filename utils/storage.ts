/**
 * Safe localStorage utilities with SSR guards.
 *
 * All functions are safe to call during SSR (return defaults) and in
 * private browsing (catch quota/access errors). Used across stores,
 * composables, and plugins for consistent persistence.
 */

// ---------------------------------------------------------------------------
// Storage key constants
// ---------------------------------------------------------------------------

export const STORAGE_KEYS = {
    GAME_RESULTS: 'game_results',
    SPEED_RESULTS: 'speed_results',
    LAST_PULL_AT: 'last_pull_at',
    STORAGE_VERSION: 'storage_version',
    PENDING_SYNC: 'pending_sync',
    CLIENT_ID: 'client_id',
    PREFERRED_LANGUAGE: 'preferred_language',
} as const;

// ---------------------------------------------------------------------------
// User-scoped storage — Pattern B (server is truth, localStorage is cache)
// ---------------------------------------------------------------------------

/** The currently authenticated user ID, or null for anonymous/guest play. */
let _activeUserId: string | null = null;

/** Set the active user ID. Called by sync plugin on login and auth on logout. */
export function setActiveUserId(userId: string | null): void {
    _activeUserId = userId;
}

/** Get the active user ID (null = anonymous). */
export function getActiveUserId(): string | null {
    return _activeUserId;
}

/**
 * Resolve a storage key to its user-scoped variant.
 * - Authenticated: `"game_results:abc123"`
 * - Anonymous:     `"game_results"`
 */
export function scopedKey(base: string): string {
    return _activeUserId ? `${base}:${_activeUserId}` : base;
}

/**
 * One-time migration from unscoped (v1) to user-scoped (v2) storage.
 *
 * v1 layout: `game_results`, `speed_results`, `results_claimed_by`
 * v2 layout: `game_results:{userId}`, `speed_results:{userId}`
 *
 * Runs once per browser. Idempotent — safe to call multiple times.
 * Also cleans up the old `game_results__{userId}` archive keys from
 * the intermediate archive approach.
 */
export function runStorageMigration(): void {
    if (!import.meta.client) return;
    if (readLocal(STORAGE_KEYS.STORAGE_VERSION) === '2') return;

    const claimedBy = readLocal('results_claimed_by');
    if (claimedBy) {
        // Copy anonymous data to the user who claimed it
        const game = readJson<unknown>(STORAGE_KEYS.GAME_RESULTS);
        const speed = readJson<unknown>(STORAGE_KEYS.SPEED_RESULTS);
        if (game && typeof game === 'object' && Object.keys(game).length > 0) {
            writeJson(`${STORAGE_KEYS.GAME_RESULTS}:${claimedBy}`, game);
        }
        if (speed && typeof speed === 'object' && Object.keys(speed).length > 0) {
            writeJson(`${STORAGE_KEYS.SPEED_RESULTS}:${claimedBy}`, speed);
        }
        // Clear anonymous keys (guest starts fresh)
        writeJson(STORAGE_KEYS.GAME_RESULTS, {});
        writeJson(STORAGE_KEYS.SPEED_RESULTS, {});
        removeLocal('results_claimed_by');
        removeLocal(STORAGE_KEYS.LAST_PULL_AT);

        // Migrate last_pull_at to scoped key
        // (no value to preserve — server pull will re-run)
    }

    // Clean up intermediate archive keys (game_results__{userId})
    // from the earlier archive approach, if any exist
    try {
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (
                key &&
                (key.startsWith(`${STORAGE_KEYS.GAME_RESULTS}__`) ||
                    key.startsWith(`${STORAGE_KEYS.SPEED_RESULTS}__`))
            ) {
                // Migrate archive data to new scoped format if not already present
                const archivedUserId = key.split('__')[1];
                if (archivedUserId) {
                    const newKey = key.replace('__', ':');
                    if (!readLocal(newKey)) {
                        const data = readJson<unknown>(key);
                        if (data) writeJson(newKey, data);
                    }
                }
                localStorage.removeItem(key);
            }
        }
    } catch {
        // Private browsing or quota — non-critical
    }

    writeLocal(STORAGE_KEYS.STORAGE_VERSION, '2');
}

// ---------------------------------------------------------------------------
// Core read/write
// ---------------------------------------------------------------------------

/** Read a string value from localStorage. Returns null on SSR or error. */
export function readLocal(key: string): string | null {
    if (!import.meta.client) return null;
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

/** Write a string value to localStorage. No-ops on SSR or error. */
export function writeLocal(key: string, value: string): void {
    if (!import.meta.client) return;
    try {
        localStorage.setItem(key, value);
    } catch {
        // quota exceeded or private browsing
    }
}

/** Remove a key from localStorage. No-ops on SSR or error. */
export function removeLocal(key: string): void {
    if (!import.meta.client) return;
    try {
        localStorage.removeItem(key);
    } catch {}
}

// ---------------------------------------------------------------------------
// Typed helpers
// ---------------------------------------------------------------------------

/** Read a boolean from localStorage (stored as 'true'/'false'). */
export function readBool(key: string, defaultValue: boolean = false): boolean {
    const val = readLocal(key);
    if (val === null) return defaultValue;
    return val === 'true';
}

/** Write a boolean to localStorage. */
export function writeBool(key: string, value: boolean): void {
    writeLocal(key, value ? 'true' : 'false');
}

/** Read and parse a JSON value from localStorage. Returns null on error. */
export function readJson<T>(key: string): T | null {
    const raw = readLocal(key);
    if (raw === null) return null;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
}

/** Serialize and write a JSON value to localStorage. */
export function writeJson(key: string, value: unknown): void {
    try {
        writeLocal(key, JSON.stringify(value));
    } catch {}
}

// ---------------------------------------------------------------------------
// Patterns
// ---------------------------------------------------------------------------

/**
 * Get or create a persistent UUID (for client_id, device_id, etc.).
 * The ID is generated once and persisted permanently.
 */
export function getOrCreateId(key: string): string {
    if (!import.meta.client) return 'unknown';
    const existing = readLocal(key);
    if (existing) return existing;
    const id = crypto.randomUUID();
    writeLocal(key, id);
    return id;
}

/**
 * Check if a dismissible item is still within its cooldown period.
 * Used for PWA install banners, embed banners, etc.
 */
export function isDismissedWithCooldown(key: string, durationMs: number): boolean {
    const raw = readLocal(key);
    if (!raw) return false;
    const elapsed = Date.now() - parseInt(raw, 10);
    return elapsed < durationMs;
}

/** Record a dismissal timestamp. */
export function dismissWithCooldown(key: string): void {
    writeLocal(key, Date.now().toString());
}

// ---------------------------------------------------------------------------
// Platform detection
// ---------------------------------------------------------------------------

/** Check if running as installed PWA (standalone mode). SSR-safe. */
export function isStandalone(): boolean {
    if (!import.meta.client) return false;
    return (
        window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true
    );
}
