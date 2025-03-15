// Character Manager Module
console.log("Initializing CharacterManager module");

class CharacterManager {
    constructor() {
        this.selectedCharacters = [];
        this.maxCharacters = 2;
        this.initialized = false;
    }

    async initialize() {
        try {
            if (this.initialized) {
                console.log("CharacterManager already initialized");
                return;
            }

            console.log("Setting up CharacterManager");
            await Promise.all([
                this.setupCharacterCards(),
                this.highlightCharactersInStory()
            ]);

            this.initialized = true;
            console.log("CharacterManager initialization complete");
        } catch (error) {
            console.error("Error initializing CharacterManager:", error);
            throw error;
        }
    }

    async setupCharacterCards() {
        try {
            console.log("Setting up character cards");
            const characterCards = document.querySelectorAll('.character-card');
            
            if (characterCards.length === 0) {
                console.log("No character cards found");
                return;
            }

            characterCards.forEach(card => {
                // Remove existing listeners to prevent duplicates
                const newCard = card.cloneNode(true);
                card.parentNode.replaceChild(newCard, card);
                newCard.addEventListener('click', (e) => this.handleCharacterSelection(e, newCard));
            });

            console.log(`Set up ${characterCards.length} character cards`);
        } catch (error) {
            console.error("Error setting up character cards:", error);
            throw error;
        }
    }

    handleCharacterSelection(e, card) {
        try {
            // Don't process click if coming from a button inside the card
            if (e.target.closest('button')) return;

            const characterId = card.dataset.id;
            if (!characterId) {
                console.error("Character card missing data-id attribute");
                return;
            }

            const isSelected = card.classList.contains('selected');

            if (isSelected) {
                // Deselect character
                card.classList.remove('selected');
                this.selectedCharacters = this.selectedCharacters.filter(id => id !== characterId);
            } else {
                // Check if we already have max characters selected
                if (this.selectedCharacters.length >= this.maxCharacters) {
                    // Remove the oldest selection
                    const oldestId = this.selectedCharacters.shift();
                    const oldCard = document.querySelector(`.character-card[data-id="${oldestId}"]`);
                    if (oldCard) {
                        oldCard.classList.remove('selected');
                    }
                }

                // Select character
                card.classList.add('selected');
                this.selectedCharacters.push(characterId);
            }

            this.updateSelectedCharactersField();
        } catch (error) {
            console.error("Error handling character selection:", error);
        }
    }

    updateSelectedCharactersField() {
        try {
            const hiddenField = document.getElementById('selected_images');
            if (hiddenField) {
                hiddenField.value = this.selectedCharacters.join(',');
            }
        } catch (error) {
            console.error("Error updating selected characters field:", error);
        }
    }

    async rerollCharacter(characterId) {
        try {
            console.log(`Rerolling character ${characterId}`);

            const response = await fetch('/reroll_character', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({ character_id: characterId })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (!data.success) {
                throw new Error(data.error || 'Failed to reroll character');
            }

            const cardContainer = document.querySelector(`.character-card[data-id="${characterId}"]`)?.parentNode;
            if (!cardContainer) {
                throw new Error(`Character card container not found for ID: ${characterId}`);
            }

            cardContainer.innerHTML = data.character_html;

            // Re-bind click event for new card
            const newCard = cardContainer.querySelector('.character-card');
            if (newCard) {
                newCard.addEventListener('click', (e) => this.handleCharacterSelection(e, newCard));
            }

            // Rebind reroll button
            const rerollBtn = cardContainer.querySelector('.reroll-btn');
            if (rerollBtn) {
                rerollBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.rerollCharacter(rerollBtn.dataset.id);
                });
            }

            console.log(`Successfully rerolled character ${characterId}`);
        } catch (error) {
            console.error('Failed to reroll character:', error);
            throw error;
        }
    }

    highlightCharactersInStory() {
        try {
            console.log("Highlighting characters in story");
            const storyContent = document.querySelector('.story-content');
            if (!storyContent) {
                console.log("No story content found");
                return;
            }

            // Get character names from the character images
            const characterImages = document.querySelectorAll('.character-image');
            const characterNames = Array.from(characterImages)
                .map(img => {
                    const nameElement = img.nextElementSibling;
                    return nameElement ? nameElement.textContent.trim() : null;
                })
                .filter(Boolean);

            if (characterNames.length === 0) {
                console.log("No character names found to highlight");
                return;
            }

            // Create a regex to match any of the character names
            const namePattern = characterNames
                .map(name => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
                .join('|');
            const nameRegex = new RegExp(`\\b(${namePattern})\\b`, 'gi');

            // Replace text with highlighted version
            storyContent.innerHTML = storyContent.innerHTML.replace(nameRegex, match => {
                return `<span class="character-highlight">${match}</span>`;
            });

            console.log(`Highlighted ${characterNames.length} characters in story`);
        } catch (error) {
            console.error("Error highlighting characters in story:", error);
        }
    }
}

// Create a singleton instance
const characterManager = new CharacterManager();

// Export both the class and the singleton instance
export { CharacterManager, characterManager as default };

// For CommonJS modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = characterManager;
}

// For browser use
if (typeof window !== 'undefined') {
    if (!window.CharacterManager) {
        window.CharacterManager = CharacterManager;
    }
}