// Character Manager Module
console.log("Initializing CharacterManager module");

class CharacterManager {
    constructor() {
        this.selectedCharacters = [];
        this.maxCharacters = 1; // Changed to 1 for single selection
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
            const characterCards = document.querySelectorAll('.character-select-card');
            
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
            const checkbox = document.getElementById(`character${characterId}`);
            const selectionIndicator = card.querySelector('.selection-indicator');

            if (!checkbox || !selectionIndicator) {
                console.error("Required elements not found for character:", characterId);
                return;
            }

            // Clear all selections first (for single select)
            document.querySelectorAll('.character-select-card').forEach(otherCard => {
                otherCard.classList.remove('selected');
                const indicator = otherCard.querySelector('.selection-indicator');
                if (indicator) {
                    indicator.style.display = 'none';
                }
                const otherCheckbox = document.getElementById(`character${otherCard.dataset.id}`);
                if (otherCheckbox) {
                    otherCheckbox.checked = false;
                }
            });

            if (!isSelected) {
                // Select this character
                card.classList.add('selected');
                selectionIndicator.style.display = 'block';
                checkbox.checked = true;
                this.selectedCharacters = [characterId];

                if (window.showToast) {
                    window.showToast('Character Selected', 'Character has been selected for your story.');
                }
            }

            this.updateSelectedCharactersField();
        } catch (error) {
            console.error("Error handling character selection:", error);
        }
    }

    updateSelectedCharactersField() {
        try {
            const hiddenField = document.querySelector('input[name="selected_images"]');
            if (hiddenField) {
                hiddenField.value = JSON.stringify(this.selectedCharacters);
            }
        } catch (error) {
            console.error("Error updating selected characters field:", error);
        }
    }

    async rerollCharacter(characterId) {
        try {
            console.log(`Rerolling character ${characterId}`);

            const response = await fetch('/api/reroll_character', {
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

            const cardContainer = document.querySelector(`.character-select-card[data-id="${characterId}"]`)?.parentNode;
            if (!cardContainer) {
                throw new Error(`Character card container not found for ID: ${characterId}`);
            }

            // Update the card with new character data
            const card = cardContainer.querySelector('.character-select-card');
            if (card) {
                // Update image
                const cardImg = card.querySelector('img');
                if (cardImg) {
                    cardImg.src = data.image_url;
                }

                // Update character ID
                card.dataset.id = data.id;

                // Update character name
                const nameElement = card.querySelector('.character-name');
                if (nameElement) {
                    nameElement.textContent = data.name;
                }

                // Update traits
                const traitsContainer = card.querySelector('.character-traits-list');
                if (traitsContainer) {
                    traitsContainer.innerHTML = '';
                    if (data.character_traits && data.character_traits.length > 0) {
                        data.character_traits.forEach(trait => {
                            const traitBadge = document.createElement('span');
                            traitBadge.className = 'trait-badge';
                            traitBadge.textContent = trait;
                            traitsContainer.appendChild(traitBadge);
                        });
                    }
                }

                // Update checkbox
                const checkbox = card.querySelector('.character-checkbox');
                if (checkbox) {
                    checkbox.value = data.id;
                    checkbox.id = `character${data.id}`;
                }

                // Update select button
                const selectBtn = card.querySelector('.select-character-btn');
                if (selectBtn) {
                    selectBtn.dataset.characterId = data.id;
                }
            }

            if (window.showToast) {
                window.showToast('Character Updated', 'A new character has been loaded!');
            }

            console.log(`Successfully rerolled character ${characterId}`);
        } catch (error) {
            console.error('Failed to reroll character:', error);
            if (window.showToast) {
                window.showToast('Error', 'Failed to reroll character. Please try again.');
            }
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
            const characterImages = document.querySelectorAll('.character-portrait-mini');
            const characterNames = Array.from(characterImages)
                .map(img => {
                    const nameElement = img.querySelector('.character-mini-name');
                    return nameElement ? {
                        name: nameElement.textContent.trim(),
                        image: img.querySelector('img').src,
                        id: img.dataset.characterName
                    } : null;
                })
                .filter(Boolean);

            if (characterNames.length === 0) {
                console.log("No character names found to highlight");
                return;
            }

            // Sort names by length (longest first) to avoid partial matches
            characterNames.sort((a, b) => b.name.length - a.name.length);

            // Create a regex to match any of the character names
            const namePattern = characterNames
                .map(char => char.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
                .join('|');
            const nameRegex = new RegExp(`\\b(${namePattern})\\b`, 'gi');

            // Replace text with highlighted version
            storyContent.innerHTML = storyContent.innerHTML.replace(nameRegex, (match) => {
                const character = characterNames.find(char => char.name.toLowerCase() === match.toLowerCase());
                if (character) {
                    return `<span class="character-mention" data-character="${character.id}">${match}<span class="character-tooltip"><img src="${character.image}" alt="${match}">${match}</span></span>`;
                }
                return match;
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