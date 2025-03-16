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
            document.querySelectorAll('.character-container').forEach(container => {
                const card = container.querySelector('.character-select-card');
                const infoBox = container.querySelector('.character-info-box');
                
                if (!card || !infoBox) {
                    console.error("Missing required elements in character container");
                    return;
                }

                // Handle card clicks (except buttons)
                card.addEventListener('click', (e) => {
                    if (!e.target.closest('button')) {
                        this.handleCharacterSelection(container);
                    }
                });

                // Setup select button
                const selectBtn = infoBox.querySelector('.select-character-btn');
                if (selectBtn) {
                    selectBtn.addEventListener('click', () => this.handleCharacterSelection(container));
                }

                // Setup reroll button
                const rerollBtn = infoBox.querySelector('.reroll-btn');
                if (rerollBtn) {
                    rerollBtn.addEventListener('click', (e) => this.handleCharacterReroll(e, container));
                }
            });

            console.log("Character interactions setup complete");
        } catch (error) {
            console.error("Error setting up character interactions:", error);
            throw error;
        }
    }

    handleCharacterSelection(container) {
        const card = container.querySelector('.character-select-card');
        const checkbox = container.querySelector('.character-checkbox');
        const characterId = card.dataset.id;
        
        if (!checkbox) {
            console.error("No checkbox found for character card");
            return;
        }

        // Deselect all other cards and hide their selection indicators
        document.querySelectorAll('.character-container').forEach(otherContainer => {
            if (otherContainer !== container) {
                const otherCard = otherContainer.querySelector('.character-select-card');
                const otherCheckbox = otherContainer.querySelector('.character-checkbox');
                const otherIndicator = otherCard?.querySelector('.selection-indicator');
                if (otherCard) otherCard.classList.remove('selected');
                if (otherCheckbox) otherCheckbox.checked = false;
                if (otherIndicator) otherIndicator.style.display = 'none';
            }
        });

        // Always select the clicked card
        card.classList.add('selected');
        checkbox.checked = true;

        // Update selected characters array
        this.selectedCharacters = [characterId];
        
        // Update all selected_images inputs (there might be multiple in choice forms)
        document.querySelectorAll('input[name="selected_images"]').forEach(input => {
            input.value = characterId;
        });

        // Show visual feedback
        const selectionIndicator = card.querySelector('.selection-indicator');
        if (selectionIndicator) {
            selectionIndicator.style.display = 'block';
        }
        
        // Show/hide error message
        const errorElement = document.querySelector('#characterSelectionError');
        if (errorElement) {
            errorElement.style.display = 'none';
        }

        console.log('Character selected:', {
            characterId,
            selectedCharacters: this.selectedCharacters,
            formValue: document.querySelector('input[name="selected_images"]')?.value
        });
    }

    async handleCharacterReroll(e, container) {
        e.preventDefault();
        e.stopPropagation();

        const rerollBtn = e.target.closest('.reroll-btn');
        if (!rerollBtn) return;

        try {
            // Disable the button and show loading state
            rerollBtn.disabled = true;
            rerollBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

            // Get the character ID
            const originalCard = container.querySelector('.character-select-card');
            const characterId = originalCard.dataset.id;
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

            // Create a temporary container to parse the new HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = data.character_html.trim();
            const newContainer = tempDiv.firstElementChild;

            if (!newContainer || !newContainer.classList.contains('character-container')) {
                throw new Error('Invalid character HTML received');
            }

            // Replace the old container with the new one
            container.replaceWith(newContainer);

            // Add the same event handlers as in setupCharacterInteractions
            const newCard = newContainer.querySelector('.character-select-card');
            const newInfoBox = newContainer.querySelector('.character-info-box');
            
            if (!newCard || !newInfoBox) {
                console.error("Missing required elements in new container:", {
                    hasCard: !!newCard,
                    hasInfoBox: !!newInfoBox,
                    containerHTML: newContainer.innerHTML
                });
                return;
            }

            // Handle card clicks (except buttons)
            newCard.addEventListener('click', (e) => {
                if (!e.target.closest('button')) {
                    this.handleCharacterSelection(newContainer);
                }
            });

            // Setup select button
            const newSelectBtn = newInfoBox.querySelector('.select-character-btn');
            if (newSelectBtn) {
                newSelectBtn.addEventListener('click', () => this.handleCharacterSelection(newContainer));
            }

            // Setup reroll button
            const newRerollBtn = newInfoBox.querySelector('.reroll-btn');
            if (newRerollBtn) {
                newRerollBtn.addEventListener('click', (e) => this.handleCharacterReroll(e, newContainer));
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

// Make CharacterManager available globally for debugging
if (typeof window !== 'undefined') {
    window.CharacterManager = CharacterManager;
}