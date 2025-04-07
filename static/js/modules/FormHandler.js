/**
 * FormHandler.js - Form Handling Module
 * ===================================
 * 
 * This module provides simplified form handling functionality, focusing on
 * form submission and loading states.
 */

import LoadingManager from './LoadingManager.js';
import ErrorHandler from './ErrorHandler.js';
import CharacterSelector from './CharacterSelector.js';

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
            if (!submitButton) {
                // If no submit button found, try to find the button that triggered the submit
                submitButton = event.submitter;
            }

            if (formType === 'choice') {
                // Disable all choice buttons to prevent multiple selections
                document.querySelectorAll('.choice-button').forEach(btn => {
                    btn.disabled = true;
                });
                loadingState = this.loadingManager.startButtonLoading(
                    submitButton,
                    submitButton?.dataset?.loadingText || 'Processing your choice...'
                );
            } else {
                loadingState = this.loadingManager.startButtonLoading(
                    submitButton,
                    'Generating your adventure...'
                );
            }

            // Create form data
            const formData = new FormData(form);

            // Add character selection for story form
            if (formType === 'story') {
                // Get the selected character from the hidden input
                const selectedImagesInput = form.querySelector('input[name="selected_images"]');
                if (!selectedImagesInput || !selectedImagesInput.value) {
                    throw new Error('Please select at least one character before proceeding');
                }
                
                // Clear any existing selected_images entries
                formData.delete('selected_images');
                
                // Add the selected character IDs
                const selectedCharacterIds = selectedImagesInput.value.split(',');
                for (const characterId of selectedCharacterIds) {
                    formData.append('selected_images', characterId);
                }
            }

            // Submit the form
            const response = await fetch(form.action, {
                method: form.method || 'POST',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: formData
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

// Helper function to extract story data
function extractStoryData(responseData) {
    // Use narrative_text if present; otherwise check under "stories"
    const narrative = responseData.narrative_text || (responseData.stories && responseData.stories.narrative_text) || "";
    const choices = responseData.choices || (responseData.stories && responseData.stories.choices) || [];
    return { narrative, choices };
}

// Export the FormHandler class
export default FormHandler;