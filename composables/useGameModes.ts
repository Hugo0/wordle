/**
 * Single source of truth for game mode UI metadata.
 *
 * Used by: homepage mode cards, sidebar, GameModePicker modal.
 * Each mode has display info + routing + availability status.
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

export interface GameModeUI {
    id: string;
    icon: Component;
    label: string;
    description: string;
    /** Route suffix after /{lang}/ — empty string for classic */
    routeSuffix: string;
    /** Whether this mode is playable (has a page) */
    enabled: boolean;
    /** Badge text: 'NEW', 'SOON', 'CLASSIC', or undefined */
    badge?: string;
}

/**
 * All game modes in display order.
 * Single source of truth — sidebar, homepage, and mode picker all derive from this.
 */
export const GAME_MODES_UI: GameModeUI[] = [
    {
        id: 'classic',
        icon: Square,
        label: 'Daily Puzzle',
        description: 'One word per day. 6 guesses. The classic.',
        routeSuffix: '',
        enabled: true,
        badge: 'CLASSIC',
    },
    {
        id: 'unlimited',
        icon: InfinityIcon,
        label: 'Unlimited',
        description: 'Random words, no limit. Play as much as you want.',
        routeSuffix: 'unlimited',
        enabled: true,
    },
    {
        id: 'speed',
        icon: Zap,
        label: 'Speed Streak',
        description: 'Race the clock. Solve as many words as you can before time runs out.',
        routeSuffix: 'speed',
        enabled: true,
        badge: 'NEW',
    },
    {
        id: 'dordle',
        icon: Columns2,
        label: 'Dordle',
        description: '2 boards, 1 keyboard, 7 guesses.',
        routeSuffix: 'dordle',
        enabled: true,
        badge: 'BETA',
    },
    {
        id: 'quordle',
        icon: Grid2x2,
        label: 'Quordle',
        description: '4 boards, 1 keyboard, 9 guesses.',
        routeSuffix: 'quordle',
        enabled: true,
        badge: 'BETA',
    },
    {
        id: 'octordle',
        icon: Grid3x3,
        label: 'Octordle',
        description: '8 boards, 1 keyboard, 13 guesses.',
        routeSuffix: 'octordle',
        enabled: true,
        badge: 'BETA',
    },
    {
        id: 'sedecordle',
        icon: Grip,
        label: 'Sedecordle',
        description: '16 boards, 1 keyboard, 21 guesses.',
        routeSuffix: 'sedecordle',
        enabled: true,
        badge: 'BETA',
    },
    {
        id: 'duotrigordle',
        icon: BrickWall,
        label: 'Duotrigordle',
        description: '32 boards, 1 keyboard, 37 guesses.',
        routeSuffix: 'duotrigordle',
        enabled: true,
        badge: 'BETA',
    },
    {
        id: 'semantic',
        icon: Compass,
        label: 'Semantic Explorer',
        description: 'Navigate meaning space. 10 guesses.',
        routeSuffix: 'semantic',
        enabled: false,
        badge: 'SOON',
    },
    {
        id: 'custom',
        icon: PenLine,
        label: 'Custom Word',
        description: 'Pick a word, share a link. Challenge your friends.',
        routeSuffix: 'custom',
        enabled: false,
        badge: 'SOON',
    },
    {
        id: 'party',
        icon: Users,
        label: 'Party Mode',
        description: 'Play the same word with friends. See who solves it fastest.',
        routeSuffix: 'party',
        enabled: false,
        badge: 'SOON',
    },
];

/**
 * Get the route for a game mode given a language code.
 */
export function getModeRoute(mode: GameModeUI, langCode: string): string | null {
    if (!mode.enabled) return null;
    return mode.routeSuffix ? `/${langCode}/${mode.routeSuffix}` : `/${langCode}`;
}
