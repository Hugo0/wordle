/**
 * Sound Effects Composable
 *
 * Provides audio feedback using the Web Audio API.
 * Generates tones programmatically — no audio files needed.
 * SSR-safe: AudioContext only created on client.
 */

let soundEnabled = true;
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
    if (!import.meta.client) return null;
    if (!audioContext && typeof AudioContext !== 'undefined') {
        try {
            audioContext = new AudioContext();
        } catch {
            return null;
        }
    }
    return audioContext;
}

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine'): void {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
        ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.01);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);

    oscillator.onended = () => {
        gainNode.disconnect();
        oscillator.disconnect();
    };

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
}

function playSequence(notes: Array<{ freq: number; duration: number; delay: number }>): void {
    notes.forEach(({ freq, duration, delay }) => {
        setTimeout(() => playTone(freq, duration), delay * 1000);
    });
}

function playSolveChime(): void {
    if (!soundEnabled || !import.meta.client) return;
    playSequence([
        { freq: 523, duration: 0.08, delay: 0 },
        { freq: 659, duration: 0.08, delay: 0.08 },
    ]);
}

function playFailBuzz(): void {
    if (!soundEnabled || !import.meta.client) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(200, ctx.currentTime);
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.setValueAtTime(0, ctx.currentTime + 0.15);

    oscillator.onended = () => {
        gainNode.disconnect();
        oscillator.disconnect();
    };

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.15);
}

function playTick(): void {
    if (!soundEnabled || !import.meta.client) return;
    playTone(1000, 0.03, 'sine');
}

function playTimeUp(): void {
    if (!soundEnabled || !import.meta.client) return;
    playSequence([
        { freq: 330, duration: 0.2, delay: 0 },
        { freq: 262, duration: 0.2, delay: 0.2 },
        { freq: 220, duration: 0.2, delay: 0.4 },
    ]);
}

function playWin(): void {
    if (!soundEnabled || !import.meta.client) return;
    playSequence([
        { freq: 523.25, duration: 0.15, delay: 0 },
        { freq: 659.25, duration: 0.15, delay: 0.12 },
        { freq: 783.99, duration: 0.15, delay: 0.24 },
        { freq: 1046.5, duration: 0.4, delay: 0.36 },
    ]);
}

function playLose(): void {
    if (!soundEnabled || !import.meta.client) return;
    playSequence([
        { freq: 329.63, duration: 0.2, delay: 0 },
        { freq: 293.66, duration: 0.2, delay: 0.18 },
        { freq: 261.63, duration: 0.4, delay: 0.36 },
    ]);
}

export function useSounds() {
    function setEnabled(enabled: boolean) {
        soundEnabled = enabled;
    }

    return {
        sound: {
            win: playWin,
            lose: playLose,
            solveChime: playSolveChime,
            failBuzz: playFailBuzz,
            tick: playTick,
            timeUp: playTimeUp,
        },
        setSoundEnabled: setEnabled,
        getSoundEnabled: () => soundEnabled,
    };
}
