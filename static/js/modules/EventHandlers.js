/**
 * EventHandlers Module
 * Central module for managing all event listeners and interactions
 */
export const EventHandlers = {
    async initialize() {
        console.log('Initializing event handlers');
        try {
            await this.setupEventListeners();
            console.log('Event handlers initialized successfully');
        } catch (error) {
            console.error('Error initializing event handlers:', error);
            throw error;
        }
    },

    async setupEventListeners() {
        try {
            await Promise.all([
                this.setupCharacterSelection(),
                this.setupRerollButtons(),
                this.setupFormSubmissionHandlers()
            ]);
        } catch (error) {
            console.error('Error setting up event listeners:', error);
            throw error;
        }
    },

    setupCharacterSelection() {
        return new Promise((resolve) => {
            console.log('Setting up character selection');
            const selectButtons = document.querySelectorAll('.select-character-btn');
            
            // Clear existing selections
            const clearAllSelections = () => {
                document.querySelectorAll('.character-select-card').forEach(card => {
                    card.classList.remove('selected');
                    const indicator = card.querySelector('.selection-indicator');
                    if (indicator) indicator.style.display = 'none';
                });
                document.querySelectorAll('.character-checkbox').forEach(checkbox => {
                    checkbox.checked = false;
                });
            };

            // Update hidden input with selected character
            const updateSelectedImagesInput = () => {
                const selectedCharacters = Array.from(document.querySelectorAll('.character-checkbox:checked'))
                    .map(checkbox => checkbox.value);
                const hiddenInput = document.querySelector('input[name="selected_images"]');
                if (hiddenInput) {
                    hiddenInput.value = JSON.stringify(selectedCharacters);
                }
            };

            selectButtons.forEach(button => {
                const newButton = button.cloneNode(true);
                button.parentNode.replaceChild(newButton, button);

                newButton.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();

                    const characterId = this.dataset.characterId;
                    const characterCard = document.querySelector(`.character-select-card[data-id="${characterId}"]`);

                    if (!characterCard) {
                        console.error('Character card not found:', characterId);
                        return;
                    }

                    const checkbox = document.getElementById(`character${characterId}`);
                    const selectionIndicator = characterCard.querySelector('.selection-indicator');

                    if (!checkbox || !selectionIndicator) {
                        console.error('Required elements not found for character:', characterId);
                        return;
                    }

                    clearAllSelections();
                    checkbox.checked = true;
                    selectionIndicator.style.display = 'block';
                    characterCard.classList.add('selected');
                    updateSelectedImagesInput();

                    const selectedImagesContainer = document.querySelector('.selected-characters-container');
                    if (selectedImagesContainer) {
                        selectedImagesContainer.style.display = 'block';
                    }

                    if (window.UIUtils && typeof window.UIUtils.showToast === 'function') {
                        window.UIUtils.showToast('Character Selected', 'Character has been selected for your story.');
                    }
                });
            });

            resolve();
        });
    },

    setupRerollButtons() {
        return new Promise((resolve) => {
            console.log('Setting up reroll buttons');
            const rerollButtons = document.querySelectorAll('.reroll-btn');
            
            rerollButtons.forEach(button => {
                const newButton = button.cloneNode(true);
                button.parentNode.replaceChild(newButton, button);

                newButton.addEventListener('click', async function(e) {
                    e.preventDefault();
                    e.stopPropagation();

                    const cardContainer = this.closest('.character-container');
                    if (!cardContainer) {
                        console.error('Character container not found');
                        return;
                    }

                    const characterCard = cardContainer.querySelector('.character-select-card');
                    if (!characterCard) {
                        console.error('Character card not found');
                        return;
                    }

                    const characterId = characterCard.dataset.id;
                    if (!characterId) {
                        console.error('Character ID not found');
                        return;
                    }

                    const originalButtonText = this.innerHTML;
                    this.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Rerolling...';
                    this.disabled = true;

                    try {
                        const response = await fetch('/reroll_character', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ character_id: characterId })
                        });

                        if (!response.ok) {
                            throw new Error('Network response was not ok: ' + response.status);
                        }

                        const data = await response.json();
                        if (data.success && data.character_html) {
                            cardContainer.outerHTML = data.character_html;
                            EventHandlers.setupCharacterSelection();
                            EventHandlers.setupRerollButtons();

                            if (window.UIUtils && typeof window.UIUtils.showToast === 'function') {
                                window.UIUtils.showToast('Character Updated', 'A new character has been loaded!');
                            }
                        } else {
                            throw new Error(data.error || 'Failed to reroll character');
                        }
                    } catch (error) {
                        console.error('Failed to reroll character:', error);
                        this.innerHTML = originalButtonText;
                        this.disabled = false;

                        if (window.UIUtils && typeof window.UIUtils.showToast === 'function') {
                            window.UIUtils.showToast('Error', 'Failed to load a new character. Please try again.', 'error');
                        }
                    }
                });
            });

            resolve();
        });
    },

    setupFormSubmissionHandlers() {
        return new Promise((resolve) => {
            const storyForm = document.querySelector('#storyForm');
            if (!storyForm) {
                resolve();
                return;
            }

            storyForm.addEventListener('submit', async function(e) {
                e.preventDefault();

                const selectedCharacters = document.querySelectorAll('.character-checkbox:checked');
                if (selectedCharacters.length !== 1) {
                    const characterSelectionError = document.querySelector('#characterSelectionError');
                    if (characterSelectionError) {
                        characterSelectionError.style.display = 'block';
                        characterSelectionError.textContent = 'Please select a character for your story';
                        window.scrollTo(0, 0);
                    }
                    if (window.UIUtils && typeof window.UIUtils.showToast === 'function') {
                        window.UIUtils.showToast('Selection Needed', 'Please select a character before continuing');
                    }
                    return;
                }

                const characterSelectionError = document.querySelector('#characterSelectionError');
                if (characterSelectionError) {
                    characterSelectionError.style.display = 'none';
                }

                try {
                    const formData = new FormData(this);
                    const response = await fetch(this.action, {
                        method: 'POST',
                        body: formData
                    });

                    const data = await response.json();
                    if (data.success) {
                        window.location.href = data.redirect_url;
                    } else {
                        throw new Error(data.error || 'Failed to generate story');
                    }
                } catch (error) {
                    console.error('Error:', error);
                    if (window.UIUtils && typeof window.UIUtils.showToast === 'function') {
                        window.UIUtils.showToast('Error', 'Failed to generate story. Please try again.', 'error');
                    }
                }
            });

            resolve();
        });
    }
};

// Export the EventHandlers object as default
export default EventHandlers;
