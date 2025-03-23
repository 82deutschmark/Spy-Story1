/**
 * ChoiceHandler.js - Choice Management Module
 * =========================================
 * 
 * This module handles the flow of story choices and
 * communication between the frontend and backend.
 */

import LoadingManager from '/static/js/modules/LoadingManager.js';
import ErrorHandler from '/static/js/modules/ErrorHandler.js';
import CharacterMentions from '/static/js/modules/CharacterMentions.js';

class ChoiceHandler {
    constructor() {
        this.loadingManager = new LoadingManager();
        this.errorHandler = new ErrorHandler();
        this.characterMentions = null;
    }

    /**
     * Initialize the choice handler
     */
    initialize() {
        this.loadingManager.initialize();
        this.errorHandler.initialize();
        
        // Initialize character mentions if we're on a story page
        if (document.querySelector('.story-content')) {
            this.characterMentions = new CharacterMentions();
            this.characterMentions.initialize();
        }
        
        // Use event delegation for form submissions
        document.addEventListener('submit', (event) => {
            if (event.target.matches('.choice-form')) {
                this.handleChoiceSubmit(event);
            }
        });
    }

    /**
     * Handle choice form submission
     * @param {Event} event - The submit event
     */
    async handleChoiceSubmit(event) {
        event.preventDefault();
        const form = event.target;
        const submitButton = form.querySelector('button[type="submit"]');
        let loadingState = null;

        try {
            // Disable all choice buttons
            document.querySelectorAll('.choice-btn').forEach(btn => {
                btn.disabled = true;
            });

            // Start loading state
            loadingState = this.loadingManager.startButtonLoading(
                submitButton,
                submitButton.dataset.loadingText || 'Processing your choice...'
            );

            // Submit the form data
            const response = await fetch(form.action, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(Object.fromEntries(new FormData(form)))
            });

            const result = await response.json();

            if (!response.ok || result.error) {
                throw new Error(result.error || `HTTP error! status: ${response.status}`);
            }

            // Handle successful choice
            if (result.redirect_url) {
                window.location.href = result.redirect_url;
            } else if (result.success && result.story_id) {
                window.location.href = `/storyboard/${result.story_id}`;
            } else {
                throw new Error('Invalid response from server');
            }

        } catch (error) {
            this.errorHandler.logError(error, 'choice submission');
            this.errorHandler.showError(error.message || 'Failed to process your choice. Please try again.');
            
            if (submitButton && loadingState) {
                this.loadingManager.stopButtonLoading(submitButton, loadingState.originalText);
            }

            // Re-enable choice buttons
            document.querySelectorAll('.choice-btn').forEach(btn => {
                btn.disabled = false;
            });
        }
    }
}

export default ChoiceHandler; 