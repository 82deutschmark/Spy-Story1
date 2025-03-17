/**
 * EventHandlers.js - Core Event Management Module
 * =============================================
 * 
 * !!! IMPORTANT - READ BEFORE MODIFYING !!!
 * This is a critical infrastructure file that coordinates multiple core components.
 * Changes to this file can affect the entire application flow.
 * 
 * Key Dependencies:
 * ----------------
 * - CharacterManager: Handles character selection and state
 * - UIUtils: Manages UI interactions and notifications
 * - main.js: Initializes this module on application start
 * 
 * Component Structure:
 * ------------------
 * 1. StoryFormHandler Class
 *    - Manages form submissions for both initial story and choice forms
 *    - Handles loading states and error displays
 *    - Coordinates character selection validation
 * 
 * 2. EventHandlers Class (Static)
 *    - Central coordinator for all event-related functionality
 *    - Maintains singleton instances of managers
 *    - Provides access to core components via getter methods
 * 
 * Integration Points:
 * -----------------
 * - HTML: Expects elements with classes 'character-container', 'character-select-card'
 * - Forms: Handles 'storyForm' and forms with class 'choice-form'
 * - DOM Events: Manages submit events and character selection
 * 
 * Usage Guidelines:
 * ---------------
 * 1. ALWAYS check existing event handlers before adding new ones
 * 2. NEVER modify the initialization order in the initialize() method
 * 3. ALWAYS maintain backward compatibility with existing DOM structures
 * 4. When modifying form handling logic, test both initial story AND choice forms
 * 5. Character selection changes must coordinate with CharacterManager
 * 
 * Error Handling:
 * -------------
 * - All async operations must have proper error handling
 * - UI feedback should be provided for all error states
 * - Errors should be logged for debugging purposes
 */

// Form Submission Module
import { CharacterManager } from '/static/js/modules/CharacterManager.js';
import { UIUtils } from './UIUtils.js';

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
        UIUtils.showToast('Selection Needed', message);
    }

    hideError() {
        const errorElement = document.querySelector('#characterSelectionError');
        if (errorElement) {
            errorElement.style.display = 'none';
        }
    }

    startLoadingAnimation(button, message = 'Generating your adventure...') {
        const loadingPercent = UIUtils.createLoadingOverlay(message);
        button.disabled = true;
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processing...';

        this.progressInterval = setInterval(() => {
            if (this.progress < 90) {
                this.progress += 5;
                UIUtils.updateLoadingPercent(loadingPercent, this.progress);
            }
        }, 500);

        return { loadingPercent, originalText };
    }

    stopLoadingAnimation(button, loadingPercent, originalText) {
        clearInterval(this.progressInterval);
        UIUtils.removeLoadingOverlay(loadingPercent);
        button.disabled = false;
        button.innerHTML = originalText;
    }

    async handleSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const submitButton = form.querySelector('button[type="submit"]');
        const isChoiceForm = form.classList.contains('choice-form');
        const { loadingPercent, originalText } = this.startLoadingAnimation(
            submitButton, 
            isChoiceForm ? 'Generating next scene...' : 'Generating your adventure...'
        );

        try {
            // Ensure form has an action
            if (!form.action) {
                throw new Error('Form action is not set');
            }

            const formData = new FormData(form);

            // Validate required story parameters for initial story form
            if (!isChoiceForm) {
                const requiredParams = ['conflict', 'setting', 'narrative_style', 'mood'];
                const missingParams = requiredParams.filter(param => !formData.get(param));
                
                if (missingParams.length > 0) {
                    const errorMessage = `Please select the following: ${missingParams.map(param => param.replace('_', ' ')).join(', ')}`;
                    this.showError(errorMessage);
                    this.stopLoadingAnimation(submitButton, loadingPercent, originalText);
                    return;
                }

                const selectedCharacters = Array.from(document.querySelectorAll('.character-select-card.selected'))
                    .map(card => card.dataset.id);

                if (selectedCharacters.length === 0) {
                    this.showError('Please select at least one character for your story.');
                    this.stopLoadingAnimation(submitButton, loadingPercent, originalText);
                    return;
                }

                // Add selected characters to form data
                selectedCharacters.forEach(id => {
                    formData.append('selected_images[]', id);
                });
                formData.set('selected_images', selectedCharacters[0]); // For backward compatibility
            }

            const response = await fetch(form.action, {
                method: 'POST',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json'
                },
                body: formData
            });

            const result = await response.json();

            if (result.error) {
                throw new Error(result.error || 'Failed to generate story');
            }

            // Handle successful response
            if (result.success && result.redirect) {
                window.location.href = result.redirect;
                return;
            }

            // Only handle content updates if we're not redirecting
            if (result.content) {
                const storyContent = document.querySelector('.story-content');
                if (storyContent) {
                    storyContent.innerHTML = result.content;
                    // Re-initialize character mentions if needed
                    if (typeof initializeCharacterMentions === 'function') {
                        initializeCharacterMentions();
                    }
                }
            }
            
            // Stop loading animation if we haven't redirected
            this.stopLoadingAnimation(submitButton, loadingPercent, originalText);
        } catch (error) {
            console.error('Error submitting form:', error);
            const errorMessage = error.message || 'Failed to process your request. Please try again.';
            this.showError(errorMessage);
            UIUtils.showToast('Error', errorMessage);
            this.stopLoadingAnimation(submitButton, loadingPercent, originalText);
        }
    }

    initialize() {
        // Handle both initial story form and choice forms
        const storyForm = document.getElementById('storyForm');
        const choiceForms = document.querySelectorAll('.choice-form');

        if (storyForm) {
            storyForm.addEventListener('submit', this.handleSubmit);
        }

        choiceForms.forEach(form => {
            form.addEventListener('submit', this.handleSubmit);
        });
    }
}

// Event Handlers Module
class EventHandlers {
    static characterManager = null;
    static storyFormHandler = null;

    static async initialize() {
        try {
            // Initialize CharacterManager if we have character containers
            if (document.querySelector('.character-container')) {
                const characterManager = new CharacterManager();
                await characterManager.initialize();
                EventHandlers.characterManager = characterManager;
            }
            
            // Initialize StoryFormHandler for both story and choice forms
            const storyFormHandler = new StoryFormHandler();
            storyFormHandler.initialize();
            EventHandlers.storyFormHandler = storyFormHandler;
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