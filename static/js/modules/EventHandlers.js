/**
 * EventHandlers Module
 * Central module for managing all event listeners and interactions
 */
export const EventHandlers = {
    initialize() {
        console.log('Event handlers initialized');
        this.setupEventListeners();
    },

    setupEventListeners() {
        this.setupCharacterSelection();
        this.setupRerollButtons();
        this.setupFormSubmissionHandlers();

        // Add these if they exist in your application
        if (typeof this.setupDebugPageHandlers === 'function') this.setupDebugPageHandlers();
        if (typeof this.setupTradeFormHandlers === 'function') this.setupTradeFormHandlers();
        if (typeof this.setupMissionHandlers === 'function') this.setupMissionHandlers();
        if (typeof this.setupChoiceCurrencyIndicators === 'function') this.setupChoiceCurrencyIndicators();
    },

    setupCharacterSelection() {
        const selectButtons = document.querySelectorAll('.select-character-btn');
        console.log('Setting up character selection buttons:', selectButtons.length);

        if (!selectButtons.length) return;

        // Function to clear all selections
        const clearAllSelections = () => {
            document.querySelectorAll('.character-select-card').forEach(card => {
                card.classList.remove('selected');
                const indicator = card.querySelector('.selection-indicator');
                if (indicator) indicator.style.display = 'none';

                const checkbox = document.getElementById(`character${card.dataset.id}`);
                if (checkbox) checkbox.checked = false;
            });
        };

        // Function to update hidden form input with selected characters
        const updateSelectedImagesInput = () => {
            const selectedIds = Array.from(document.querySelectorAll('.character-checkbox:checked'))
                .map(checkbox => checkbox.value);

            // Update hidden input if it exists
            const hiddenInput = document.querySelector('input[name="selected_images"]');
            if (hiddenInput) {
                hiddenInput.value = selectedIds.join(',');
            }
        };

        // Setup click handlers for each select button
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

                // Show toast notification
                if (window.UIUtils && typeof window.UIUtils.showToast === 'function') {
                    window.UIUtils.showToast(
                        'Character Selected', 
                        'Character has been selected for your story.'
                    );
                }
            });
        });
    },

    setupRerollButtons() {
        const rerollButtons = document.querySelectorAll('.reroll-btn');
        console.log('Setting up reroll buttons:', rerollButtons.length);

        if (!rerollButtons.length) return;

        rerollButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();

                const cardContainer = this.closest('.character-container') || this.closest('.card-body');
                if (!cardContainer) return;

                const characterCard = cardContainer.closest('.character-select-card');
                if (!characterCard) return;

                // Show loading state
                const originalButtonText = this.innerHTML;
                this.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Rerolling...';
                this.disabled = true;

                // Get the character ID to reroll
                const characterId = characterCard.dataset.id;

                // Make AJAX request to reroll endpoint
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
                        // Replace character card with new one
                        const newCharacterHtml = data.character_html;
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = newCharacterHtml;

                        const newCard = tempDiv.querySelector('.character-select-card');
                        if (newCard) {
                            characterCard.outerHTML = newCard.outerHTML;

                            // Re-initialize event handlers for the new card
                            const newSelectBtn = newCard.querySelector('.select-character-btn');
                            if (newSelectBtn) {
                                newSelectBtn.addEventListener('click', function(e) {
                                    e.preventDefault();
                                    e.stopPropagation();

                                    const characterId = this.dataset.characterId;
                                    const characterCard = document.querySelector(`.character-select-card[data-id="${characterId}"]`);

                                    if (!characterCard) return;

                                    // Clear all other selections
                                    document.querySelectorAll('.character-select-card').forEach(card => {
                                        card.classList.remove('selected');
                                        const indicator = card.querySelector('.selection-indicator');
                                        if (indicator) indicator.style.display = 'none';

                                        const checkbox = document.getElementById(`character${card.dataset.id}`);
                                        if (checkbox) checkbox.checked = false;
                                    });

                                    // Select this character
                                    const checkbox = document.getElementById(`character${characterId}`);
                                    const selectionIndicator = characterCard.querySelector('.selection-indicator');

                                    if (checkbox) checkbox.checked = true;
                                    if (selectionIndicator) selectionIndicator.style.display = 'block';
                                    characterCard.classList.add('selected');

                                    // Update hidden input if it exists
                                    const selectedIds = Array.from(document.querySelectorAll('.character-checkbox:checked'))
                                        .map(checkbox => checkbox.value);
                                    const hiddenInput = document.querySelector('input[name="selected_images"]');
                                    if (hiddenInput) {
                                        hiddenInput.value = selectedIds.join(',');
                                    }

                                    // Show toast notification
                                    if (window.UIUtils && typeof window.UIUtils.showToast === 'function') {
                                        window.UIUtils.showToast(
                                            'Character Selected', 
                                            'Character has been selected for your story.'
                                        );
                                    }
                                });
                            }

                            // Re-initialize reroll button for the new card
                            const newRerollBtn = newCard.querySelector('.reroll-btn');
                            if (newRerollBtn) {
                                newRerollBtn.addEventListener('click', this.onclick);
                            }
                        }
                    } else {
                        console.error('Failed to reroll character:', data.error);
                        // Show error toast
                        if (window.UIUtils && typeof window.UIUtils.showToast === 'function') {
                            window.UIUtils.showToast('Error', data.error || 'Failed to reroll character.', 'error');
                        }
                    }
                })
                .catch(error => {
                    console.error('Error rerolling character:', error);
                    // Show error toast
                    if (window.UIUtils && typeof window.UIUtils.showToast === 'function') {
                        window.UIUtils.showToast('Error', 'Failed to reroll character. Please try again.', 'error');
                    }
                })
                .finally(() => {
                    // Restore button state if button still exists
                    if (this && !this.isConnected) return;
                    this.innerHTML = originalButtonText;
                    this.disabled = false;
                });
            });
        });
    },

    setupFormSubmissionHandlers() {
        // Setup handler for story generation form
        const storyForm = document.getElementById('storyForm');
        if (storyForm) {
            storyForm.addEventListener('submit', function(e) {
                // Check if any character is selected
                const selectedCharacters = document.querySelectorAll('.character-checkbox:checked');
                if (selectedCharacters.length === 0) {
                    e.preventDefault();
                    // Show error message
                    if (window.UIUtils && typeof window.UIUtils.showToast === 'function') {
                        window.UIUtils.showToast('Error', 'Please select at least one character for your story.', 'error');
                    }
                    return false;
                }

                // Continue with form submission
                // For AJAX submission, uncomment the following:
                /*
                e.preventDefault();
                const formData = new FormData(storyForm);
                fetch('/generate_story', {
                    method: 'POST',
                    body: formData
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success && data.redirect) {
                        window.location.href = data.redirect;
                    } else {
                        // Show error
                        window.UIUtils.showToast('Error', data.error || 'Failed to generate story.', 'error');
                    }
                });
                */
            });
        }
    }
};