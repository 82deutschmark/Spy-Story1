// Form Submission Module
import { CharacterManager } from '/static/js/modules/CharacterManager.js';

class StoryFormHandler {
    constructor() {
        this.progress = 0;
        this.progressInterval = null;
        this.handleSubmit = this.handleSubmit.bind(this);
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
        
        const selectedImagesInput = form.querySelector('input[name="selected_images"]');
        
        if (!selectedImagesInput || !selectedImagesInput.value) {
            this.showError('Please select a character to begin your adventure.');
            return;
        }

        // Create a new FormData instance
        const formData = new FormData(form);
        
        // Remove any existing selected_images entries
        formData.delete('selected_images');
        // Add the selected character ID as an array entry
        formData.append('selected_images[]', selectedImagesInput.value);

        const submitButton = form.querySelector('#generateStoryBtn');
        const loadingPercent = this.startLoadingAnimation(submitButton);

        try {
            console.log('Submitting form with data:', {
                selectedImages: formData.getAll('selected_images[]')
            });

            const response = await fetch(form.action, {
                method: 'POST',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json'
                },
                body: formData
            });

            // Always try to parse JSON response first
            const result = await response.json().catch(() => ({ error: 'Failed to parse server response' }));

            if (!response.ok) {
                throw new Error(result.error || 'Failed to generate story');
            }

            if (result.redirect_url) {
                window.location.href = result.redirect_url;
            } else if (result.error) {
                throw new Error(result.error);
            } else {
                throw new Error('No redirect URL in response');
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            window.showToast('Error', error.message || 'Failed to generate story. Please try again.');
            this.stopLoadingAnimation(submitButton, loadingPercent);
        }
    }

    initialize() {
        const form = document.getElementById('storyForm');
        if (form) {
            form.addEventListener('submit', this.handleSubmit);
        }
    }
}

// Event Handlers Module
class EventHandlers {
    static characterManager = null;
    static storyFormHandler = null;

    static async initialize() {
        try {
            console.log("Initializing EventHandlers");
            
            // Initialize CharacterManager if we have character containers
            if (document.querySelector('.character-container')) {
                console.log("Found character containers, initializing CharacterManager");
                const characterManager = new CharacterManager();
                await characterManager.initialize();
                EventHandlers.characterManager = characterManager;
            }
            
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