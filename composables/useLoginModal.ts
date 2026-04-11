/**
 * Global login modal state — shared across components.
 */
export function useLoginModal() {
    const showLoginModal = useState<boolean>('show-login-modal', () => false);
    function openLoginModal() {
        showLoginModal.value = true;
    }

    function closeLoginModal() {
        showLoginModal.value = false;
    }

    return {
        showLoginModal,
        openLoginModal,
        closeLoginModal,
    };
}
