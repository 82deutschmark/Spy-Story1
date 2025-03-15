// Form Submission Module
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
        button.innerHTML = '<i class="fas fa-book-open me-2"></i>Begin Your Story';
    }

    async handleSubmit(form, e) {
        e.preventDefault();

        const selectedCharacters = document.querySelectorAll('.character-checkbox:checked');
        if (selectedCharacters.length !== 1) {
            this.showError('Please select a character for your story');
            return;
        }

        this.hideError();
        const generateStoryBtn = document.getElementById('generateStoryBtn');
        const loadingPercent = this.startLoadingAnimation(generateStoryBtn);

        try {
            const formData = new FormData(form);
            const response = await fetch(form.action, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (data.success) {
                window.updateLoadingPercent?.(loadingPercent, 100);
                setTimeout(() => {
                    window.location.href = data.redirect_url;
                }, 500);
            } else {
                throw new Error(data.error || 'Failed to generate story');
            }
        } catch (error) {
            console.error('Error:', error);
            window.showToast?.('Error', 'Failed to generate story. Please try again.');
            this.stopLoadingAnimation(generateStoryBtn, loadingPercent);
        }
    }

    initialize() {
        const storyForm = document.querySelector('#storyForm');
        if (storyForm) {
            storyForm.addEventListener('submit', this.handleSubmit.bind(this, storyForm));
        }
    }
}

// Event Handlers Module
class EventHandlers {
    constructor() {
        this.initialized = false;
        this.characterManager = null;
        this.storyFormHandler = null;
    }

    static async initialize() {
        if (this.initialized) {
            console.log("EventHandlers already initialized");
            return;
        }

        console.log("Initializing EventHandlers");
        
        try {
            // Import and initialize CharacterManager
            const { CharacterManager, default: characterManager } = await import('./CharacterManager.js');
            
            // Use existing instance or create new one
            this.characterManager = characterManager || new CharacterManager();
            await this.characterManager.initialize();
            console.log("CharacterManager initialized through EventHandlers");

            // Initialize StoryFormHandler
            this.storyFormHandler = new StoryFormHandler();
            this.storyFormHandler.initialize();
            console.log("StoryFormHandler initialized");

            this.initialized = true;
            console.log("EventHandlers initialization complete");
        } catch (err) {
            console.error("Error initializing modules:", err);
            throw err;
        }
    }

    static getCharacterManager() {
        return this.characterManager;
    }

    static getStoryFormHandler() {
        return this.storyFormHandler;
    }
}

// Export the EventHandlers class
export default EventHandlers; 