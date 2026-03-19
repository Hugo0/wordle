/**
 * Safe localStorage utilities with SSR guards.
 *
 * All functions are safe to call during SSR (return defaults) and in
 * private browsing (catch quota/access errors). Used across stores,
 * composables, and plugins for consistent persistence.
 */

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
    try {
        let id = localStorage.getItem(key);
        if (!id) {
            id = crypto.randomUUID();
            localStorage.setItem(key, id);
        }
        return id;
    } catch {
        return 'unknown';
    }
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
