/**
 * Lightweight toast notification — app-wide, auto-dismisses.
 */
export function useToast() {
    const message = useState<string | null>('toast-message', () => null);

    function showToast(text: string, durationMs = 2500) {
        message.value = text;
        if (import.meta.client) {
            setTimeout(() => {
                message.value = null;
            }, durationMs);
        }
    }

    function dismissToast() {
        message.value = null;
    }

    return { toastMessage: message, showToast, dismissToast };
}
