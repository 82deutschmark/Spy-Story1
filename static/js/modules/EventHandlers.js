/**
 * Event Handlers Module
 * Centralizes event handling for various UI components
 */
import UIUtils from './UIUtils.js';
import CurrencyManager from './CurrencyManager.js';
import CharacterManager from './CharacterManager.js';
import StoryManager from './StoryManager.js';
import MissionManager from './MissionManager.js';
import PaymentManager from './PaymentManager.js';

export default {
    /**
     * Initialize all event handlers
     */
    initialize() {
        console.log('Event handlers initialized');
        this.initCharacterSelection();
        this.initStoryChoices();
        this.setupFormSubmissionHandlers(); // Retained from original
        this.setupDebugPageHandlers(); // Retained from original
        this.setupTradeFormHandlers(); // Retained from original
        this.setupMissionHandlers(); // Retained from original
        this.setupChoiceCurrencyIndicators();// Retained from original

        // Initialize Payment System.  Kept the timeout from original
        console.log('DOM loaded, initializing payment system...');
        setTimeout(() => {
            PaymentManager.initialize();
        }, 1000);


        // Highlight characters in story. Retained from original
        CharacterManager.highlightCharactersInStory();

        // Check radio buttons on page load to restore selection state. Retained from original.  This is now redundant due to initCharacterSelection, but keeping for completeness.
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
    },

    /**
     * Initialize character selection event handlers
     */
    initCharacterSelection() {
        // Character selection elements
        const characterCards = document.querySelectorAll('.character-select-card');
        const characterCheckboxes = document.querySelectorAll('.character-checkbox');
        const storyForm = document.getElementById('storyForm');
        const characterSelectionError = document.getElementById('characterSelectionError');

        if (!characterCards.length) return;

        // Handle character selection when clicking on card
        characterCards.forEach(card => {
            card.addEventListener('click', function() {
                const characterId = this.dataset.id;
                const checkbox = document.getElementById(`character${characterId}`);
                const selectionIndicator = this.querySelector('.selection-indicator');

                if (!checkbox || !selectionIndicator) return;

                // For single-select behavior
                // Clear all selections first
                characterCards.forEach(c => {
                    c.classList.remove('selected');
                    const indicator = c.querySelector('.selection-indicator');
                    if (indicator) {
                        indicator.style.display = 'none';
                    }
                });

                characterCheckboxes.forEach(cb => {
                    cb.checked = false;
                });

                // Select this character
                checkbox.checked = true;
                selectionIndicator.style.display = 'block';
                this.classList.add('selected');

                // Update hidden input fields if needed
                if (storyForm) {
                    // Remove any existing hidden inputs
                    document.querySelectorAll('input[name="selected_images[]"]').forEach(el => el.remove());

                    // Add new hidden input for the selected character
                    const input = document.createElement('input');
                    input.type = 'hidden';
                    input.name = 'selected_images[]';
                    input.value = checkbox.value;
                    storyForm.appendChild(input);
                }

                // Show toast notification if UIUtils is available
                if (window.App && window.App.UI) {
                    window.App.UI.showToast('Character Selected', 'Character has been selected for your story.');
                }
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

                // Trigger the click event on the card
                characterCard.click();
            });
        });
    },

    /**
     * Initialize story choice event handlers
     */
    initStoryChoices() {
        // Story choice form submission - use delegated event handling to prevent duplicates
        document.addEventListener('submit', function(e) {
            // Only process choice forms
            if (!e.target.classList.contains('choice-form')) return;

            e.preventDefault();
            const form = e.target;
            const btn = form.querySelector('button');

            // Prevent double-submission
            if (btn.disabled) return;

            btn.disabled = true;
            btn.classList.add('loading');

            // Use UIUtils if available for loading overlay
            let loadingPercent;
            if (window.App && window.App.UI) {
                loadingPercent = window.App.UI.createLoadingOverlay('Continuing your story...');
            }

            let progress = 0;
            const progressInterval = setInterval(() => {
                if (progress < 90) {
                    progress += 5;
                    if (window.App && window.App.UI && loadingPercent) {
                        window.App.UI.updateLoadingPercent(loadingPercent, progress);
                    }
                }
            }, 500);

            // Submit the form
            const formData = new FormData(form);
            fetch(form.action, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })
            .then(response => response.json())
            .then(data => {
                clearInterval(progressInterval);

                if (data.success && data.redirect) {
                    if (window.App && window.App.UI && loadingPercent) {
                        window.App.UI.updateLoadingPercent(loadingPercent, 100);
                    }
                    setTimeout(() => {
                        window.location.href = data.redirect;
                    }, 500);
                } else {
                    throw new Error(data.error || 'Failed to continue story');
                }
            })
            .catch(error => {
                console.error('Story continuation error:', error);

                if (window.App && window.App.UI) {
                    window.App.UI.showToast('Error', error.message || 'Failed to continue the story');
                }

                btn.disabled = false;
                btn.classList.remove('loading');
                clearInterval(progressInterval);

                if (loadingPercent) {
                    const overlay = loadingPercent.closest('.loading-overlay');
                    if (overlay) overlay.remove();
                }
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


        // Story choice form submission - use delegated event handling to prevent duplicates.  This is now redundant, kept for completeness
        document.addEventListener('submit', function(e) {
            // Only process choice forms
            if (!e.target.classList.contains('choice-form')) return;
            e.preventDefault();

            // Use the new processChoice function
            this.processChoice(e.target)
                .catch(error => {
                    console.error('Choice processing failed:', error);
                });
        }.bind(this)); //bind this to the event listener
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
     * Sets up choice form submission handlers. This is now redundant, kept for completeness
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

    async processChoice(choice) {
        try {
            console.log("Processing choice: ", choice);

            // Process the choice
            const response = await StoryManager.processChoice(choice);

            // Validate response before updating UI
            if (!response || (typeof response === 'string' && response.trim() === '')) {
                throw new Error("Empty response received from server");
            }

            console.log("Choice processing successful, response:", response);

            // Update the UI with the new story
            updateStoryboard(response);
        } catch (error) {
            console.error("Choice processing failed: ", error);
            showError("Error processing choice: " + (error.message || "Unknown error"));
        }
    }
};

// Placeholder functions - replace with actual implementations
function updateStoryboard(response) {
    //Implement your update logic here
    console.log("Updating storyboard with:", response);
}

function showError(message) {
    //Implement your error handling here
    console.error(message);
    alert(message);
}