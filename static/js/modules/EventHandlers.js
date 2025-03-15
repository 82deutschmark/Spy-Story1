/**
 * EventHandlers Module
 * Central module for managing all event listeners and interactions
 */
export const EventHandlers = {
    initialize() {
        console.log('Initializing event handlers');
        this.setupCharacterSelection();
        this.setupRerollButtons();
        this.setupFormSubmissionHandlers();
    },

    setupCharacterSelection() {
        console.log('Setting up character selection');
        const selectButtons = document.querySelectorAll('.select-character-btn');

        // Function to clear all selections
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

        // Function to update hidden input with selected images
        const updateSelectedImagesInput = () => {
            const selectedIds = Array.from(document.querySelectorAll('.character-checkbox:checked'))
                .map(checkbox => checkbox.value);
            const hiddenInput = document.querySelector('#selectedImages');
            if (hiddenInput) {
                hiddenInput.value = JSON.stringify(selectedIds);
            }
        };

        selectButtons.forEach(button => {
            // Remove existing listeners to prevent duplicates
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);

            newButton.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();

                const characterId = this.dataset.characterId;
                const characterContainer = this.closest('.character-container');
                
                if (!characterContainer) {
                    console.error('Character container not found:', characterId);
                    return;
                }

                const characterCard = characterContainer.querySelector('.character-select-card');
                const checkbox = characterContainer.querySelector('.character-checkbox');
                const selectionIndicator = characterCard.querySelector('.selection-indicator');

                if (!checkbox || !selectionIndicator) {
                    console.error('Required elements not found for character:', characterId);
                    return;
                }

                // Clear previous selections
                clearAllSelections();

                // Select this character
                checkbox.checked = true;
                selectionIndicator.style.display = 'block';
                characterCard.classList.add('selected');

                // Update hidden input
                updateSelectedImagesInput();

                // Show selected characters container
                const selectedImagesContainer = document.querySelector('.selected-characters-container');
                if (selectedImagesContainer) {
                    selectedImagesContainer.style.display = 'block';
                }

                // Show toast notification if UIUtils is available
                if (window.UIUtils && typeof window.UIUtils.showToast === 'function') {
                    window.UIUtils.showToast('Character Selected', 'Character has been selected for your story.');
                }
            });
        });
    },

    setupRerollButtons() {
        console.log('Setting up reroll buttons');
        const rerollButtons = document.querySelectorAll('.reroll-btn');
        
        rerollButtons.forEach(button => {
            // Remove existing listeners to prevent duplicates
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);

            newButton.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();

                const characterContainer = this.closest('.character-container');
                if (!characterContainer) {
                    console.error('Character container not found');
                    return;
                }

                const characterCard = characterContainer.querySelector('.character-select-card');
                if (!characterCard) {
                    console.error('Character card not found');
                    return;
                }

                const characterId = characterCard.dataset.id;
                if (!characterId) {
                    console.error('Character ID not found');
                    return;
                }

                // Show loading state
                const originalButtonText = this.innerHTML;
                this.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Rerolling...';
                this.disabled = true;

                // Make the API call to reroll the character
                fetch('/reroll_character', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    body: JSON.stringify({ character_id: characterId })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Update the character card with new data
                        const cardImg = characterCard.querySelector('img');
                        if (cardImg) {
                            cardImg.src = data.image_url;
                            cardImg.alt = data.name;
                        }

                        // Update character ID
                        characterCard.dataset.id = data.id;

                        // Update character name
                        const nameElement = characterContainer.querySelector('.character-name');
                        if (nameElement) {
                            nameElement.textContent = data.name;
                        }

                        // Update traits
                        const traitsContainer = characterContainer.querySelector('.character-traits-list');
                        if (traitsContainer && data.character_traits) {
                            traitsContainer.innerHTML = data.character_traits
                                .map(trait => `<span class="trait-badge">${trait}</span>`)
                                .join('');
                        }

                        // Update select button and checkbox
                        const selectBtn = characterContainer.querySelector('.select-character-btn');
                        if (selectBtn) {
                            selectBtn.dataset.characterId = data.id;
                        }

                        const checkbox = characterContainer.querySelector('.character-checkbox');
                        if (checkbox) {
                            checkbox.value = data.id;
                            checkbox.id = `character${data.id}`;
                        }

                        // Show success notification
                        if (window.UIUtils && typeof window.UIUtils.showToast === 'function') {
                            window.UIUtils.showToast('Character Updated', 'A new character has been loaded!');
                        }
                    } else {
                        if (window.UIUtils && typeof window.UIUtils.showToast === 'function') {
                            window.UIUtils.showToast('Error', data.error || 'Failed to load a new character');
                        }
                    }
                })
                .catch(error => {
                    console.error('Error rerolling character:', error);
                    if (window.UIUtils && typeof window.UIUtils.showToast === 'function') {
                        window.UIUtils.showToast('Error', 'Failed to load a new character. Please try again.');
                    }
                })
                .finally(() => {
                    // Reset button state
                    this.innerHTML = originalButtonText;
                    this.disabled = false;
                });
            });
        });
    },

    setupFormSubmissionHandlers() {
        const storyForm = document.querySelector('#storyForm');
        if (!storyForm) return;

        storyForm.addEventListener('submit', function(e) {
            e.preventDefault();

            // Check if at least one character is selected
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

            // Hide error message if shown
            const characterSelectionError = document.querySelector('#characterSelectionError');
            if (characterSelectionError) {
                characterSelectionError.style.display = 'none';
            }

            // Submit the form
            const formData = new FormData(this);
            fetch(this.action, {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    window.location.href = data.redirect_url;
                } else {
                    throw new Error(data.error || 'Failed to generate story');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                if (window.UIUtils && typeof window.UIUtils.showToast === 'function') {
                    window.UIUtils.showToast('Error', 'Failed to generate story. Please try again.', 'error');
                }
            });
        });
    }
};

// Export the EventHandlers object as default
export default EventHandlers;
