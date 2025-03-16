// Character Manager Module
console.log("Initializing CharacterManager module");

export class CharacterManager {
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
                    selectBtn.addEventListener('click', () => this.handleCharacterSelection(card));
                }

                // Setup reroll button
                const rerollBtn = card.querySelector('.reroll-btn');
                if (rerollBtn) {
                    rerollBtn.addEventListener('click', (e) => this.handleCharacterReroll(e, card));
                }
            });

            console.log("Character interactions setup complete");
        } catch (error) {
            console.error("Error setting up character interactions:", error);
            throw error;
        }
    }

    handleCharacterSelection(card) {
        const characterId = card.dataset.id;
        const checkbox = card.querySelector('.character-checkbox');
        
        if (!checkbox) {
            console.error("No checkbox found for character card");
            return;
        }

        // Deselect all other cards
        document.querySelectorAll('.character-select-card').forEach(otherCard => {
            if (otherCard !== card) {
                otherCard.classList.remove('selected');
                const otherCheckbox = otherCard.querySelector('.character-checkbox');
                if (otherCheckbox) {
                    otherCheckbox.checked = false;
                }
            }
        });

        // Toggle selection of clicked card
        card.classList.toggle('selected');
        checkbox.checked = card.classList.contains('selected');

        // Update selected characters array
        this.selectedCharacters = checkbox.checked ? [characterId] : [];
        
        // Show/hide error message
        const errorElement = document.querySelector('#characterSelectionError');
        if (errorElement) {
            errorElement.style.display = 'none';
        }
    }

    async handleCharacterReroll(e, card) {
        e.preventDefault();
        e.stopPropagation();

        const rerollBtn = e.target.closest('.reroll-btn');
        if (!rerollBtn) return;

        try {
            // Disable the button and show loading state
            rerollBtn.disabled = true;
            rerollBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

            // Get the character ID
            const characterId = card.dataset.id;
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

            // Replace the card content
            const container = card.closest('.character-container');
            if (container) {
                container.outerHTML = data.character_html;
                
                // Re-initialize the new card's interactions
                const newCard = document.querySelector(`.character-select-card[data-id="${data.character.id}"]`);
                if (newCard) {
                    // Handle card clicks (except buttons)
                    newCard.addEventListener('click', (e) => {
                        if (!e.target.closest('button')) {
                            this.handleCharacterSelection(newCard);
                        }
                    });

                    // Setup select button
                    const selectBtn = newCard.querySelector('.select-character-btn');
                    if (selectBtn) {
                        selectBtn.addEventListener('click', () => this.handleCharacterSelection(newCard));
                    }

                    // Setup reroll button
                    const newRerollBtn = newCard.querySelector('.reroll-btn');
                    if (newRerollBtn) {
                        newRerollBtn.addEventListener('click', (e) => this.handleCharacterReroll(e, newCard));
                    }
                }
            }

            // Show success message
            window.showToast('Success', 'Character rerolled successfully');

        } catch (error) {
            console.error('Error rerolling character:', error);
            window.showToast('Error', 'Failed to reroll character. Please try again.');
            
            // Reset button state
            rerollBtn.disabled = false;
            rerollBtn.innerHTML = '<i class="fas fa-dice"></i> Reroll';
        }
    }
}

// Export a singleton instance
export default new CharacterManager();

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