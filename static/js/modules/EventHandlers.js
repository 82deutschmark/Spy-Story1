/**
 * EventHandlers Module
 * Central module for managing all event listeners and interactions
 */
export const EventHandlers = {
    initialize() {
        console.log('Initializing event handlers');
        this.setupEventListeners();
    },

    setupEventListeners() {
        this.setupCharacterSelection();
        this.setupRerollButtons();
        this.setupFormSubmissionHandlers();
    },

    setupCharacterSelection() {
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
            // Remove existing listeners to prevent duplicates
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

                // Show loading state
                const originalButtonText = this.innerHTML;
                this.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Rerolling...';
                this.disabled = true;

                fetch('/reroll_character', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ character_id: characterId })
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok: ' + response.status);
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.success && data.character_html) {
                        // Replace the entire character container with new HTML
                        cardContainer.outerHTML = data.character_html;
                        
                        // Reinitialize event handlers for the new card
                        EventHandlers.setupCharacterSelection();
                        EventHandlers.setupRerollButtons();

                        // Show success notification
                        if (window.UIUtils && typeof window.UIUtils.showToast === 'function') {
                            window.UIUtils.showToast('Character Updated', 'A new character has been loaded!');
                        }
                    } else {
                        throw new Error(data.error || 'Failed to reroll character');
                    }
                })
                .catch(error => {
                    console.error('Failed to reroll character:', error);
                    // Reset button state
                    this.innerHTML = originalButtonText;
                    this.disabled = false;

                    if (window.UIUtils && typeof window.UIUtils.showToast === 'function') {
                        window.UIUtils.showToast('Error', 'Failed to load a new character. Please try again.', 'error');
                    }
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

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EventHandlers;
}

// For browser use, attach to window object
if (typeof window !== 'undefined') {
    // Only assign to window if not already defined
    if (!window.EventHandlers) {
        window.EventHandlers = EventHandlers;
    }
}
