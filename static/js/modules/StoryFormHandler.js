import LoadingManager from './LoadingManager.js';
import ErrorHandler from './ErrorHandler.js';
import CharacterSelector from './CharacterSelector.js';

class StoryFormHandler {
    constructor() {
        this.loadingManager = new LoadingManager();
        this.errorHandler = new ErrorHandler();
        this.characterSelector = new CharacterSelector();
        this.isSubmitting = false; // Add submission tracking flag
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

        // Ensure protagonist fields are synchronized
        this.setupFieldSynchronization();
    }

    // Add method to synchronize visible and hidden fields
    setupFieldSynchronization() {
        const visibleNameField = document.getElementById('protagonistName');
        const hiddenNameField = document.getElementById('protagonistNameInput');
        const visibleGenderField = document.getElementById('protagonistGender');
        const hiddenGenderField = document.getElementById('protagonistGenderInput');

        if (visibleNameField && hiddenNameField) {
            // Copy initial value if present
            if (visibleNameField.value) {
                hiddenNameField.value = visibleNameField.value;
            }

            // Update hidden field when visible field changes
            visibleNameField.addEventListener('input', () => {
                hiddenNameField.value = visibleNameField.value;
            });
        }

        if (visibleGenderField && hiddenGenderField) {
            // Copy initial value if present
            if (visibleGenderField.value) {
                hiddenGenderField.value = visibleGenderField.value;
            }

            // Update hidden field when visible field changes
            visibleGenderField.addEventListener('change', () => {
                hiddenGenderField.value = visibleGenderField.value;
            });
        }
    }

    async handleStorySubmit(event) {
        event.preventDefault();
        const form = event.target;
        const submitButton = form.querySelector('button[type="submit"]');
        let loadingState = null;

        // Prevent duplicate submissions
        if (this.isSubmitting) {
            console.log('Form submission already in progress, ignoring duplicate request');
            return;
        }

        try {
            // Set submission flag
            this.isSubmitting = true;

            // Synchronize visible and hidden fields one final time before submission
            const visibleNameField = document.getElementById('protagonistName');
            const hiddenNameField = document.getElementById('protagonistNameInput');
            const visibleGenderField = document.getElementById('protagonistGender');
            const hiddenGenderField = document.getElementById('protagonistGenderInput');

            if (visibleNameField && hiddenNameField) {
                hiddenNameField.value = visibleNameField.value;
            }
            
            if (visibleGenderField && hiddenGenderField) {
                hiddenGenderField.value = visibleGenderField.value;
            }

            // Validate required fields
            const name = hiddenNameField.value;
            const gender = hiddenGenderField.value;
            const errorDiv = form.querySelector('.error-message');

            if (!name || !gender) {
                errorDiv.textContent = 'Please enter both agent codename and gender.';
                errorDiv.style.display = 'block';
                this.isSubmitting = false; // Reset submission flag
                return;
            }
            errorDiv.style.display = 'none';

            loadingState = this.loadingManager.startButtonLoading(
                submitButton,
                'Generating your adventure...'
            );

            const formData = new FormData(form);
            const selectedImagesInput = form.querySelector('input[name="selected_images"]');
            
            if (!selectedImagesInput?.value) {
                throw new Error('Please select a character before proceeding');
            }

            // Log the form data to ensure everything is correct
            console.log('Submitting form with agent codename:', name, 'gender:', gender);

            const response = await fetch(form.action, {
                method: 'POST',
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
                body: formData
            });

            const contentType = response.headers.get('content-type');
            let result;
            if (contentType && contentType.includes('application/json')) {
                result = await response.json();
            } else {
                const text = await response.text();
                throw new Error(text || `HTTP error! status: ${response.status}`);
            }

            if (!response.ok || result.error) {
                throw new Error(result.error || `HTTP error! status: ${response.status}`);
            }

            if (result.redirect) {
                window.location.href = result.redirect;
            } else if (result.success && result.story_id) {
                window.location.href = `/storyboard/${result.story_id}`;
            } else if (response.redirected) {
                // Handle direct redirects from the server
                window.location.href = response.url;
            } else {
                throw new Error('Invalid response from server');
            }

        } catch (error) {
            this.errorHandler.logError(error, 'story form submission');
            this.errorHandler.showError(error.message);
            if (submitButton && loadingState) {
                this.loadingManager.stopButtonLoading(submitButton, loadingState.originalText);
            }
        } finally {
            // Always reset submission flag
            this.isSubmitting = false;
        }
    }
}

function extractStoryData(responseData) {
    const narrative = responseData.narrative_text || (responseData.stories && responseData.stories.narrative_text) || "";
    const choices = responseData.choices || (responseData.stories && responseData.stories.choices) || [];
    return { narrative, choices };
}

function handleStoryResponse(responseData) {
    const { narrative, choices } = extractStoryData(responseData);
    const storyContainer = document.querySelector('.story-content');
    if (storyContainer) {
        storyContainer.innerHTML = narrative; // narrative_text as HTML
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

export default StoryFormHandler;
