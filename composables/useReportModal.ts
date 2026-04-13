/**
 * Global report modal state — shared across components.
 */
export function useReportModal() {
    const showReportModal = useState<boolean>('show-report-modal', () => false);

    function openReportModal() {
        showReportModal.value = true;
    }

    function closeReportModal() {
        showReportModal.value = false;
    }

    return {
        showReportModal,
        openReportModal,
        closeReportModal,
    };
}
