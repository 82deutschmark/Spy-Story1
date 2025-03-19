/**
 * CharacterSelector.js - Character Selection Component
 * =================================================
 * 
 * This module handles character selection functionality independently from form handling.
 * It provides a clean interface for managing character selection state and UI updates.
 * 
 * Key Features:
 * ------------
 * - Single character selection with visual feedback
 * - Character card highlighting and selection indicators
 * - Error state management
 * - Event emission for selection changes
 * - Character rerolling functionality
 * 
 * Integration Points:
 * -----------------
 * - HTML: Expects elements with classes 'character-container', 'character-select-card'
 * - Forms: Updates hidden input fields for form submission
 * - Events: Emits 'characterSelected' event with selected character data
 * - API: Handles character rerolling through the backend
 * 
 * Usage:
 * -----
 * 1. Initialize with CharacterSelector.initialize()
 * 2. Listen for 'characterSelected' events to handle selection changes
 * 3. Use getSelectedCharacter() to get current selection
 * 4. Use clearSelection() to reset selection
 * 5. Reroll buttons are automatically handled
 */

import { UIUtils } from './UIUtils.js';

class CharacterSelector {
    constructor() {
        this.selectedCharacter = null;
        this.containers = [];
        this.handleContainerClick = this.handleContainerClick.bind(this);
        this.handleReroll = this.handleReroll.bind(this);
        this.handleSelectButton = this.handleSelectButton.bind(this);
    }

    /**
     * Initialize the character selector
     * Sets up event listeners and initial state
     */
    initialize() {
        // Convert NodeList to Array for proper array methods
        this.containers = Array.from(document.querySelectorAll('.character-container'));
        this.containers.forEach(container => {
            // Setup click handler for card selection
            container.addEventListener('click', this.handleContainerClick);

            // Setup reroll button handler
            const rerollBtn = container.querySelector('.reroll-btn');
            if (rerollBtn) {
                rerollBtn.addEventListener('click', (e) => this.handleReroll(e, container));
            }

            // Setup select button handler
            const selectBtn = container.querySelector('.select-character-btn');
            if (selectBtn) {
                selectBtn.addEventListener('click', (e) => this.handleSelectButton(e, container));
            }
        });
    }

