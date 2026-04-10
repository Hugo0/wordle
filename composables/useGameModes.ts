/**
 * Game mode UI metadata — derives from GAME_MODE_CONFIG (single source of truth)
 * and adds Vue-specific fields (icons). No data duplication.
 *
 * Used by: homepage mode cards, sidebar, GameModePicker modal.
 */
import {
    Square,
    Infinity as InfinityIcon,
    Columns2,
    Grid2x2,
    Grid3x3,
    Grip,
    BrickWall,
    Zap,
    Compass,
    PenLine,
    Users,
} from 'lucide-vue-next';
import type { Component } from 'vue';
import { GAME_MODE_CONFIG, GAME_MODE_ORDER } from '~/utils/game-modes';
import type { GameMode } from '~/utils/game-modes';

/** Icon mapping — the only field that can't live in utils/ (Vue component refs). */
const MODE_ICONS: Record<string, Component> = {
    classic: Square,
    unlimited: InfinityIcon,
    speed: Zap,
    dordle: Columns2,
    quordle: Grid2x2,
    octordle: Grid3x3,
    sedecordle: Grip,
    duotrigordle: BrickWall,
    semantic: Compass,
    custom: PenLine,
    party: Users,
};

export interface GameModeUI {
    id: GameMode;
    icon: Component;
    label: string;
    description: string;
    routeSuffix: string;
    enabled: boolean;
    badge?: string;
    /** If set, mode only appears in the sidebar for these language codes. */
    languages?: string[];
}

/**
 * All game modes in display order, derived from GAME_MODE_CONFIG.
 * Adding a mode to GAME_MODE_CONFIG automatically surfaces it here.
 */
export const GAME_MODES_UI: GameModeUI[] = GAME_MODE_ORDER.map((id) => {
    const def = GAME_MODE_CONFIG[id];
    return {
        id,
        icon: MODE_ICONS[id] || Square,
        label: def.label,
        description: def.description,
        routeSuffix: def.routeSuffix,
        enabled: def.enabled,
        badge: def.badge,
        languages: def.languages ? [...def.languages] : undefined,
    };
});

/**
 * Get the route for a game mode given a language code.
 */
export function getModeRoute(mode: GameModeUI, langCode: string): string | null {
    if (!mode.enabled) return null;
    return mode.routeSuffix ? `/${langCode}/${mode.routeSuffix}` : `/${langCode}`;
}

/**
 * Get a translatable label for a game mode, falling back to the static English label.
 * Config keys follow the pattern: mode_{id}_label
 */
export function getModeLabel(mode: GameModeUI, ui?: Record<string, any>): string {
    const key = `mode_${mode.id}_label`;
    return (ui?.[key] as string) || mode.label;
}

/**
 * Get a translatable description for a game mode, falling back to the static English description.
 * Config keys follow the pattern: mode_{id}_desc
 */
export function getModeDescription(mode: GameModeUI, ui?: Record<string, any>): string {
    const key = `mode_${mode.id}_desc`;
    return (ui?.[key] as string) || mode.description;
}
