// Character Manager Module
console.log("Initializing CharacterManager module");

class CharacterManager {
    constructor() {
        this.selectedCharacters = [];
        this.maxCharacters = 1; // Single selection mode
        this.initialized = false;
    }

    async initialize() {
        try {
            if (this.initialized) {
                console.log("CharacterManager already initialized");
                return;
            }

            console.log("Setting up CharacterManager");
            
            // Setup character cards and buttons
            await this.setupCharacterInteractions();
            
            // Initialize character highlighting if on story page
            if (document.querySelector('.story-content')) {
                await this.highlightCharactersInStory();
            }

            this.initialized = true;
            console.log("CharacterManager initialization complete");
        } catch (error) {
            console.error("Error initializing CharacterManager:", error);
            throw error;
        }
    }

    async setupCharacterInteractions() {
        try {
            console.log("Setting up character interactions");

            // Setup character cards
            document.querySelectorAll('.character-select-card').forEach(card => {
                // Handle card clicks (except buttons)
                card.addEventListener('click', (e) => {
                    if (!e.target.closest('button')) {
                        this.handleCharacterSelection(card);
                    }
                });

                // Setup select button
                const selectBtn = card.querySelector('.select-character-btn');
                if (selectBtn) {
                    selectBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        this.handleCharacterSelection(card);
                    });
                }

                // Setup reroll button
                const rerollBtn = card.querySelector('.reroll-btn');
                if (rerollBtn) {
                    rerollBtn.addEventListener('click', async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        await this.handleCharacterReroll(card, rerollBtn);
                    });
                }
            });

            console.log("Character interactions setup complete");
        } catch (error) {
            console.error("Error setting up character interactions:", error);
            throw error;
        }
    }

    handleCharacterSelection(card) {
        try {
            const characterId = card.dataset.id;
            if (!characterId) {
                console.error("Character card missing data-id attribute");
                return;
            }

            const checkbox = document.getElementById(`character${characterId}`);
            const selectionIndicator = card.querySelector('.selection-indicator');

            if (!checkbox || !selectionIndicator) {
                console.error("Required elements not found for character:", characterId);
                return;
            }

            // Clear all selections first (single select mode)
            this.clearAllSelections();

            // Select this character
            card.classList.add('selected');
            selectionIndicator.style.display = 'block';
            checkbox.checked = true;
            this.selectedCharacters = [characterId];

            // Update hidden input
            this.updateSelectedCharactersField();

            // Show toast notification
            if (window.showToast) {
                window.showToast('Character Selected', 'Character has been selected for your story.');
            }
        } catch (error) {
            console.error("Error handling character selection:", error);
            if (window.showToast) {
                window.showToast('Error', 'Failed to select character. Please try again.');
            }
        }
    }

    clearAllSelections() {
        document.querySelectorAll('.character-select-card').forEach(card => {
            card.classList.remove('selected');
            const indicator = card.querySelector('.selection-indicator');
            if (indicator) {
                indicator.style.display = 'none';
            }
            const checkbox = document.getElementById(`character${card.dataset.id}`);
            if (checkbox) {
                checkbox.checked = false;
            }
        });
        this.selectedCharacters = [];
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

    async handleCharacterReroll(card, button) {
        const characterId = card.dataset.id;
        if (!characterId) {
            console.error("Character ID not found");
            return;
        }

        // Show loading state
        const originalButtonText = button.innerHTML;
        button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Rerolling...';
        button.disabled = true;

        try {
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

            // Update card with new character data
            await this.updateCharacterCard(card, data.character);

            if (window.showToast) {
                window.showToast('Character Updated', 'A new character has been loaded!');
            }
        } catch (error) {
            console.error('Failed to reroll character:', error);
            if (window.showToast) {
                window.showToast('Error', 'Failed to reroll character. Please try again.');
            }
        } finally {
            button.innerHTML = originalButtonText;
            button.disabled = false;
        }
    }

    async updateCharacterCard(card, characterData) {
        try {
            // Update image
            const cardImg = card.querySelector('img');
            if (cardImg) {
                cardImg.src = characterData.image_url;
            }

            // Update character ID
            card.dataset.id = characterData.id;

            // Update character name
            const nameElement = card.querySelector('.character-name');
            if (nameElement) {
                nameElement.textContent = characterData.name;
            }

            // Update traits
            const traitsContainer = card.querySelector('.character-traits-list');
            if (traitsContainer) {
                traitsContainer.innerHTML = '';
                if (characterData.character_traits?.length > 0) {
                    characterData.character_traits.forEach(trait => {
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
                checkbox.value = characterData.id;
                checkbox.id = `character${characterData.id}`;
            }

            // Update select button
            const selectBtn = card.querySelector('.select-character-btn');
            if (selectBtn) {
                selectBtn.dataset.characterId = characterData.id;
            }

            // If this character was selected, update the selection state
            if (this.selectedCharacters.includes(characterData.id.toString())) {
                this.handleCharacterSelection(card);
            }
        } catch (error) {
            console.error("Error updating character card:", error);
            throw error;
        }
    }

    async highlightCharactersInStory() {
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