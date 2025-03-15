
/**
 * Character Management Module
 * Handles character selection, display, and highlighting in story text
 */
import UIUtils from './UIUtils.js';

// Character management functionality
const CharacterManager = {
    /**
     * Highlights character names in the story text
     */
    highlightCharactersInStory() {
        console.log('Highlighting characters in story');
        const storyContentElement = document.querySelector('.story-content');
        if (!storyContentElement) {
            console.log('No story content found');
            return;
        }

        // Get all character mini portraits to extract names
        const characterElements = document.querySelectorAll('.character-portrait-mini, .character-thumbnail');
        const characterNames = [];

        characterElements.forEach(element => {
            const name = element.getAttribute('data-character-name');
            if (name) {
                characterNames.push({
                    name: name.replace(/-/g, ' '),
                    elementName: name
                });
            }
        });

        if (characterNames.length === 0) {
            console.log('No character names found');
            return;
        }

        // Sort by length (descending) to ensure longer names are processed first
        // This prevents issues where "John Smith" might be split into "John" and "Smith"
        characterNames.sort((a, b) => b.name.length - a.name.length);

        let storyHTML = storyContentElement.innerHTML;
        
        // Replace character names with highlighted versions
        characterNames.forEach(character => {
            const regex = new RegExp(`\\b${character.name}\\b`, 'gi');
            storyHTML = storyHTML.replace(regex, match => {
                return `<span class="character-highlight" data-character="${character.elementName}">${match}</span>`;
            });
        });

        storyContentElement.innerHTML = storyHTML;

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
    initialize() {
        console.log('Character manager initialized');
        this.setupCharacterSelection();
    },

    /**
     * Set up character selection
     */
    setupCharacterSelection() {
        // Character selection functionality
        const characterCards = document.querySelectorAll('.character-select-card');
        characterCards.forEach(card => {
            card.addEventListener('click', function() {
                const characterId = this.getAttribute('data-id');
                const checkbox = document.querySelector(`#character${characterId}`);
                
                if (checkbox) {
                    checkbox.checked = !checkbox.checked;
                    this.classList.toggle('selected', checkbox.checked);
                    const indicator = this.querySelector('.selection-indicator');
                    if (indicator) {
                        indicator.style.display = checkbox.checked ? 'block' : 'none';
                    }
                    
                    // Update the list of selected characters
                    CharacterManager.updateSelectedCharactersList();
                }
            });
        });

        // Handle selection buttons
        const selectButtons = document.querySelectorAll('.select-character-btn');
        selectButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.stopPropagation(); // Prevent card click event from firing
                const characterId = this.getAttribute('data-character-id');
                const checkbox = document.querySelector(`#character${characterId}`);
                const card = document.querySelector(`.character-select-card[data-id="${characterId}"]`);
                
                if (checkbox && card) {
                    checkbox.checked = !checkbox.checked;
                    card.classList.toggle('selected', checkbox.checked);
                    const indicator = card.querySelector('.selection-indicator');
                    if (indicator) {
                        indicator.style.display = checkbox.checked ? 'block' : 'none';
                    }
                    
                    // Update the list of selected characters
                    CharacterManager.updateSelectedCharactersList();
                }
            });
        });
    },

    /**
     * Updates the display of selected characters
     */
    updateSelectedCharactersList() {
        const selectedCharactersList = document.querySelector('.selected-characters-list');
        if (!selectedCharactersList) return;
        
        selectedCharactersList.innerHTML = '';
        
        const selectedCheckboxes = document.querySelectorAll('.character-checkbox:checked');
        selectedCheckboxes.forEach(checkbox => {
            const characterId = checkbox.value;
            const card = document.querySelector(`.character-select-card[data-id="${characterId}"]`);
            if (card) {
                const imgSrc = card.querySelector('img').src;
                const characterName = card.closest('.character-container').querySelector('.character-name').textContent;
                
                const pill = document.createElement('div');
                pill.className = 'selected-character-pill';
                pill.innerHTML = `
                    <img src="${imgSrc}" alt="${characterName}">
                    <span>${characterName}</span>
                    <button type="button" class="btn-close btn-close-white ms-2" data-character-id="${characterId}"></button>
                `;
                selectedCharactersList.appendChild(pill);
                
                // Add remove functionality
                pill.querySelector('.btn-close').addEventListener('click', function() {
                    const characterId = this.getAttribute('data-character-id');
                    const checkbox = document.querySelector(`#character${characterId}`);
                    const card = document.querySelector(`.character-select-card[data-id="${characterId}"]`);
                    
                    if (checkbox && card) {
                        checkbox.checked = false;
                        card.classList.remove('selected');
                        const indicator = card.querySelector('.selection-indicator');
                        if (indicator) {
                            indicator.style.display = 'none';
                        }
                        
                        CharacterManager.updateSelectedCharactersList();
                    }
                });
            }
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

// Add init method for backwards compatibility
CharacterManager.init = function() {
    console.log('Character manager init called (compatibility method)');
    return this.initialize();
};

// Export for ES module use
export default CharacterManager;

// Make available globally for non-ES module contexts
if (typeof window !== 'undefined') {
    window.CharacterManager = CharacterManager;
}

// Initialize character highlighting when DOM is loaded if we're on the storyboard page
document.addEventListener('DOMContentLoaded', function() {
    if (document.querySelector('.story-content')) {
        CharacterManager.highlightCharactersInStory();
    }
});
