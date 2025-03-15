// Character Selection Module
class CharacterSelector {
    constructor() {
        this.selectedCharacters = new Set();
    }

    clearAllSelections() {
        document.querySelectorAll('.character-select-card').forEach(card => {
            card.classList.remove('selected');
            const indicator = card.querySelector('.selection-indicator');
            if (indicator) indicator.style.display = 'none';
        });
        document.querySelectorAll('.character-checkbox').forEach(checkbox => {
            checkbox.checked = false;
        });
        this.selectedCharacters.clear();
    }

    updateSelectedImagesInput() {
        const selectedCharacters = Array.from(this.selectedCharacters);
        const hiddenInput = document.querySelector('input[name="selected_images"]');
        if (hiddenInput) {
            hiddenInput.value = JSON.stringify(selectedCharacters);
        }
    }

    handleCharacterSelect(characterId) {
        const characterCard = document.querySelector(`.character-select-card[data-id="${characterId}"]`);
        const checkbox = document.getElementById(`character${characterId}`);
        const selectionIndicator = characterCard?.querySelector('.selection-indicator');

        if (!characterCard || !checkbox || !selectionIndicator) {
            console.error('Required elements not found for character:', characterId);
            return false;
        }

        this.clearAllSelections();
        checkbox.checked = true;
        selectionIndicator.style.display = 'block';
        characterCard.classList.add('selected');
        this.selectedCharacters.add(characterId);
        this.updateSelectedImagesInput();

        const selectedImagesContainer = document.querySelector('.selected-characters-container');
        if (selectedImagesContainer) {
            selectedImagesContainer.style.display = 'block';
        }

        return true;
    }

    initialize() {
        // Setup character selection buttons
        document.querySelectorAll('.select-character-btn').forEach(button => {
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);

            newButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const characterId = newButton.dataset.characterId;
                if (this.handleCharacterSelect(characterId)) {
                    window.showToast?.('Character Selected', 'Character has been selected for your story.');
                }
            });
        });

        // Setup character card clicks
        document.querySelectorAll('.character-select-card').forEach(card => {
            const newCard = card.cloneNode(true);
            card.parentNode.replaceChild(newCard, card);

            newCard.addEventListener('click', (e) => {
                if (!e.target.closest('button')) {
                    const characterId = newCard.dataset.id;
                    const selectButton = newCard.querySelector(`.select-character-btn[data-character-id="${characterId}"]`);
                    selectButton?.click();
                }
            });
        });
    }
}

// Character Reroll Module
class CharacterReroller {
    async rerollCharacter(characterId, container, button) {
        const originalButtonText = button.innerHTML;
        button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Rerolling...';
        button.disabled = true;

        try {
            const response = await fetch('/api/reroll_character', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({ character_id: characterId })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (data.success) {
                this.updateCharacterUI(container, data);
                window.showToast?.('Character Updated', 'A new character has been loaded!');
            } else {
                throw new Error(data.error || 'Failed to reroll character');
            }
        } catch (error) {
            console.error('Failed to reroll character:', error);
            window.showToast?.('Error', 'Failed to load a new character. Please try again.');
        } finally {
            button.innerHTML = originalButtonText;
            button.disabled = false;
        }
    }

    updateCharacterUI(container, data) {
        // Update image
        const cardImg = container.querySelector('.character-select-card img');
        if (cardImg) cardImg.src = data.image_url;

        // Update character ID
        const characterCard = container.querySelector('.character-select-card');
        if (characterCard) characterCard.dataset.id = data.id;

        // Update character name
        const nameElement = container.querySelector('.character-name');
        if (nameElement) nameElement.textContent = data.name;

        // Update traits
        const traitsContainer = container.querySelector('.character-traits-list');
        if (traitsContainer) {
            traitsContainer.innerHTML = '';
            data.character_traits?.forEach(trait => {
                const traitBadge = document.createElement('span');
                traitBadge.className = 'trait-badge';
                traitBadge.textContent = trait;
                traitsContainer.appendChild(traitBadge);
            });
        }

        // Update select button and checkbox
        const selectBtn = container.querySelector('.select-character-btn');
        if (selectBtn) selectBtn.dataset.characterId = data.id;

        const checkbox = container.querySelector('.character-checkbox');
        if (checkbox) {
            checkbox.value = data.id;
            checkbox.id = `character${data.id}`;
        }
    }

    initialize() {
        document.querySelectorAll('.reroll-btn').forEach(button => {
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);

            newButton.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();

                const container = newButton.closest('.character-container');
                const characterCard = container?.querySelector('.character-select-card');
                const characterId = characterCard?.dataset.id;

                if (!container || !characterCard || !characterId) {
                    console.error('Required elements not found for reroll');
                    return;
                }

                await this.rerollCharacter(characterId, container, newButton);
            });
        });
    }
}

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

// Main EventHandlers Module
const EventHandlers = {
    CharacterSelector,
    CharacterReroller,
    StoryFormHandler,
    async initialize() {
        console.log('Initializing event handlers');
        try {
            const characterSelector = new this.CharacterSelector();
            const characterReroller = new this.CharacterReroller();
            const storyFormHandler = new this.StoryFormHandler();

            characterSelector.initialize();
            characterReroller.initialize();
            storyFormHandler.initialize();

            console.log('Event handlers initialized successfully');
        } catch (error) {
            console.error('Error initializing event handlers:', error);
            throw error;
        }
    }
};

export default EventHandlers; 