
/**
 * EventHandlers Module
 * Central module for managing all event listeners and interactions
 */
const EventHandlers = {
    initialize() {
        console.log('Event handlers initialized');
        this.setupEventListeners();
    },

    setupEventListeners() {
        // Setup any global event listeners here
        document.addEventListener('click', (event) => {
            // Handle click events if needed
            if (event.target.matches('.character-select')) {
                this.handleCharacterSelect(event);
            }
        });
        
        this.setupCharacterSelection();
        this.setupRerollButtons();
        this.setupFormSubmissionHandlers();
        this.setupDebugPageHandlers();
        this.setupTradeFormHandlers();
        this.setupMissionHandlers();
        this.setupChoiceCurrencyIndicators();
    },

    handleCharacterSelect(event) {
        // Handle character selection
        console.log('Character selected:', event.target.dataset.character);
    },

    /**
     * Setup character selection buttons
     */
    setupCharacterSelection() {
        const selectButtons = document.querySelectorAll('.select-character-btn');
        if (!selectButtons.length) return;
        
        console.log('Setting up character selection buttons:', selectButtons.length);
        
        // Get all character cards
        const characterCards = document.querySelectorAll('.character-select-card');
        const characterCheckboxes = document.querySelectorAll('input[name="selected_images"]');
        
        // Function to update the hidden input with selected character IDs
        const updateSelectedImagesInput = () => {
            const selectedIds = Array.from(characterCheckboxes)
                .filter(checkbox => checkbox.checked)
                .map(checkbox => checkbox.value);
                
            // Update hidden input if it exists
            const hiddenInput = document.querySelector('input[name="selected_images"]');
            if (hiddenInput && hiddenInput.type === 'hidden') {
                hiddenInput.value = selectedIds.join(',');
            }
        };
        
        // Function to clear all selections
        const clearAllSelections = () => {
            characterCards.forEach(card => {
                card.classList.remove('selected');
                const indicator = card.querySelector('.selection-indicator');
                if (indicator) {
                    indicator.style.display = 'none';
                }
            });

            characterCheckboxes.forEach(checkbox => {
                checkbox.checked = false;
            });
        };
        
        // Handle select character button clicks
        selectButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();

                const characterId = this.dataset.characterId;
                const characterCard = document.querySelector(`.character-select-card[data-id="${characterId}"]`);

                if (!characterCard) return;

                const checkbox = document.getElementById(`character${characterId}`);
                const selectionIndicator = characterCard.querySelector('.selection-indicator');

                if (!checkbox || !selectionIndicator) return;

                // For single-select behavior
                clearAllSelections();

                // Select this character
                checkbox.checked = true;
                selectionIndicator.style.display = 'block';
                characterCard.classList.add('selected');

                updateSelectedImagesInput();

                // Show selected characters container
                const selectedImagesContainer = document.querySelector('.selected-characters-container');
                if (selectedImagesContainer) selectedImagesContainer.style.display = 'block';

                // Show toast notification
                if (window.UIUtils && typeof window.UIUtils.showToast === 'function') {
                    window.UIUtils.showToast('Character Selected', 'Character has been selected for your story.');
                }
            });
        });
        
        // Handle character selection when clicking on card
        characterCards.forEach(card => {
            card.addEventListener('click', function() {
                const characterId = this.dataset.id;
                const checkbox = document.getElementById(`character${characterId}`);
                const selectionIndicator = this.querySelector('.selection-indicator');

                if (!checkbox || !selectionIndicator) return;

                // For single-select behavior
                clearAllSelections();

                // Select this character
                checkbox.checked = true;
                selectionIndicator.style.display = 'block';
                this.classList.add('selected');

                updateSelectedImagesInput();

                // Show toast notification
                if (window.UIUtils && typeof window.UIUtils.showToast === 'function') {
                    window.UIUtils.showToast('Character Selected', 'Character has been selected for your story.');
                }
            });
        });
    },

    /**
     * Setup reroll buttons for characters
     */
    setupRerollButtons() {
        const rerollButtons = document.querySelectorAll('.reroll-btn');
        if (!rerollButtons.length) return;

        console.log('Setting up reroll buttons:', rerollButtons.length);

        rerollButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();

                // Show loading state
                const originalButtonText = this.innerHTML;
                this.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Rerolling...';
                this.disabled = true;

                const cardContainer = this.closest('.character-container');
                if (!cardContainer) return;

                const characterCard = cardContainer.querySelector('.character-select-card');
                if (!characterCard) return;
                
                // Get the character ID
                const characterId = characterCard.dataset.id;
                
                // Make AJAX request to get a new character
                fetch('/reroll_character', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ character_id: characterId }),
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok: ' + response.status);
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.success) {
                        // Get the new character HTML and replace the old card
                        const newCharacterHtml = data.character_html;
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = newCharacterHtml;
                        
                        // Replace the entire character container
                        if (tempDiv.firstChild) {
                            cardContainer.outerHTML = tempDiv.innerHTML;
                            
                            // Reinitialize event handlers for the new card
                            const newCard = document.querySelector(`.character-select-card[data-id="${data.character.id}"]`);
                            if (newCard) {
                                // Reinitialize character selection events
                                const selectBtn = newCard.closest('.character-container').querySelector('.select-character-btn');
                                if (selectBtn) {
                                    selectBtn.addEventListener('click', this.handleCharacterSelect);
                                }
                                
                                // Reinitialize reroll button
                                const newRerollBtn = newCard.closest('.character-container').querySelector('.reroll-btn');
                                if (newRerollBtn) {
                                    newRerollBtn.addEventListener('click', this.setupRerollButtons);
                                }
                            }
                            
                            // Show toast notification
                            if (window.UIUtils && typeof window.UIUtils.showToast === 'function') {
                                window.UIUtils.showToast('Character Updated', 'A new character has been loaded!');
                            }
                        }
                    } else {
                        console.error('Failed to reroll character:', data.error);
                        if (window.UIUtils && typeof window.UIUtils.showToast === 'function') {
                            window.UIUtils.showToast('Error', 'Failed to load a new character. Please try again.', 'error');
                        }
                    }
                })
                .catch(error => {
                    console.error('Failed to reroll character:', error.message);
                    if (window.UIUtils && typeof window.UIUtils.showToast === 'function') {
                        window.UIUtils.showToast('Error', 'Failed to load a new character. Please try again.', 'error');
                    }
                })
                .finally(() => {
                    // Reset button if it still exists
                    const btn = document.querySelector(`.reroll-btn[data-card-index="${this.dataset.cardIndex}"]`);
                    if (btn) {
                        btn.innerHTML = originalButtonText;
                        btn.disabled = false;
                    }
                });
            });
        });
    },

    /**
     * Setup form submission handlers
     */
    setupFormSubmissionHandlers() {
        const storyForm = document.getElementById('story-form');
        if (storyForm) {
            storyForm.addEventListener('submit', function(e) {
                // Check if at least one character is selected
                const selectedCharacters = document.querySelectorAll('input[name="selected_images"]:checked');
                if (selectedCharacters.length === 0) {
                    e.preventDefault();
                    if (window.UIUtils && typeof window.UIUtils.showToast === 'function') {
                        window.UIUtils.showToast('Error', 'Please select at least one character for your story.', 'error');
                    }
                    return false;
                }
                
                // Show loading spinner
                const submitBtn = this.querySelector('button[type="submit"]');
                if (submitBtn) {
                    const originalText = submitBtn.innerHTML;
                    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Generating Story...';
                    submitBtn.disabled = true;
                    
                    // Re-enable button after timeout (in case the form submission fails)
                    setTimeout(() => {
                        submitBtn.innerHTML = originalText;
                        submitBtn.disabled = false;
                    }, 15000);
                }
            });
        }
    },

    /**
     * Setup debug page handlers
     */
    setupDebugPageHandlers() {
        // Implementation for debug page handlers
    },

    /**
     * Setup trade form handlers
     */
    setupTradeFormHandlers() {
        // Implementation for trade form handlers
    },

    /**
     * Setup mission handlers
     */
    setupMissionHandlers() {
        // Implementation for mission handlers
    },

    /**
     * Setup choice currency indicators
     */
    setupChoiceCurrencyIndicators() {
        // Implementation for choice currency indicators
    }
};

// Export for module systems
// Export for ES modules
export default EventHandlers;
export { EventHandlers };

// For CommonJS modules
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
