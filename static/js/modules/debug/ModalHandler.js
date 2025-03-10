
/**
 * Modal Handling Module
 * Manages modal dialogues
 */
export default {
    /**
     * Initialize modal handlers
     */
    initialize() {
        // Initialize modals
        const detailsModal = document.getElementById('detailsModal');
        if (detailsModal) {
            detailsModal.addEventListener('hidden.bs.modal', () => {
                // Reset modal when closed
                document.getElementById('detailsModalLabel').innerHTML = 
                    '<i class="fas fa-edit me-2"></i>Image Details';
                document.getElementById('modalImage').style.display = '';
                document.getElementById('modalEditModeSwitch').style.display = '';
                document.getElementById('reanalyzeImageBtn').style.display = '';
            });
        }

        console.log('Modal handler initialized');
    }
};
