/**
 * FormHandler.js - Form Handling Module
 * ===================================
 * 
 * This module provides simplified form handling functionality, focusing on
 * form submission and loading states.
 */

import LoadingManager from '/static/js/modules/LoadingManager.js';
import ErrorHandler from '/static/js/modules/ErrorHandler.js';
import CharacterSelector from '/static/js/modules/CharacterSelector.js';

class FormHandler {
    constructor() {
        this.loadingManager = new LoadingManager();
        this.errorHandler = new ErrorHandler();
        this.characterSelector = new CharacterSelector();
        this.handleSubmit = this.handleSubmit.bind(this);
    }

    /**
     * Initialize the form handler
     */
    initialize() {
        this.loadingManager.initialize();
        this.errorHandler.initialize();
        this.characterSelector.initialize();

        // Handle form submissions
        document.addEventListener('submit', this.handleSubmit, true);
    }

    /**
     * Handle form submissions
     * @param {Event} event - The submit event
     */
    async handleSubmit(event) {
        const form = event.target;
        const formType = form.dataset.formType;
        let submitButton = null;
        let loadingState = null;

        // Only handle forms with a form type
        if (!formType) return;

        event.preventDefault();

        try {
            // Start loading state
            submitButton = form.querySelector('button[type="submit"]');
            if (formType === 'choice') {
                // Disable all choice buttons to prevent multiple selections
                document.querySelectorAll('.choice-button').forEach(btn => {
                    btn.disabled = true;
                });
                loadingState = this.loadingManager.startButtonLoading(
                    submitButton,
                    submitButton.dataset.loadingText || 'Processing your choice...'
                );
            } else {
                loadingState = this.loadingManager.startButtonLoading(
                    submitButton,
                    'Generating your adventure...'
                );
            }

            // Create form data
            const formData = new FormData(form);
            const jsonData = this.convertFormDataToJson(formData);

            // Add character selection for story form
            if (formType === 'story') {
                // Get the selected character from the hidden input
                const selectedImagesInput = form.querySelector('input[name="selected_images"]');
                if (!selectedImagesInput || !selectedImagesInput.value) {
                    throw new Error('Please select a character before proceeding');
                }
                jsonData.selected_images = [selectedImagesInput.value];
            }

            // Submit the form
            const response = await fetch(form.action, {
                method: form.method || 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(jsonData)
            });

            // Handle response
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `HTTP error! status: ${response.status}`);
            }

            if (result.error) {
                throw new Error(result.error);
            }

            // Handle successful submission
            if (result.redirect) {
                window.location.href = result.redirect;
            } else if (result.success && result.story_id) {
                window.location.href = `/storyboard/${result.story_id}`;
            } else {
                throw new Error('Invalid response from server');
            }

        } catch (error) {
            this.errorHandler.logError(error, 'form submission');
            this.errorHandler.showError(error.message || 'Failed to process your request. Please try again.');
            if (submitButton && loadingState) {
                this.loadingManager.stopButtonLoading(submitButton, loadingState.originalText);
            }
            // Re-enable choice buttons if there was an error
            if (formType === 'choice') {
                document.querySelectorAll('.choice-button').forEach(btn => {
                    btn.disabled = false;
                });
            }
        }
    }

    /**
     * Convert FormData to JSON
     * @param {FormData} formData - The form data to convert
     * @returns {Object} The JSON data
     */
    convertFormDataToJson(formData) {
        const jsonData = {};
        
        for (const [key, value] of formData.entries()) {
            if (key.endsWith('[]')) {
                const actualKey = key.slice(0, -2);
                if (!jsonData[actualKey]) {
                    jsonData[actualKey] = [];
                }
                jsonData[actualKey].push(value);
            } else {
                jsonData[key] = value;
            }
        }

        return jsonData;
    }
}

// Export the FormHandler class
export default FormHandler; 