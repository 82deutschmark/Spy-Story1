/**
 * EventHandler.js - Event handling utilities for the debug interface
 */
export default {
    initialize() {
        console.log('Event handler initialized');
        
        // Edit mode toggle
        const editModeSwitch = document.getElementById('modalEditModeSwitch');
        if (editModeSwitch) {
            editModeSwitch.addEventListener('change', function() {
                console.log("Edit mode switch changed:", this.checked);
                // Make sure ModalHandler is defined in the global scope
                if (typeof ModalHandler !== 'undefined') {
                    ModalHandler.enableEditMode();
                } else {
                    console.error("ModalHandler not found in global scope");
                }
            });
        }
        
        // Save button for edited JSON
        const saveAnalysisBtn = document.getElementById('saveAnalysisBtn');
        if (saveAnalysisBtn) {
            saveAnalysisBtn.addEventListener('click', function() {
                if (document.getElementById('modalEditModeSwitch').checked) {
                    // Save the edited JSON content
                    if (typeof ModalHandler !== 'undefined') {
                        ModalHandler.saveEditedContent();
                    }
                }
            });
        }
    }
};