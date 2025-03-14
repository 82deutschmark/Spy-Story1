/**
 * Character Management Module
 * Handles character selection, display, and highlighting in story text
 */
import UIUtils from './UIUtils.js';

// Character highlighting functionality
document.addEventListener('DOMContentLoaded', function() {
    // This will be called after the DOM is fully loaded
    if (typeof CharacterManager !== 'undefined' && CharacterManager) {
        // Only initialize if CharacterManager exists
        CharacterManager.highlightCharactersInStory();
    }
});

/**
 * Character Management Module
 * Handles character selection, display, and highlighting in story text
 */

const CharacterManager = {
    /**
     * Highlights character names in the story text
     */
    highlightCharactersInStory() {
        const storyContent = document.querySelector('.story-content');
        if (!storyContent) return;

        // Get all character thumbnails/portraits
        const characterElements = document.querySelectorAll('.character-portrait-mini, .character-thumbnail');

        // For each character
        characterElements.forEach(charElement => {
            const characterName = charElement.getAttribute('data-character-name');
            if (!characterName) return;

            // Create a friendly name for display (convert from slug to display format)
            const displayName = characterName.split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');

            // Create a regex that matches the character name with word boundaries
            // This ensures we only match whole words, not partial matches
            const nameRegex = new RegExp(`\\b${displayName}\\b`, 'g');

            // Replace character name with highlighted version
            storyContent.innerHTML = storyContent.innerHTML.replace(
                nameRegex, 
                `<span class="character-highlight" data-character="${characterName}">${displayName}</span>`
            );
        });

        // Add click event listeners to highlighted characters
        const highlightedChars = document.querySelectorAll('.character-highlight');
        highlightedChars.forEach(highlighted => {
            highlighted.addEventListener('click', function() {
                const charName = this.getAttribute('data-character');
                const charElement = document.querySelector(`.character-portrait-mini[data-character-name="${charName}"], .character-thumbnail[data-character-name="${charName}"]`);

                if (charElement) {
                    // Scroll the character into view
                    charElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

                    // Add a brief highlight effect
                    charElement.classList.add('character-highlight-pulse');
                    setTimeout(() => {
                        charElement.classList.remove('character-highlight-pulse');
                    }, 1500);
                }
            });
        });
    },

    /**
     * Initialize the character interactions
     */
    init() {
        console.log('Character manager initialized');
        this.setupCharacterSelection();
    },

    /**
     * Set up character selection
     */
    setupCharacterSelection() {
        // Character selection functionality already handled in EventHandlers.js
    },

    /**
     * Clears all character selections
     */
    clearAllSelections() {
        const characterCards = document.querySelectorAll('.character-select-card');
        const characterCheckboxes = document.querySelectorAll('.character-checkbox');

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
    },

    /**
     * Updates the hidden input values for selected images
     */
    updateSelectedImagesInput() {
        const storyForm = document.getElementById('storyForm');
        if (!storyForm) return;

        // Remove any existing hidden inputs
        document.querySelectorAll('input[name="selected_images[]"]').forEach(el => el.remove());

        // Add new hidden inputs for each selected character
        document.querySelectorAll('.character-checkbox:checked').forEach(checkbox => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = 'selected_images[]';
            input.value = checkbox.value;
            storyForm.appendChild(input);
        });

        // Show/hide selected characters container based on selection
        const selectedImagesContainer = document.querySelector('.selected-characters-container');
        if (selectedImagesContainer) {
            if (document.querySelectorAll('.character-checkbox:checked').length > 0) {
                selectedImagesContainer.style.display = 'block';
            } else {
                selectedImagesContainer.style.display = 'none';
            }
        }
    },

    /**
     * Fetches a random character from the server
     * @returns {Promise} - Promise resolving to character data
     */
    fetchRandomCharacter() {
        return fetch('/api/random_character')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to fetch random character: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (!data.success) {
                    throw new Error('Invalid response from server');
                }
                // The API is returning the character data directly at the top level
                return data;
            });
    }
};

// Export for ES module use
export default CharacterManager;

// Initialize on page load if we're not in an ES module context
if (typeof window !== 'undefined') {
    window.CharacterManager = CharacterManager;
    document.addEventListener('DOMContentLoaded', () => CharacterManager.initialize());
}