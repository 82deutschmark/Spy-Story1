
/**
 * ModalHandler.js - Modal dialog management for the debug interface
 */
export default {
    initialize() {
        const detailsModal = document.getElementById('detailsModal');
        if (detailsModal) {
            detailsModal.addEventListener('hidden.bs.modal', () => {
                const detailsModalLabel = document.getElementById('detailsModalLabel');
                if (detailsModalLabel) {
                    detailsModalLabel.innerHTML = '<i class="fas fa-edit me-2"></i>Image Details';
                }
                
                const modalImage = document.getElementById('modalImage');
                if (modalImage) modalImage.style.display = '';
                
                const modalEditModeSwitch = document.getElementById('modalEditModeSwitch');
                if (modalEditModeSwitch) modalEditModeSwitch.style.display = '';
                
                const reanalyzeImageBtn = document.getElementById('reanalyzeImageBtn');
                if (reanalyzeImageBtn) reanalyzeImageBtn.style.display = '';
            });
        }
        console.log('Modal handler initialized');
    }
};