    /**
     * Handle character reroll
     * @param {Event} event - The click event
     * @param {HTMLElement} container - The character container
     */
    async handleReroll(event, container) {
        event.preventDefault();
        event.stopPropagation();

        const rerollBtn = event.target.closest('.reroll-btn');
        if (!rerollBtn) return;

        try {
            // Disable the button and show loading state
            rerollBtn.disabled = true;
            rerollBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

            // Get the character ID
            const originalCard = container.querySelector('.character-select-card');
            const characterId = originalCard.dataset.characterId;
            if (!characterId) {
                throw new Error('No character ID found');
            }

            // Make the reroll request
            const response = await fetch('/reroll_character', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ character_id: characterId })
            });

            if (!response.ok) {
                throw new Error('Failed to reroll character');
            }

            const data = await response.json();
            if (!data.success) {
                throw new Error(data.error || 'Failed to reroll character');
            }

            // Create a temporary container to parse the new HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = data.character_html.trim();
            const newContainer = tempDiv.firstElementChild;

            if (!newContainer || !newContainer.classList.contains('character-container')) {
                throw new Error('Invalid character HTML received');
            }

            // Clear selection state before replacement
            this.clearSelection();

            // Replace the old container with the new one
            container.replaceWith(newContainer);

            // Update the containers array to include the new container
            const index = this.containers.indexOf(container);
            if (index !== -1) {
                this.containers[index] = newContainer;
            }

            // Add the same event handlers as in initialize
            const newCard = newContainer.querySelector('.character-select-card');
            const newInfoBox = newContainer.querySelector('.character-info-box');
            
            if (!newCard || !newInfoBox) {
                console.error("Missing required elements in new container:", {
                    hasCard: !!newCard,
                    hasInfoBox: !!newInfoBox,
                    containerHTML: newContainer.innerHTML
                });
                return;
            }

            // Handle card clicks (except buttons)
            newContainer.addEventListener('click', this.handleContainerClick);

            // Setup reroll button
            const newRerollBtn = newInfoBox.querySelector('.reroll-btn');
            if (newRerollBtn) {
                newRerollBtn.addEventListener('click', (e) => this.handleReroll(e, newContainer));
            }

            // Setup select button
            const newSelectBtn = newInfoBox.querySelector('.select-character-btn');
            if (newSelectBtn) {
                newSelectBtn.addEventListener('click', (e) => this.handleSelectButton(e, newContainer));
            }

            // Show success message
            UIUtils.showToast('Success', 'Character rerolled successfully');

        } catch (error) {
            console.error('Error rerolling character:', error);
            UIUtils.showToast('Error', error.message || 'Failed to reroll character');
            rerollBtn.disabled = false;
            rerollBtn.innerHTML = '<i class="fas fa-dice me-1"></i> Reroll Character';
        }
    }

    /**
     * Select a character from a container
     * @param {HTMLElement} container - The character container
     */
    selectCharacter(container) {
        const card = container.querySelector('.character-select-card');
        const characterId = card.dataset.characterId;

        // Deselect all other cards
        this.containers.forEach(otherContainer => {
            if (otherContainer !== container) {
                const otherCard = otherContainer.querySelector('.character-select-card');
                const otherIndicator = otherCard?.querySelector('.selection-indicator');
                if (otherCard) otherCard.classList.remove('selected');
                if (otherIndicator) otherIndicator.style.display = 'none';
            }
        });

        // Select the clicked card
        card.classList.add('selected');
        this.selectedCharacter = characterId;

        // Update selection indicator
        const selectionIndicator = card.querySelector('.selection-indicator');
        if (selectionIndicator) {
            selectionIndicator.style.display = 'block';
        }

        // Update hidden inputs
        this.updateHiddenInputs(characterId);

        // Emit selection event
        this.emitSelectionEvent(characterId);

        // Hide any error messages
        this.hideError();
    }

    /**
     * Update hidden inputs for form submission
     * @param {string} characterId - The selected character ID
     */
    updateHiddenInputs(characterId) {
        const hiddenInput = document.querySelector('input[name="selected_images"]');
        if (hiddenInput) {
            hiddenInput.value = characterId;
        }
    }

    /**
     * Emit selection event with character data
     * @param {string} characterId - The selected character ID
     */
    emitSelectionEvent(characterId) {
        const event = new CustomEvent('characterSelected', {
            detail: { characterId }
        });
        document.dispatchEvent(event);
    }

    /**
     * Hide any error messages
     */
    hideError() {
        const errorElement = document.querySelector('.error-message');
        if (errorElement) {
            errorElement.style.display = 'none';
        }
    }

    /**
     * Handle container click
     * @param {Event} event - The click event
     */
    handleContainerClick(event) {
        // Don't handle clicks on buttons or their children
        if (event.target.closest('button')) {
            return;
        }

        const container = event.target.closest('.character-container');
        if (container) {
            this.selectCharacter(container);
        }
    }

    /**
     * Handle select button click
     * @param {Event} event - The click event
     * @param {HTMLElement} container - The character container
     */
    handleSelectButton(event, container) {
        event.preventDefault();
        event.stopPropagation();
        this.selectCharacter(container);
    }

    /**
     * Get the currently selected character ID
     * @returns {string|null} The selected character ID or null if none selected
     */
    getSelectedCharacter() {
        return this.selectedCharacter;
    }

    /**
     * Clear the current selection
     */
    clearSelection() {
        this.selectedCharacter = null;
        this.containers.forEach(container => {
            const card = container.querySelector('.character-select-card');
            const indicator = card?.querySelector('.selection-indicator');
            if (card) card.classList.remove('selected');
            if (indicator) indicator.style.display = 'none';
        });
        // Clear the hidden input
        const hiddenInput = document.querySelector('input[name="selected_images"]');
        if (hiddenInput) {
            hiddenInput.value = '';
        }
    }

    /**
     * Show an error message
     * @param {string} message - The error message to show
     */
    showError(message) {
        const errorDiv = document.querySelector('.error-message');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        }
    }

    /**
     * Validate the current selection
     * @returns {boolean} Whether the selection is valid
     */
    validateSelection() {
        if (!this.selectedCharacter) {
            this.showError('Please select a character before proceeding');
            return false;
        }
        return true;
    }
}

// Export the CharacterSelector class
export default CharacterSelector; 