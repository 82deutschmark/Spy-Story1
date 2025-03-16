// Form Submission Module
import { CharacterManager } from './CharacterManager.js';

class StoryFormHandler {
    constructor() {
        this.progress = 0;
        this.progressInterval = null;
    }

    showError(message) {
        const errorElement = document.querySelector('#characterSelectionError');
        if (errorElement) {
            errorElement.style.display = 'block';
            errorElement.textContent = message;
            window.scrollTo(0, 0);
        }
        window.showToast?.('Selection Needed', message);
    }

    hideError() {
        const errorElement = document.querySelector('#characterSelectionError');
        if (errorElement) {
            errorElement.style.display = 'none';
        }
    }

    startLoadingAnimation(button) {
        const loadingPercent = window.createLoadingOverlay?.('Generating your adventure...');
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Generating Story...';

        this.progressInterval = setInterval(() => {
            if (this.progress < 90) {
                this.progress += 5;
                window.updateLoadingPercent?.(loadingPercent, this.progress);
            }
        }, 500);

        return loadingPercent;
    }

    stopLoadingAnimation(button, loadingPercent) {
        clearInterval(this.progressInterval);
        if (loadingPercent) {
            window.removeLoadingOverlay?.(loadingPercent);
        }
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-pen-fancy me-2"></i>Begin Your Adventure';
    }

    async handleSubmit(form, e) {
        e.preventDefault();
        
        const selectedCharacter = document.querySelector('input[name="selectedCharacter"]:checked');
        if (!selectedCharacter) {
            this.showError('Please select a character to begin your adventure.');
            return;
        }

        const submitButton = form.querySelector('#generateStoryBtn');
        const loadingPercent = this.startLoadingAnimation(submitButton);

        try {
            const formData = new FormData(form);
            const response = await fetch(form.action, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Failed to generate story');
            }

            const result = await response.json();
            if (result.redirect_url) {
                window.location.href = result.redirect_url;
            } else {
                throw new Error('No redirect URL in response');
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            window.showToast('Error', 'Failed to generate story. Please try again.');
            this.stopLoadingAnimation(submitButton, loadingPercent);
        }
    }

    initialize() {
        const form = document.getElementById('storyForm');
        if (form) {
            form.addEventListener('submit', this.handleSubmit.bind(this));
        }
    }
}

// Event Handlers Module
class EventHandlers {
    constructor() {
        this.characterManager = null;
        this.storyFormHandler = null;
    }

    static async initialize() {
        try {
            console.log("Initializing EventHandlers");
            
            // Initialize CharacterManager
            const characterManager = new CharacterManager();
            await characterManager.initialize();
            EventHandlers.characterManager = characterManager;
            
            // Initialize StoryFormHandler
            const storyFormHandler = new StoryFormHandler();
            storyFormHandler.initialize();
            EventHandlers.storyFormHandler = storyFormHandler;

            console.log("EventHandlers initialization complete");
        } catch (error) {
            console.error("Error in EventHandlers initialization:", error);
            throw error;
        }
    }

    static getCharacterManager() {
        return EventHandlers.characterManager;
    }

    static getStoryFormHandler() {
        return EventHandlers.storyFormHandler;
    }
}

// Export the EventHandlers class
export default EventHandlers; 