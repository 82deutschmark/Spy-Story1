/**
 * Event Handlers Module
 * Centralizes all event handlers for better organization
 */
const EventHandlers = {
    initialize() {
        console.log('Event handlers initialized');
        this.setupCharacterSelection();
        this.setupRerollButtons();
        this.setupFormSubmissionHandlers(); 
        this.setupDebugPageHandlers(); 
        this.setupTradeFormHandlers(); 
        this.setupMissionHandlers(); 
        this.setupChoiceCurrencyIndicators();

        // Initialize Payment System.  Kept the timeout from original
        console.log('DOM loaded, initializing payment system...');
        setTimeout(() => {
            PaymentManager.initialize();
        }, 1000);

        // Highlight characters in story. 
        CharacterManager.highlightCharactersInStory();
    },

    /**
     * Setup character selection buttons
     */
    setupCharacterSelection() {
        const selectButtons = document.querySelectorAll('.select-character-btn');
        if (!selectButtons.length) return;

        selectButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();

                const characterId = this.dataset.characterId;
                const characterCard = document.querySelector(`.character-select-card[data-id="${characterId}"]`);

                if (!characterCard) return;

                // For single-select behavior
                document.querySelectorAll('.character-select-card').forEach(card => {
                    card.classList.remove('selected');
                    const indicator = card.querySelector('.selection-indicator');
                    if (indicator) indicator.style.display = 'none';
                });

                // Select this character
                const selectionIndicator = characterCard.querySelector('.selection-indicator');
                if (selectionIndicator) selectionIndicator.style.display = 'block';
                characterCard.classList.add('selected');

                const checkbox = document.getElementById(`character${characterId}`);
                if (checkbox) checkbox.checked = true;

                // Update hidden input with selected character
                const selectedImagesInput = document.querySelector('input[name="selected_images"]');
                if (selectedImagesInput) selectedImagesInput.value = characterId;

                // Show selected characters container
                const selectedImagesContainer = document.querySelector('.selected-characters-container');
                if (selectedImagesContainer) selectedImagesContainer.style.display = 'block';

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

                const cardContainer = this.closest('.character-container');
                if (!cardContainer) return;

                const characterCard = cardContainer.querySelector('.character-select-card');
                if (!characterCard) return;

                // Show loading state
                const originalButtonText = this.innerHTML;
                this.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Rerolling...';

                // Fetch a new random character
                fetch('/api/random_character')
                    .then(response => response.json())
                    .then(data => {
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

                            // Show toast notification
                            if (window.UIUtils && typeof window.UIUtils.showToast === 'function') {
                                window.UIUtils.showToast('Character Updated', 'A new character has been loaded!');
                            } else {
                                console.log('Character updated successfully');
                            }
                        } else {
                            if (window.UIUtils && typeof window.UIUtils.showToast === 'function') {
                                window.UIUtils.showToast('Error', 'Failed to load a new character. Please try again.');
                            } else {
                                console.error('Failed to load a new character');
                            }
                        }

                        // Reset button
                        this.innerHTML = originalButtonText;
                    })
                    .catch(error => {
                        console.error('Error fetching random character:', error);
                        this.innerHTML = originalButtonText;
                        if (window.UIUtils && typeof window.UIUtils.showToast === 'function') {
                            window.UIUtils.showToast('Error', 'Failed to load a new character. Please try again.');
                        }
                    });
            });
        });
    },

    setupFormSubmissionHandlers: function() {
        // Story form
        const storyForm = document.getElementById('storyForm');
        if (storyForm) {
            storyForm.addEventListener('submit', function(e) {
                e.preventDefault();

                // Check if at least one character is selected
                const selectedCharacters = document.querySelectorAll('.character-checkbox:checked');
                const characterSelectionError = document.getElementById('characterSelectionError');

                if (selectedCharacters.length !== 1) {
                    if (characterSelectionError) {
                        characterSelectionError.style.display = 'block';
                        characterSelectionError.textContent = 'Please select a character for your story';
                        window.scrollTo(0, 0);
                    }
                    UIUtils.showToast('Selection Needed', 'Please select a character before continuing');
                    return;
                }

                // Hide error message if shown
                if (characterSelectionError) {
                    characterSelectionError.style.display = 'none';
                }

                // Update selected images input
                CharacterManager.updateSelectedImagesInput();

                // Submit the form
                const formData = new FormData(this);
                StoryManager.generateStory(formData)
                    .then(data => {
                        // Process the generated story
                        if (data.redirect) {
                            console.log('Redirecting to:', data.redirect);
                            // Redirect to the new story page
                            window.location.href = data.redirect;
                        } else {
                            console.log('Story generated successfully:', data);
                            UIUtils.toggleLoadingOverlay(false);
                        }
                    })
                    .catch(error => {
                        console.error('Story generation failed:', error);
                        UIUtils.toggleLoadingOverlay(false);

                        // Display more specific error message
                        const errorMessage = error.message || 'Failed to generate story';
                        UIUtils.showNotification(errorMessage, 'error');
                    });
            });
        }


    },

    setupDebugPageHandlers() {
        const editModeSwitch = document.getElementById('editModeSwitch');
        const generatedContent = document.getElementById('generatedContent');

        if (editModeSwitch && generatedContent) {
            editModeSwitch.addEventListener('change', function() {
                if (this.checked) {
                    generatedContent.contentEditable = true;
                    generatedContent.classList.add('editable');
                    generatedContent.focus();
                } else {
                    generatedContent.contentEditable = false;
                    generatedContent.classList.remove('editable');
                }
            });
        }
    },

    setupTradeFormHandlers() {
        const tradeForm = document.getElementById('tradeForm');
        if (tradeForm) {
            tradeForm.addEventListener('submit', function(e) {
                e.preventDefault();

                const fromCurrency = document.getElementById('fromCurrency').value;
                const toCurrency = document.getElementById('toCurrency').value;
                const amount = parseInt(document.getElementById('tradeAmount').value);

                CurrencyManager.processTradeRequest(fromCurrency, toCurrency, amount)
                    .then(() => {
                        // Reset form
                        document.getElementById('tradeAmount').value = '';

                        // Close modal
                        const modal = bootstrap.Modal.getInstance(document.getElementById('tradeModal'));
                        if (modal) {
                            modal.hide();
                        }
                    })
                    .catch(error => {
                        console.error('Trade request failed:', error);
                    });
            });
        }

        // Handle character offer trade buttons
        document.addEventListener('click', function(e) {
            if (!e.target.matches('.accept-trade-btn')) return;

            const fromCurrency = e.target.dataset.from;
            const toCurrency = e.target.dataset.to;

            // Default to 1 unit
            const amount = 1;

            CurrencyManager.processTradeRequest(fromCurrency, toCurrency, amount)
                .then(() => {
                    // Hide the trade offer
                    const tradeOffer = document.querySelector('.currency-trade-offer');
                    if (tradeOffer) {
                        tradeOffer.style.display = 'none';
                    }
                })
                .catch(error => {
                    console.error('Trade offer acceptance failed:', error);
                });
        });
    },

    setupMissionHandlers() {
        // Handle mission details button click
        document.addEventListener('click', function(e) {
            if (!e.target.matches('.mission-details-btn')) return;

            const missionId = e.target.dataset.missionId;
            MissionManager.loadMissionDetails(missionId)
                .catch(error => {
                    console.error('Failed to load mission details:', error);
                });
        });

        // Handle mission completion button
        document.addEventListener('click', function(e) {
            if (!e.target.matches('#completeBtn')) return;

            const missionId = e.target.dataset.missionId;
            MissionManager.completeMission(missionId)
                .catch(error => {
                    console.error('Failed to complete mission:', error);
                });
        });

        // Handle mission failure button
        document.addEventListener('click', function(e) {
            if (!e.target.matches('#failBtn')) return;

            const missionId = e.target.dataset.missionId;
            MissionManager.failMission(missionId)
                .catch(error => {
                    console.error('Failed to fail mission:', error);
                });
        });
    },

    setupChoiceCurrencyIndicators() {
        document.querySelectorAll('.choice-form').forEach(form => {
            const button = form.querySelector('button');
            if (button && button.dataset.currencyReq) {
                const requirements = JSON.parse(button.dataset.currencyReq);
                const reqDiv = document.createElement('div');
                reqDiv.className = 'choice-currency-req';

                Object.entries(requirements).forEach(([currency, amount]) => {
                    const reqItem = document.createElement('span');
                    reqItem.className = 'currency-req-item';
                    reqItem.innerHTML = `${currency}${amount}`;
                    reqDiv.appendChild(reqItem);
                });

                button.parentNode.insertBefore(reqDiv, button.nextSibling);
            }
        });
    },

    //initStoryChoices and other redundant methods removed

};

// Export for ES module use
export default EventHandlers;

// Initialize on page load if we're not in an ES module context
if (typeof window !== 'undefined') {
    window.EventHandlers = EventHandlers;

    // Auto-initialize on DOM loaded if not being imported as a module
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => EventHandlers.initialize());
    } else {
        EventHandlers.initialize();
    }
}