
/**
 * Event Handler Module
 * Central module for event handling
 */
import DebugUtils from './DebugUtils.js';
import DebugUI from './DebugUI.js';
import FormHandler from './FormHandler.js';
import DataHandler from './DataHandler.js';

export default {
    /**
     * Initialize event handlers
     */
    initialize() {
        this.setupFormEvents();
        this.setupFilterEvents();
        this.setupModalEvents();
        console.log('Event handler initialized');
    },

    /**
     * Set up form-related events
     */
    setupFormEvents() {
        // Form submission
        const imageForm = document.getElementById('imageForm');
        if (imageForm) {
            imageForm.addEventListener('submit', event => {
                event.preventDefault();
                FormHandler.handleImageAnalysis();
            });
        }

        // Edit mode toggle
        const editModeSwitch = document.getElementById('editModeSwitch');
        if (editModeSwitch) {
            editModeSwitch.addEventListener('change', () => {
                const editContainer = document.getElementById('editContainer');
                editContainer.style.display = 
                    editModeSwitch.checked ? 'block' : 'none';
            });
        }

        // Copy button
        const copyBtn = document.getElementById('copyBtn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                const content = document.getElementById('generatedContent').textContent;
                navigator.clipboard.writeText(content)
                    .then(() => DebugUtils.showToast('Success', 'Content copied to clipboard'))
                    .catch(err => DebugUtils.showToast('Error', 'Failed to copy: ' + err, true));
            });
        }

        // Image type change
        const imageType = document.getElementById('imageType');
        if (imageType) {
            imageType.addEventListener('change', () => {
                DebugUI.toggleFieldsByImageType();
            });
        }

        // Apply changes button
        const applyChangesBtn = document.getElementById('applyChangesBtn');
        if (applyChangesBtn) {
            applyChangesBtn.addEventListener('click', () => {
                FormHandler.applyChanges();
            });
        }
    },

    /**
     * Set up filter-related events
     */
    setupFilterEvents() {
        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(button => {
            button.addEventListener('click', () => {
                const filter = button.getAttribute('data-filter');
                DataHandler.filterImages(filter);
            });
        });
    },

    /**
     * Set up modal-related events
     */
    setupModalEvents() {
        // This would handle any modal-specific events not handled elsewhere
    }
};
