/**
 * Haptic Feedback Composable
 *
 * Cross-platform haptic feedback for touch devices.
 * - Android/Chrome: Uses navigator.vibrate()
 * - iOS Safari 17.4+: Uses the checkbox switch trick
 * - Desktop/unsupported: Fails silently
 *
 * SSR-safe: all browser APIs guarded behind import.meta.client
 */

const supportsHaptics =
    typeof window === 'undefined' ? false : window.matchMedia('(pointer: coarse)').matches;

let hapticsEnabled = true;

function _haptic(): void {
    if (!hapticsEnabled || !import.meta.client) return;

    try {
        if (navigator.vibrate) {
            navigator.vibrate(50);
            return;
        }

        if (!supportsHaptics) return;

        const labelEl = document.createElement('label');
        labelEl.ariaHidden = 'true';
        labelEl.style.display = 'none';

        const inputEl = document.createElement('input');
        inputEl.type = 'checkbox';
        inputEl.setAttribute('switch', '');
        labelEl.appendChild(inputEl);

        document.head.appendChild(labelEl);
        labelEl.click();
        document.head.removeChild(labelEl);
    } catch {
        // Fail silently
    }
}

_haptic.confirm = (): void => {
    if (!hapticsEnabled || !import.meta.client) return;
    if (navigator.vibrate) {
        navigator.vibrate([50, 70, 50]);
        return;
    }
    _haptic();
    setTimeout(() => _haptic(), 120);
};

_haptic.error = (): void => {
    if (!hapticsEnabled || !import.meta.client) return;
    if (navigator.vibrate) {
        navigator.vibrate([50, 70, 50, 70, 50]);
        return;
    }
    _haptic();
    setTimeout(() => _haptic(), 120);
    setTimeout(() => _haptic(), 240);
};

_haptic.success = (): void => {
    if (!hapticsEnabled || !import.meta.client) return;
    if (navigator.vibrate) {
        navigator.vibrate([50, 50, 100, 50, 150]);
        return;
    }
    _haptic();
    setTimeout(() => _haptic(), 100);
    setTimeout(() => {
        _haptic();
        setTimeout(() => _haptic(), 50);
    }, 250);
};

interface Haptic {
    (): void;
    confirm: () => void;
    error: () => void;
    success: () => void;
}

export function useHaptics() {
    function setEnabled(enabled: boolean) {
        hapticsEnabled = enabled;
    }

    return {
        haptic: _haptic as Haptic,
        setHapticsEnabled: setEnabled,
        getHapticsEnabled: () => hapticsEnabled,
        supportsHaptics,
    };
}
