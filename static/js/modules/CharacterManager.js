/**
 * Character Management Module
 * Handles character selection, display, and highlighting in story text
 */
import UIUtils from './UIUtils.js';

// Character highlighting functionality (moved to initialize method)

/**
 * Character Manager Module
 * Handles character-related functionality
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
     * Highlight character names in story text
     */
    highlightCharactersInStory() {
        console.log('Highlighting characters in story');
        const storyContent = document.querySelector('.story-content');
        if (!storyContent) {
            console.log('No story content found');
            return;
        }

        // Get all character names from the mini-portraits
        const characterPortraits = document.querySelectorAll('.character-portrait-mini');
        if (!characterPortraits.length) {
            console.log('No character portraits found');
            return;
        }

        const characterNames = Array.from(characterPortraits).map(portrait => {
            const nameElement = portrait.querySelector('.character-mini-name');
            const imageElement = portrait.querySelector('img');

            if (!nameElement || !imageElement) return null;

            return {
                name: nameElement.textContent.trim(),
                image: imageElement.src,
                element: portrait
            };
        }).filter(char => char !== null);

        if (!characterNames.length) {
            console.log('No character names found');
            return;
        }

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
    },

    /**
     * Set up character selection
     */
    setupCharacterSelection() {
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

                // Clear all previous selections
                document.querySelectorAll('.character-select-card').forEach(card => {
                    card.classList.remove('selected');
                    const indicator = card.querySelector('.selection-indicator');
                    if (indicator) indicator.style.display = 'none';
                });

                document.querySelectorAll('.character-checkbox').forEach(cb => {
                    cb.checked = false;
                });

                // Select this character
                checkbox.checked = true;
                selectionIndicator.style.display = 'block';
                characterCard.classList.add('selected');

                // Update hidden input for selected image
                const selectedImagesInput = document.getElementById('selectedImagesInput');
                if (selectedImagesInput) {
                    selectedImagesInput.value = JSON.stringify([characterId]);
                }

                // Show toast notification if UIUtils is available
                if (typeof UIUtils !== 'undefined' && UIUtils.showToast) {
                    UIUtils.showToast('Character Selected', 'Character has been selected for your story.');
                }
            });
        });
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
     * Fetches a random character to replace existing one
     * @param {string|number} cardIndex - The index of the card to update
     * @param {HTMLElement} buttonElement - The button that was clicked
     * @returns {Promise<boolean>} - Whether the fetch was successful
     */
    fetchRandomCharacter(cardIndex, buttonElement) {
        return fetch('/api/random_character')
            .then(response => response.json())
            .then(data => {
                if (!data || !data.id) {
                    return false;
                }

                // Find the card container to update
                const cardContainer = buttonElement.closest('.character-container');
                if (!cardContainer) return false;

                // Update the character card content with new character data
                const characterCard = cardContainer.querySelector('.character-select-card');
                if (characterCard) {
                    characterCard.dataset.id = data.id;

                    // Update image
                    const imgElement = characterCard.querySelector('img');
                    if (imgElement && data.image_url) {
                        imgElement.src = data.image_url;
                    }

                    // Update name and description if present
                    const nameElement = characterCard.querySelector('.character-name');
                    if (nameElement && data.name) {
                        nameElement.textContent = data.name;
                    }

                    const descElement = characterCard.querySelector('.character-description');
                    if (descElement && data.description) {
                        descElement.textContent = data.description;
                    }

                    // Update select button's data-character-id
                    const selectButton = cardContainer.querySelector('.select-character-btn');
                    if (selectButton) {
                        selectButton.dataset.characterId = data.id;
                    }

                    // Update checkbox
                    const checkbox = cardContainer.querySelector('input[type="radio"]');
                    if (checkbox) {
                        checkbox.value = data.id;
                        checkbox.id = `character${data.id}`;
                    }
                }

                return true;
            })
            .catch(error => {
                console.error('Error fetching random character:', error);
                return false;
            });
    },

    /**
     * Fetches a random character from the server
     * @returns {Promise} - Promise resolving to character data
     */
    fetchRandomCharacterOld() {
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
    document.addEventListener('DOMContentLoaded', () => {
        if (CharacterManager && CharacterManager.initialize) {
            CharacterManager.initialize();
        }
    });
}