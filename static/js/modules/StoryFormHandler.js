import LoadingManager from '/static/js/modules/LoadingManager.js';
import ErrorHandler from '/static/js/modules/ErrorHandler.js';
import CharacterSelector from '/static/js/modules/CharacterSelector.js';

class StoryFormHandler {
    constructor() {
        this.loadingManager = new LoadingManager();
        this.errorHandler = new ErrorHandler();
        this.characterSelector = new CharacterSelector();
    }

    initialize() {
        this.loadingManager.initialize();
        this.errorHandler.initialize();
        this.characterSelector.initialize();

        // Handle story form submissions
        document.addEventListener('submit', (event) => {
            if (event.target.dataset.formType === 'story') {
                this.handleStorySubmit(event);
            }
        });
    }

    async handleStorySubmit(event) {
        event.preventDefault();
        const form = event.target;
        const submitButton = form.querySelector('button[type="submit"]');
        let loadingState = null;

        try {
            loadingState = this.loadingManager.startButtonLoading(
                submitButton,
                'Generating your adventure...'
            );

            const formData = new FormData(form);
            const selectedImagesInput = form.querySelector('input[name="selected_images"]');
            
            if (!selectedImagesInput?.value) {
                throw new Error('Please select a character before proceeding');
            }

            const response = await fetch(form.action, {
                method: 'POST',
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
                body: formData
            });

            const result = await response.json();

            if (!response.ok || result.error) {
                throw new Error(result.error || `HTTP error! status: ${response.status}`);
            }

            if (result.redirect) {
                window.location.href = result.redirect;
            } else if (result.success && result.story_id) {
                window.location.href = `/storyboard/${result.story_id}`;
            } else {
                throw new Error('Invalid response from server');
            }

        } catch (error) {
            this.errorHandler.logError(error, 'story form submission');
            this.errorHandler.showError(error.message);
            if (submitButton && loadingState) {
                this.loadingManager.stopButtonLoading(submitButton, loadingState.originalText);
            }
        }
    }
}

export default StoryFormHandler;
