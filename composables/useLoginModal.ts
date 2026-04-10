/**
 * Global login modal state — shared across components.
 */
const showLoginModal = useState<boolean>('show-login-modal', () => false);

export function useLoginModal() {
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
