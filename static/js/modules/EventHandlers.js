/**
 * Event Handlers Module
 * Centralizes all event handlers for the application
 */
import UIUtils from './UIUtils.js';
import CurrencyManager from './CurrencyManager.js';
import CharacterManager from './CharacterManager.js';
import StoryManager from './StoryManager.js';
import MissionManager from './MissionManager.js';
import PaymentManager from './PaymentManager.js';

export default {
    /**
     * Sets up all event handlers for the application
     */
    setupEventHandlers() {
        // Character selection
        this.setupCharacterSelectionHandlers();

        // Form submission handling
        this.setupFormSubmissionHandlers();

        // Debug page enhancements
        this.setupDebugPageHandlers();

        // Trade form handling
        this.setupTradeFormHandlers();

        // Mission-related handlers
        this.setupMissionHandlers();

        // Update choice buttons to show currency requirements
        this.setupChoiceCurrencyIndicators();

        //Setup story choice submission
        this.setupChoiceSubmission();
    },

    /**
     * Sets up character selection handlers
     */
    setupCharacterSelectionHandlers() {
        const characterCards = document.querySelectorAll('.character-select-card');
        characterCards.forEach(card => {
            card.addEventListener('click', function() {
                const characterId = this.dataset.id;
                const checkbox = document.getElementById(`character${characterId}`);
                const selectionIndicator = this.querySelector('.selection-indicator');

                if (!checkbox || !selectionIndicator) return;

                // For single-select behavior
                CharacterManager.clearAllSelections();

                // Select this character
                checkbox.checked = true;
                selectionIndicator.style.display = 'block';
                this.classList.add('selected');

                CharacterManager.updateSelectedImagesInput();

                // Show toast notification
                UIUtils.showToast('Character Selected', 'Character has been selected for your story.');
            });
        });

        // Handle select character button clicks
        const selectButtons = document.querySelectorAll('.select-character-btn');
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
                CharacterManager.clearAllSelections();

                // Select this character
                checkbox.checked = true;
                selectionIndicator.style.display = 'block';
                characterCard.classList.add('selected');

                CharacterManager.updateSelectedImagesInput();

                // Show toast notification
                UIUtils.showToast('Character Selected', 'Character has been selected for your story.');
            });
        });

        // Handle reroll buttons
        const rerollButtons = document.querySelectorAll('.reroll-btn');
        rerollButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();

                const cardContainer = this.closest('.character-container');
                if (!cardContainer) return;

                const characterCard = cardContainer.querySelector('.character-select-card');
                if (!characterCard) return;

                // Show loading state
                this.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Rerolling...';

                // Fetch a new random character
                CharacterManager.fetchRandomCharacter()
                    .then(data => {
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

                        // Update hidden input
                        const checkbox = cardContainer.querySelector('.character-checkbox');
                        if (checkbox) {
                            checkbox.value = data.id;
                            checkbox.id = `character${data.id}`;
                        }

                        // Show toast notification
                        UIUtils.showToast('Character Updated', 'A new character has been loaded!');
                    })
                    .catch(error => {
                        console.error('Error fetching random character:', error);
                        UIUtils.showToast('Error', 'Failed to load a new character. Please try again.');
                    })
                    .finally(() => {
                        // Reset button
                        this.innerHTML = '<i class="fas fa-dice me-1"></i> Reroll Character';
                    });
            });
        });
    },

    /**
     * Sets up form submission handlers
     */
    setupFormSubmissionHandlers() {
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

        // Story choice form submission - use delegated event handling to prevent duplicates
        document.addEventListener('submit', function(e) {
            // Only process choice forms
            if (!e.target.classList.contains('choice-form')) return;
            e.preventDefault();

            StoryManager.processChoice(e.target)
                .catch(error => {
                    console.error('Choice processing failed:', error);
                });
        });
    },

    /**
     * Sets up debug page handlers
     */
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

    /**
     * Sets up trade form handlers
     */
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

    /**
     * Sets up mission-related handlers
     */
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

    /**
     * Sets up choice currency indicators
     */
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

    /**
     * Sets up choice form submission handlers
     */
    setupChoiceSubmission() {
        // Using a flag to track if an event handler is already set up
        if (this._choiceSubmissionInitialized) {
            console.log("Choice submission handlers already initialized, skipping");
            return;
        }

        // Set the flag to prevent duplicate initialization
        this._choiceSubmissionInitialized = true;

        // Delegate event listener for choice forms
        document.addEventListener('submit', function(event) {
            const choiceForm = event.target.closest('.choice-form');
            if (!choiceForm) return; // Not a choice form

            event.preventDefault();

            // Prevent double submission
            const submitButton = choiceForm.querySelector('button[type="submit"]');
            if (submitButton && submitButton.disabled) {
                console.log("Submission already in progress, ignoring duplicate");
                return;
            }

            // Disable the button to prevent multiple submissions
            if (submitButton) {
                submitButton.disabled = true;
            }

            // Create loading overlay
            const loadingOverlay = UIUtils.createLoadingOverlay('Continuing your adventure...');
            const loadingPercent = loadingOverlay.querySelector('.loading-percent');

            let progress = 0;
            const progressInterval = setInterval(() => {
                if (progress < 90) {
                    progress += 5;
                    UIUtils.updateLoadingPercent(loadingPercent, progress);
                }
            }, 500);

            // Validate form data before submitting
            const formData = new FormData(choiceForm);
            const previousChoice = formData.get('previous_choice');
            const storyContext = formData.get('story_context');

            if (!previousChoice || !storyContext) {
                clearInterval(progressInterval);
                if (loadingOverlay) {
                    loadingOverlay.remove();
                }
                // Re-enable the button if submission fails
                if (submitButton) {
                    submitButton.disabled = false;
                }
                UIUtils.showToast('Error', 'Missing required story parameters. Please try again.');
                return;
            }

            // Generate next part of the story
            StoryManager.generateStory(formData)
                .then(response => {
                    // Hide the loading overlay
                    UIUtils.toggleLoadingOverlay(false);
                    // Redirect to the storyboard page
                    if (response.redirect) {
                        window.location.href = response.redirect;
                    } else {
                        console.log('Story response:', response);
                    }
                    // Re-enable the button after successful submission
                    if (submitButton) {
                        submitButton.disabled = false;
                    }
                    clearInterval(progressInterval);
                    if (loadingOverlay) {
                        loadingOverlay.remove();
                    }
                })
                .catch(error => {
                    // Hide the loading overlay
                    UIUtils.toggleLoadingOverlay(false);
                    console.error('Story generation failed:', error);

                    // Display more specific error message
                    const errorMessage = error.message || 'Failed to generate story';
                    UIUtils.showNotification(errorMessage, 'error');

                    // If the error is about missing parameters, help the user
                    if (errorMessage.includes('Missing required')) {
                        setTimeout(() => {
                            alert('Please ensure you have selected at least one character and all story parameters (conflict, setting, narrative style, and mood).');
                        }, 500);
                    }
                    // Re-enable the button after failed submission
                    if (submitButton) {
                        submitButton.disabled = false;
                    }
                    clearInterval(progressInterval);
                    if (loadingOverlay) {
                        loadingOverlay.remove();
                    }
                });
        });
    },

    /**
     * Initializes the application
     */
    initialize() {
        // Set up all event handlers
        this.setupEventHandlers();

        // Highlight characters in story
        CharacterManager.highlightCharactersInStory();

        // Check radio buttons on page load to restore selection state
        const characterCheckboxes = document.querySelectorAll('.character-checkbox');
        const characterCards = document.querySelectorAll('.character-select-card');

        if (characterCheckboxes && characterCheckboxes.length > 0 && characterCards && characterCards.length > 0) {
            characterCheckboxes.forEach((checkbox, index) => {
                if (checkbox.checked && index < characterCards.length) {
                    characterCards[index].classList.add('selected');
                    const indicator = characterCards[index].querySelector('.selection-indicator');
                    if (indicator) {
                        indicator.style.display = 'block';
                    }
                }
            });
        }

        // Initialize Payment System
        console.log('DOM loaded, initializing payment system...');
        setTimeout(() => {
            PaymentManager.initialize();
        }, 1000);
    }
};