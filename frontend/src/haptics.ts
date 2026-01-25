/**
 * Haptic Feedback Module
 *
 * Cross-platform haptic feedback for touch devices.
 * - Android/Chrome: Uses navigator.vibrate()
 * - iOS Safari 17.4+: Uses the checkbox switch trick
 * - Desktop/unsupported: Fails silently
 *
 * Adapted from https://github.com/tijnjh/ios-haptics
 */

/** Whether the device likely supports haptics (touch screen) */
export const supportsHaptics =
    typeof window === 'undefined' ? false : window.matchMedia('(pointer: coarse)').matches;

/** User preference for haptics - call setHapticsEnabled to change */
let hapticsEnabled = true;

export function setHapticsEnabled(enabled: boolean): void {
    hapticsEnabled = enabled;
}

export function getHapticsEnabled(): boolean {
    return hapticsEnabled;
}

/**
 * Trigger a single haptic pulse
 */
function _haptic(): void {
    if (!hapticsEnabled) return;

    try {
        // Android/Chrome: Use Vibration API
        if (navigator.vibrate) {
            navigator.vibrate(50);
            return;
        }

        // iOS Safari 17.4+: Use checkbox switch trick
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

/**
 * Two rapid haptic pulses - for confirmations
 */
_haptic.confirm = (): void => {
    if (!hapticsEnabled) return;

    if (navigator.vibrate) {
        navigator.vibrate([50, 70, 50]);
        return;
    }

    _haptic();
    setTimeout(() => _haptic(), 120);
};

/**
 * Three rapid haptic pulses - for errors
 */
_haptic.error = (): void => {
    if (!hapticsEnabled) return;

    if (navigator.vibrate) {
        navigator.vibrate([50, 70, 50, 70, 50]);
        return;
    }

    _haptic();
    setTimeout(() => _haptic(), 120);
    setTimeout(() => _haptic(), 240);
};

/**
 * Celebration pattern - for winning
 */
_haptic.success = (): void => {
    if (!hapticsEnabled) return;

    if (navigator.vibrate) {
        navigator.vibrate([50, 50, 100, 50, 150]);
        return;
    }

    // Rising intensity pulses
    _haptic();
    setTimeout(() => _haptic(), 100);
    setTimeout(() => {
        _haptic();
        setTimeout(() => _haptic(), 50);
    }, 250);
};

// Type interface for better IDE support
interface Haptic {
    (): void;
    /** Two rapid haptic pulses - for confirmations */
    confirm: () => void;
    /** Three rapid haptic pulses - for errors */
    error: () => void;
    /** Celebration pattern - for winning */
    success: () => void;
}

export const haptic = _haptic as Haptic;
