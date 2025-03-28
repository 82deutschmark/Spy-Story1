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
            // Validate required fields
            const name = form.querySelector('#protagonistNameInput').value;
            const gender = form.querySelector('#protagonistGenderInput').value;
            const errorDiv = form.querySelector('.error-message');

            if (!name || !gender) {
                errorDiv.textContent = 'Please enter both agent codename and gender.';
                errorDiv.style.display = 'block';
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
