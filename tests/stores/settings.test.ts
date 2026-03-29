/**
 * Settings Store unit tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useSettingsStore } from '../../stores/settings';

// Mock composables
vi.stubGlobal('useHaptics', () => ({
    haptic: Object.assign(vi.fn(), { error: vi.fn(), confirm: vi.fn(), success: vi.fn() }),
    setHapticsEnabled: vi.fn(),
}));
vi.stubGlobal('useSounds', () => ({
    sound: { win: vi.fn(), lose: vi.fn() },
    setSoundEnabled: vi.fn(),
}));
vi.stubGlobal('useAnalytics', () => ({}));

describe('Settings Store', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('starts with default values', () => {
        const settings = useSettingsStore();
        expect(settings.darkMode).toBe(false);
        expect(settings.feedbackEnabled).toBe(true);
        expect(settings.wordInfoEnabled).toBe(true);
        expect(settings.hardMode).toBe(false);
        expect(settings.highContrast).toBe(false);
    });

    it('toggleDarkMode flips value and persists', () => {
        const settings = useSettingsStore();
        settings.toggleDarkMode();
        expect(settings.darkMode).toBe(true);
        expect(localStorage.getItem('darkMode')).toBe('true');

        settings.toggleDarkMode();
        expect(settings.darkMode).toBe(false);
        expect(localStorage.getItem('darkMode')).toBe('false');
    });

    it('toggleFeedback flips value and persists', () => {
        const settings = useSettingsStore();
        settings.toggleFeedback();
        expect(settings.feedbackEnabled).toBe(false);
        expect(localStorage.getItem('feedbackEnabled')).toBe('false');
    });

    it('toggleHardMode flips value and persists', () => {
        const settings = useSettingsStore();
        settings.toggleHardMode();
        expect(settings.hardMode).toBe(true);
        expect(localStorage.getItem('hardMode')).toBe('true');
    });

    it('difficultyLevel reflects hardMode state', () => {
        const settings = useSettingsStore();
        expect(settings.difficultyLevel).toBe(1); // normal
        settings.hardMode = true;
        expect(settings.difficultyLevel).toBe(2); // hard
    });

    it('setters persist to localStorage', () => {
        const settings = useSettingsStore();
        settings.setHighContrast(true);
        expect(settings.highContrast).toBe(true);
        expect(localStorage.getItem('highContrast')).toBe('true');

        settings.setWordInfoEnabled(false);
        expect(settings.wordInfoEnabled).toBe(false);
        expect(localStorage.getItem('wordInfoEnabled')).toBe('false');
    });
});
