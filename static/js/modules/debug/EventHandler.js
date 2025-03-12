/**
 * EventHandler.js - Event handling utilities for the debug interface
 */
export default {
    initialize() {
        console.log('Event handler initialized');
    },
    setupModalEvents() {
        // Edit mode switch
        const modalEditModeSwitch = document.getElementById('modalEditModeSwitch');
        if (modalEditModeSwitch) {
            modalEditModeSwitch.addEventListener('change', () => {
                this.modalHandler.enableEditMode();
            });
        }

        // Save modal data button
        const saveModalDataBtn = document.getElementById('saveModalDataBtn');
        if (saveModalDataBtn) {
            saveModalDataBtn.addEventListener('click', () => {
                this.modalHandler.saveImageData();
            });
        }
    }
};