/**
 * Character Management Module
 * Handles character selection, display, and highlighting in story text
 */
import UIUtils from './UIUtils.js';

/**
 * Character Manager
 * Handles character selection, display and interaction
 */
const CharacterManager = {
    /**
     * Initialize character manager
     */
    initialize() {
        console.log('Character manager initialized');
        this.setupCharacterSelection();
        this.highlightCharactersInStory();
    },

    /**
     * Setup character selection functionality
     */
    setupCharacterSelection() {
        // This can remain empty as EventHandlers handles the actual event binding
        // We keep this method for API consistency
    },

    /**
     * Highlight character mentions in story text
     */
    highlightCharactersInStory() {
        console.log('Highlighting characters in story');
        const storyContent = document.querySelector('.story-content');
        if (!storyContent) {
            console.log('No story content found');
            return;
        }

        // Get all character names from character cards
        const characterNames = Array.from(document.querySelectorAll('.character-name'))
            .map(el => el.textContent.trim())
            .filter(name => name.length > 0);

        if (!characterNames.length) return;

        // Replace character names with highlighted versions
        let contentHtml = storyContent.innerHTML;
        characterNames.forEach(name => {
            const regex = new RegExp(`\\b${name}\\b`, 'gi');
            contentHtml = contentHtml.replace(regex, match => {
                return `<span class="character-highlight">${match}</span>`;
            });
        });

        storyContent.innerHTML = contentHtml;
    },

    /**
     * Update the hidden input with selected character IDs
     */
    updateSelectedImagesInput() {
        const selectedCheckboxes = document.querySelectorAll('.character-checkbox:checked');
        const selectedIds = Array.from(selectedCheckboxes).map(checkbox => checkbox.value);

        const selectedImagesInput = document.querySelector('input[name="selected_images"]');
        if (selectedImagesInput) {
            selectedImagesInput.value = JSON.stringify(selectedIds);
        }

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

    // Auto-initialize on DOM loaded if not being imported as a module
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => CharacterManager.initialize());
    } else {
        CharacterManager.initialize();
    }
}