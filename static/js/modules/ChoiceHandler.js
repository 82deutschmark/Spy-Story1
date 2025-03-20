/**
 * ChoiceHandler.js - Choice Management Module
 * =========================================
 * 
 * This module handles the flow of story choices, managing state and
 * communication between the frontend and backend.
 */

import LoadingManager from '/static/js/modules/LoadingManager.js';
import ErrorHandler from '/static/js/modules/ErrorHandler.js';

class ChoiceHandler {
    constructor() {
        this.loadingManager = new LoadingManager();
        this.errorHandler = new ErrorHandler();
        this.currentState = {
            story_id: null,
            node_id: null,
            characters: [],
            story_context: null
        };
        this.handleChoiceSubmit = this.handleChoiceSubmit.bind(this);
    }

    /**
     * Initialize the choice handler
     */
    initialize() {
        this.loadingManager.initialize();
        this.errorHandler.initialize();
        
        // Initialize state from the page
        this.initializeState();
        
        // Set up choice form handlers
        document.querySelectorAll('.choice-form').forEach(form => {
            form.addEventListener('submit', this.handleChoiceSubmit);
        });
    }

    /**
     * Initialize state from the current page
     * @throws {Error} If required story or node information is missing
     */
    initializeState() {
        const storyIdInput = document.querySelector('input[name="story_id"]');
        const nodeIdInput = document.querySelector('input[name="node_id"]');
        const storyContextInput = document.querySelector('input[name="story_context"]');
        const characterInputs = document.querySelectorAll('input[name="characters[]"]');

        // Validate required fields
        if (!storyIdInput || !storyIdInput.value) {
            throw new Error('Missing story_id');
        }
        if (!nodeIdInput || !nodeIdInput.value) {
            throw new Error('Missing node_id');
        }
        if (!storyContextInput || !storyContextInput.value) {
            throw new Error('Missing story_context');
        }

        // Set state values
        this.currentState.story_id = storyIdInput.value;
        this.currentState.node_id = nodeIdInput.value;
        this.currentState.story_context = storyContextInput.value;
        this.currentState.characters = characterInputs ? 
            Array.from(characterInputs).map(input => input.value) : [];
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
            // Validate state before proceeding
            if (!this.currentState.story_id || !this.currentState.node_id || !this.currentState.story_context) {
                throw new Error('Missing required story or node information');
            }

            // Disable all choice buttons
            document.querySelectorAll('.choice-button').forEach(btn => {
                btn.disabled = true;
            });

            // Start loading state
            loadingState = this.loadingManager.startButtonLoading(
                submitButton,
                submitButton.dataset.loadingText || 'Processing your choice...'
            );

            // Create form data
            const formData = new FormData(form);
            
            // Ensure choice_id is present
            const choiceId = formData.get('choice_id');
            if (!choiceId) {
                throw new Error('Missing choice_id');
            }

            // Convert form data to JSON
            const jsonData = this.convertFormDataToJson(formData);

            // Submit the choice
            const response = await fetch(form.action, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(jsonData)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `HTTP error! status: ${response.status}`);
            }

            if (result.error) {
                throw new Error(result.error);
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
            document.querySelectorAll('.choice-button').forEach(btn => {
                btn.disabled = false;
            });

            // Handle redirect if provided in error response
            if (error.response && error.response.redirect) {
                window.location.href = error.response.redirect;
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
                const baseKey = key.slice(0, -2);
                if (!jsonData[baseKey]) {
                    jsonData[baseKey] = [];
                }
                jsonData[baseKey].push(value);
            } else {
                jsonData[key] = value;
            }
        }
        return jsonData;
    }
}

export default ChoiceHandler; 