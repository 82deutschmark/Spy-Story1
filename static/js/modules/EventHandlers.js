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

                    if (window.showToast) {
                        window.showToast('Character Selected', 'Character has been selected for your story.');
                    }
                });
            });

            // Also handle clicks on the character cards themselves
            const characterCards = document.querySelectorAll('.character-select-card');
            characterCards.forEach(card => {
                const newCard = card.cloneNode(true);
                card.parentNode.replaceChild(newCard, card);

                newCard.addEventListener('click', function(e) {
                    // Don't handle click if it's on a button
                    if (e.target.closest('button')) return;

                    const characterId = this.dataset.id;
                    const selectButton = this.querySelector(`.select-character-btn[data-character-id="${characterId}"]`);
                    
                    if (selectButton) {
                        selectButton.click();
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
                            // Update image
                            const cardImg = characterCard.querySelector('img');
                            if (cardImg) {
                                cardImg.src = data.image_url;
                            }

                            // Update character ID
                            characterCard.dataset.id = data.id;

                            // Update character name
                            const nameElement = cardContainer.querySelector('.character-name');
                            if (nameElement) {
                                nameElement.textContent = data.name;
                            }

                            // Update traits
                            const traitsContainer = cardContainer.querySelector('.character-traits-list');
                            if (traitsContainer) {
                                traitsContainer.innerHTML = '';
                                if (data.character_traits && data.character_traits.length > 0) {
                                    data.character_traits.forEach(trait => {
                                        const traitBadge = document.createElement('span');
                                        traitBadge.className = 'trait-badge';
                                        traitBadge.textContent = trait;
                                        traitsContainer.appendChild(traitBadge);
                                    });
                                }
                            }

                            // Update select button data attribute
                            const selectBtn = cardContainer.querySelector('.select-character-btn');
                            if (selectBtn) {
                                selectBtn.dataset.characterId = data.id;
                            }

                            // Update checkbox
                            const checkbox = cardContainer.querySelector('.character-checkbox');
                            if (checkbox) {
                                checkbox.value = data.id;
                                checkbox.id = `character${data.id}`;
                            }

                            if (window.showToast) {
                                window.showToast('Character Updated', 'A new character has been loaded!');
                            }
                        } else {
                            throw new Error(data.error || 'Failed to reroll character');
                        }
                    } catch (error) {
                        console.error('Failed to reroll character:', error);
                        if (window.showToast) {
                            window.showToast('Error', 'Failed to load a new character. Please try again.');
                        }
                    } finally {
                        this.innerHTML = originalButtonText;
                        this.disabled = false;
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
                    if (window.showToast) {
                        window.showToast('Selection Needed', 'Please select a character before continuing');
                    }
                    return;
                }

                const characterSelectionError = document.querySelector('#characterSelectionError');
                if (characterSelectionError) {
                    characterSelectionError.style.display = 'none';
                }

                const loadingPercent = window.createLoadingOverlay('Generating your adventure...');
                const generateStoryBtn = document.getElementById('generateStoryBtn');

                if (generateStoryBtn) {
                    generateStoryBtn.disabled = true;
                    generateStoryBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Generating Story...';
                }

                let progress = 0;
                const progressInterval = setInterval(() => {
                    if (progress < 90) {
                        progress += 5;
                        window.updateLoadingPercent(loadingPercent, progress);
                    }
                }, 500);

                try {
                    const formData = new FormData(this);
                    const response = await fetch(this.action, {
                        method: 'POST',
                        body: formData
                    });

                    const data = await response.json();
                    if (data.success) {
                        window.updateLoadingPercent(loadingPercent, 100);
                        setTimeout(() => {
                            window.location.href = data.redirect_url;
                        }, 500);
                    } else {
                        throw new Error(data.error || 'Failed to generate story');
                    }
                } catch (error) {
                    console.error('Error:', error);
                    if (window.showToast) {
                        window.showToast('Error', 'Failed to generate story. Please try again.');
                    }
                    if (generateStoryBtn) {
                        generateStoryBtn.disabled = false;
                        generateStoryBtn.innerHTML = '<i class="fas fa-book-open me-2"></i>Begin Your Story';
                    }
                    clearInterval(progressInterval);
                    if (loadingPercent) {
                        window.removeLoadingOverlay(loadingPercent);
                    }
                }
            });

            resolve();
        });
    }
};

// Export the EventHandlers object as default
export default EventHandlers;
