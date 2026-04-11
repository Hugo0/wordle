/**
 * Shared composable for reading and managing play type (daily/unlimited)
 * from the URL query parameter ?play=unlimited.
 *
 * Usage:
 *   const { playType, isDaily, isUnlimited } = usePlayType('dordle');
 *
 * Daily is the default when no ?play= param is present. The composable
 * validates against the mode's supportedPlayTypes and falls back to
 * defaultPlayType if the param is invalid.
 *
 * Persists the player's last choice to localStorage per mode so they
 * land on their preferred type on return visits (only if they explicitly
 * chose unlimited — daily is never persisted since it's the default).
 */

import { GAME_MODE_CONFIG } from '~/utils/game-modes';
import type { GameMode, PlayType } from '~/utils/game-modes';
import { readLocal, writeLocal } from '~/utils/storage';

const STORAGE_PREFIX = 'play_type_';

export function usePlayType(mode: GameMode) {
    const route = useRoute();
    const modeDef = GAME_MODE_CONFIG[mode];

    // Read stored preference once at setup time — not inside computed
    // (avoids synchronous localStorage read on every reactive evaluation).
    const storedPref = import.meta.client ? readLocal(`${STORAGE_PREFIX}${mode}`) : null;

    const playType = computed<PlayType>(() => {
        // Explicit URL param takes priority
        const raw = route.query.play as string | undefined;
        if (raw === 'unlimited' && modeDef.supportedPlayTypes.includes('unlimited')) {
            return 'unlimited';
        }
        if (raw === 'daily' && modeDef.supportedPlayTypes.includes('daily')) {
            return 'daily';
        }
        // No explicit param — use stored preference or default
        if (
            !raw &&
            storedPref === 'unlimited' &&
            modeDef.supportedPlayTypes.includes('unlimited')
        ) {
            return 'unlimited';
        }
        return modeDef.defaultPlayType;
    });

    const isDaily = computed(() => playType.value === 'daily');
    const isUnlimited = computed(() => playType.value === 'unlimited');

    /** Whether this mode supports both daily AND unlimited */
    const hasBothPlayTypes =
        modeDef.supportedPlayTypes.includes('daily') &&
        modeDef.supportedPlayTypes.includes('unlimited');

    /** Navigate to the other play type */
    function switchPlayType(newType: PlayType) {
        const lang = route.params.lang as string;
        const base = modeDef.routeSuffix ? `/${lang}/${modeDef.routeSuffix}` : `/${lang}`;
        const query = newType === 'unlimited' ? '?play=unlimited' : '';
        if (newType === 'unlimited') {
            writeLocal(`${STORAGE_PREFIX}${mode}`, 'unlimited');
        }
        navigateTo(`${base}${query}`);
    }

    /** Label for the header subtitle: "#142" for daily, "Unlimited" for unlimited */
    const playTypeLabel = computed(() => {
        if (isUnlimited.value) return 'Unlimited';
        return null; // daily shows the day index instead, handled by the page
    });

    return {
        playType,
        isDaily,
        isUnlimited,
        hasBothPlayTypes,
        switchPlayType,
        playTypeLabel,
    };
}
