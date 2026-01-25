/**
 * Sound Effects Module
 *
 * Provides audio feedback for game events using the Web Audio API.
 * Generates tones programmatically - no audio files needed.
 */

/** User preference for sounds */
let soundEnabled = true;

export function setSoundEnabled(enabled: boolean): void {
    soundEnabled = enabled;
}

export function getSoundEnabled(): boolean {
    return soundEnabled;
}

/** Lazy-initialized AudioContext (created on first use to comply with autoplay policies) */
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
    if (!audioContext && typeof AudioContext !== 'undefined') {
        try {
            audioContext = new AudioContext();
        } catch {
            // AudioContext not supported
            return null;
        }
    }
    return audioContext;
}

/**
 * Play a tone with the given frequency and duration
 */
function playTone(frequency: number, duration: number, type: OscillatorType = 'sine'): void {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Resume context if suspended (autoplay policy)
    if (ctx.state === 'suspended') {
        ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

    // Gentle fade in/out to avoid clicks
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.01);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
}

/**
 * Play a sequence of tones
 */
function playSequence(notes: Array<{ freq: number; duration: number; delay: number }>): void {
    notes.forEach(({ freq, duration, delay }) => {
        setTimeout(() => playTone(freq, duration), delay * 1000);
    });
}

/**
 * Victory sound - ascending triumphant melody
 */
function _playWin(): void {
    if (!soundEnabled) return;

    // C5 -> E5 -> G5 -> C6 (major chord arpeggio)
    playSequence([
        { freq: 523.25, duration: 0.15, delay: 0 }, // C5
        { freq: 659.25, duration: 0.15, delay: 0.12 }, // E5
        { freq: 783.99, duration: 0.15, delay: 0.24 }, // G5
        { freq: 1046.5, duration: 0.4, delay: 0.36 }, // C6 (held longer)
    ]);
}

/**
 * Loss sound - descending minor melody
 */
function _playLose(): void {
    if (!soundEnabled) return;

    // Descending minor: E4 -> D4 -> C4
    playSequence([
        { freq: 329.63, duration: 0.2, delay: 0 }, // E4
        { freq: 293.66, duration: 0.2, delay: 0.18 }, // D4
        { freq: 261.63, duration: 0.4, delay: 0.36 }, // C4 (held longer)
    ]);
}

// Export as object for consistent API with haptics
export const sound = {
    win: _playWin,
    lose: _playLose,
};
