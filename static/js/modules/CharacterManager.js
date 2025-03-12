/**
 * Character Management Module
 * Handles character selection and display
 */
import UIUtils from './UIUtils.js';

export default {
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
    },

    /**
     * Fetches a random character from the server
     * @returns {Promise} - Promise resolving to character data
     */
    async fetchRandomCharacter() {
        try {
            const response = await fetch('/api/random_character', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch random character: ${response.status}`);
            }

            const data = await response.json();

            if (!data.success || !data.character) {
                throw new Error('Invalid response from server');
            }

            return data.character;
        } catch (error) {
            console.error('Error fetching random character:', error);
            // Return a more descriptive error to help with debugging
            throw new Error(`Failed to fetch random character: ${error.message}`);
        }
    },

    /**
     * Highlights character mentions in story text
     */
    highlightCharactersInStory() {
        const storyContent = document.querySelector('.story-content');
        if (!storyContent) return;

        // Get all character names from the mini-portraits
        const characterPortraits = document.querySelectorAll('.character-portrait-mini');
        const characterNames = Array.from(characterPortraits).map(portrait => {
            return {
                name: portrait.querySelector('.character-mini-name').textContent.trim(),
                image: portrait.querySelector('img').src,
                element: portrait
            };
        });

        // Sort names by length (longest first) to avoid partial matches
        characterNames.sort((a, b) => b.name.length - a.name.length);

        // Get the story text
        let storyText = storyContent.innerHTML;

        // Replace character names with highlighted spans
        characterNames.forEach(character => {
            const regex = new RegExp(`\\b${character.name}\\b`, 'gi');
            storyText = storyText.replace(regex, match => {
                return `<span class="character-mention" data-character="${character.name.toLowerCase().replace(/\s/g, '-')}">${match}<span class="character-tooltip"><img src="${character.image}" alt="${match}">${match}</span></span>`;
            });
        });

        // Update the story content
        storyContent.innerHTML = storyText;

        // Add click event to highlight corresponding mini-portrait
        document.querySelectorAll('.character-mention').forEach(mention => {
            mention.addEventListener('click', function() {
                const characterId = this.dataset.character;
                const targetPortrait = document.querySelector(`.character-portrait-mini[data-character-name="${characterId}"]`);

                // Remove highlight from all portraits
                document.querySelectorAll('.character-mini-img').forEach(img => {
                    img.classList.remove('character-mini-highlight');
                });

                // Add highlight to this portrait
                if (targetPortrait) {
                    const portraitImg = targetPortrait.querySelector('.character-mini-img');
                    portraitImg.classList.add('character-mini-highlight');

                    // Scroll to the portrait if needed
                    targetPortrait.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

                    // Remove highlight after 3 seconds
                    setTimeout(() => {
                        portraitImg.classList.remove('character-mini-highlight');
                    }, 3000);
                }
            });
        });
    }
};
/**
 * Character Manager Module
 * Handles character selection, fetching, and management
 */
const CharacterManager = {
    /**
     * Initialize character manager
     */
    initialize() {
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
     * Update selected images input
     */
    updateSelectedImagesInput() {
        const selectedCharacters = document.querySelectorAll('.character-checkbox:checked');
        const selectedImagesContainer = document.querySelector('.selected-characters-container');
        const hiddenInputsContainer = document.querySelector('#hiddenSelectedImages');

        if (hiddenInputsContainer) {
            // Clear previous hidden inputs
            hiddenInputsContainer.innerHTML = '';

            // Create hidden inputs for each selected character
            selectedCharacters.forEach(checkbox => {
                const hiddenInput = document.createElement('input');
                hiddenInput.type = 'hidden';
                hiddenInput.name = 'selected_images[]';
                hiddenInput.value = checkbox.value;
                hiddenInputsContainer.appendChild(hiddenInput);
            });
        }

        // Show/hide selected characters container based on selection
        if (selectedImagesContainer) {
            if (selectedCharacters.length > 0) {
                selectedImagesContainer.style.display = 'block';
            } else {
                selectedImagesContainer.style.display = 'none';
            }
        }
    },

    /**
     * Clear all character selections
     */
    clearAllSelections() {
        document.querySelectorAll('.character-checkbox').forEach(checkbox => {
            checkbox.checked = false;
        });

        document.querySelectorAll('.character-select-card').forEach(card => {
            card.classList.remove('selected');
        });

        document.querySelectorAll('.selection-indicator').forEach(indicator => {
            indicator.style.display = 'none';
        });
    },

    /**
     * Fetch a random character from the server
     */
    async fetchRandomCharacter() {
        try {
            const response = await fetch('/api/random_character', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch random character: ${response.status}`);
            }

            const data = await response.json();

            if (!data.success || !data.character) {
                throw new Error('Invalid response from server');
            }

            return data.character;
        } catch (error) {
            console.error('Error fetching random character:', error);
            // Return a more descriptive error to help with debugging
            throw new Error(`Failed to fetch random character: ${error.message}`);
        }
    }
};

// Initialize on page load if we're not in an ES module context
if (typeof window !== 'undefined') {
    window.CharacterManager = CharacterManager;
    document.addEventListener('DOMContentLoaded', () => CharacterManager.initialize());
}

// Export for ES module use
export default CharacterManager;