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

            // Create a form data object and merge in story parameters from data attributes
            let formDataObj = Object.fromEntries(new FormData(form));
            // Append story parameters if available as data attributes on the form
            if (form.dataset.conflict) {
                formDataObj.conflict = form.dataset.conflict;
                formDataObj.setting = form.dataset.setting;
                formDataObj.narrative_style = form.dataset.narrativeStyle;
                formDataObj.mood = form.dataset.mood;
            }

            // Submit the form data with the additional story parameters
            const response = await fetch(form.action, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(formDataObj)
            });

            const result = await response.json();

            if (!response.ok || result.error) {
                throw new Error(result.error || `HTTP error! status: ${response.status}`);
            }

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

    /**
     * Update story content with parsed narrative text
     * @param {string} narrativeText - The narrative text to update
     */
    updateStoryContent(narrativeText) {
        const storyContent = document.querySelector('.story-content');
        if (storyContent) {
            storyContent.innerHTML = narrativeText;
            if (this.characterMentions) {
                this.characterMentions.initialize();
            }
        }
    }
}

function extractStoryData(responseData) {
    const narrative = responseData.narrative_text || (responseData.stories && responseData.stories.narrative_text) || "";
    const choices = responseData.choices || (responseData.stories && responseData.stories.choices) || [];
    return { narrative, choices };
}

function handleChoiceResponse(responseData) {
    const { narrative, choices } = extractStoryData(responseData);
    const storyContent = document.querySelector('.story-content');
    if (storyContent) {
        storyContent.innerHTML = narrative;
    }
    const choicesContainer = document.querySelector('.choices-container');
    if (choicesContainer) {
        choicesContainer.innerHTML = "";
        choices.forEach(choice => {
            const btn = document.createElement('button');
            btn.className = "choice-btn";
            btn.innerText = choice.text || "Option";
            btn.dataset.choiceId = choice.choice_id || choice.id;
            choicesContainer.appendChild(btn);
        });
    }
}

export default ChoiceHandler;