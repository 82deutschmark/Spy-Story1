
// CharacterManager.js - Handles character tracking and relationships
class CharacterManager {
    constructor() {
        // Initialize character tracking system
        console.log('CharacterManager initialized');
        
        // Store encountered characters
        this.encounteredCharacters = {};
    }

    // Record a character encounter
    recordCharacterEncounter(characterId, characterName, initialRelationship = 0) {
        return new Promise((resolve, reject) => {
            fetch('/api/character/encounter', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    character_id: characterId,
                    character_name: characterName,
                    initial_relationship: initialRelationship
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Update local cache
                    this.encounteredCharacters = data.encountered_characters || {};
                    console.log(`Character encounter recorded: ${characterName} (${characterId})`);
                    
                    // Dispatch event for other modules
                    document.dispatchEvent(new CustomEvent('character-encountered', {
                        detail: { 
                            characterId,
                            characterName,
                            encounteredCharacters: this.encounteredCharacters
                        }
                    }));
                    
                    resolve(data);
                } else {
                    console.error('Failed to record character encounter:', data.error);
                    reject(data.error);
                }
            })
            .catch(error => {
                console.error('Error recording character encounter:', error);
                reject(error);
            });
        });
    }

    // Change relationship with a character
    changeCharacterRelationship(characterId, changeAmount, reason) {
        return new Promise((resolve, reject) => {
            fetch('/api/character/relationship', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    character_id: characterId,
                    change_amount: changeAmount,
                    reason: reason
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Update local cache
                    this.encounteredCharacters = data.encountered_characters || {};
                    console.log(`Character relationship updated: ${characterId}, change: ${changeAmount}`);
                    
                    // Dispatch event for other modules
                    document.dispatchEvent(new CustomEvent('relationship-changed', {
                        detail: { 
                            characterId,
                            changeAmount,
                            reason,
                            encounteredCharacters: this.encounteredCharacters
                        }
                    }));
                    
                    resolve(data);
                } else {
                    console.error('Failed to update character relationship:', data.error);
                    reject(data.error);
                }
            })
            .catch(error => {
                console.error('Error updating character relationship:', error);
                reject(error);
            });
        });
    }

    // Get encountered characters
    getEncounteredCharacters() {
        return new Promise((resolve, reject) => {
            fetch('/api/character/encountered')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    this.encounteredCharacters = data.encountered_characters || {};
                    resolve(this.encounteredCharacters);
                } else {
                    console.error('Failed to get encountered characters:', data.error);
                    reject(data.error);
                }
            })
            .catch(error => {
                console.error('Error getting encountered characters:', error);
                reject(error);
            });
        });
    }
}

// Create and export singleton instance
export default new CharacterManager();


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
    fetchRandomCharacter() {
        return fetch('/api/random_character')
            .then(response => response.json())
            .then(data => {
                if (!data.success) {
                    throw new Error(data.error || 'Failed to load character');
                }
                return data;
            });
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
