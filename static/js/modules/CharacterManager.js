/**
 * CharacterManager.js - Manages character selection, rerolling, and interactions
 */
class CharacterManager {
    constructor() {
        console.log('CharacterManager initialized');

        // Store encountered characters
        this.encounteredCharacters = {};

        // Track selected characters
        this.selectedCharacters = [];
        this.initializeEventListeners();
    }

    // Initialize event listeners for character selection
    initializeEventListeners() {
        // Check if DOM is already loaded
        if (document.readyState === 'loading') {
            // Add listeners when DOM is loaded
            document.addEventListener('DOMContentLoaded', () => {
                this.setupCharacterSelectListeners();
                this.setupRerollButtonListeners();
            });
        } else {
            // DOM is already loaded, setup listeners immediately
            this.setupCharacterSelectListeners();
            this.setupRerollButtonListeners();
        }
    }

    // Setup listeners for character selection cards
    setupCharacterSelectListeners() {
        const characterCards = document.querySelectorAll('.character-select-card');
        const selectButtons = document.querySelectorAll('.select-character-btn');

        console.log(`Found ${characterCards.length} character cards and ${selectButtons.length} select buttons`);

        // Add listeners to character cards
        characterCards.forEach(card => {
            card.addEventListener('click', (e) => {
                const characterId = card.dataset.id;
                console.log(`Character card clicked: ${characterId}`);
                this.toggleCharacterSelection(characterId, card);
            });
        });

        // Add listeners to select buttons
        selectButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent card click event
                const characterId = button.dataset.characterId;
                console.log(`Select button clicked for character: ${characterId}`);
                const card = document.querySelector(`.character-select-card[data-id="${characterId}"]`);
                this.toggleCharacterSelection(characterId, card);
            });
        });
    }

    // Setup listeners for reroll buttons
    setupRerollButtonListeners() {
        const rerollButtons = document.querySelectorAll('.reroll-btn');

        rerollButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                // Get cost from currency manager
                const rerollCost = {'💵': 1000};

                // Check if user can afford it
                if (window.currencyManager && !window.currencyManager.canAfford(rerollCost)) {
                    window.UIUtils.showToast(
                        'Insufficient Funds', 
                        'You need $1000 to reroll a character.',
                        true
                    );
                    return;
                }

                const cardContainer = button.closest('.character-container');
                if (!cardContainer) return;

                const characterCard = cardContainer.querySelector('.character-select-card');
                if (!characterCard) return;

                // Show loading state
                button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Rerolling...';

                // Fetch new character
                this.fetchRandomCharacter()
                    .then(data => {
                        // Spend currency first
                        if (window.currencyManager) {
                            window.currencyManager.spendCurrency(
                                rerollCost, 
                                'Reroll character'
                            );
                        }

                        this.updateCharacterCard(characterCard, cardContainer, data);
                        // Reset button
                        button.innerHTML = '<i class="fas fa-dice me-1"></i> Reroll Character';

                        // Show toast notification
                        if (window.UIUtils) {
                            window.UIUtils.showToast('Character Updated', 'A new character has been loaded!');
                        }
                    })
                    .catch(error => {
                        console.error('Error rerolling character:', error);
                        button.innerHTML = '<i class="fas fa-dice me-1"></i> Reroll Character';
                        // Show error toast
                        if (window.UIUtils) {
                            window.UIUtils.showToast('Error', 'Failed to reroll character. Please try again.', true);
                        }
                    });
            });
        });
    }

    // Toggle selection of a character
    toggleCharacterSelection(characterId, card) {
        if (!card) {
            card = document.querySelector(`.character-select-card[data-id="${characterId}"]`);
            if (!card) return;
        }

        const selectionIndicator = card.querySelector('.selection-indicator');

        if (card.classList.contains('selected')) {
            // Deselect
            card.classList.remove('selected');
            if (selectionIndicator) selectionIndicator.style.display = 'none';

            // Remove from selected array
            this.selectedCharacters = this.selectedCharacters.filter(id => id !== characterId);

            console.log(`Character ${characterId} deselected`);
        } else {
            // Clear previous selections (for single select mode)
            document.querySelectorAll('.character-select-card.selected').forEach(selected => {
                selected.classList.remove('selected');
                const indicator = selected.querySelector('.selection-indicator');
                if (indicator) indicator.style.display = 'none';
            });

            // Select new card
            card.classList.add('selected');
            if (selectionIndicator) selectionIndicator.style.display = 'flex';

            // Update selected array
            this.selectedCharacters = [characterId];

            console.log(`Character ${characterId} selected`);

            // Show toast notification
            if (window.UIUtils) {
                window.UIUtils.showToast('Character Selected', 'Character has been selected for your story.');
            }
        }

        // Update form inputs
        this.updateSelectedImagesInput();
    }

    // Update hidden form inputs with selected characters
    updateSelectedImagesInput() {
        // Clear previous inputs
        const existingInputs = document.querySelectorAll('input[name="selected_images[]"]');
        existingInputs.forEach(input => input.remove());

        // Get the form
        const form = document.getElementById('storyForm');
        if (!form) return;

        // Add an input for each selected character
        this.selectedCharacters.forEach(characterId => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = 'selected_images[]';
            input.value = characterId;
            form.appendChild(input);
        });
    }

    // Fetch a random character from the API
    fetchRandomCharacter() {
        return fetch('/api/random_character')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to fetch random character');
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    return data;
                } else {
                    throw new Error(data.error || 'Unknown error');
                }
            });
    }

    // Update a character card with new data
    updateCharacterCard(card, container, data) {
        if (!card || !container || !data) return;

        // Update image
        const cardImg = card.querySelector('img');
        if (cardImg) {
            cardImg.src = data.image_url;
        }

        // Update card ID
        card.dataset.id = data.id;

        // Update selection button ID
        const selectBtn = container.querySelector('.select-character-btn');
        if (selectBtn) {
            selectBtn.dataset.characterId = data.id;
        }

        // Update name and traits
        const nameElement = container.querySelector('.character-name');
        if (nameElement) {
            nameElement.textContent = data.name;
        }

        // Update traits
        const traitsList = container.querySelector('.character-traits-list');
        if (traitsList) {
            traitsList.innerHTML = '';

            if (data.character_traits && data.character_traits.length > 0) {
                data.character_traits.forEach(trait => {
                    const traitBadge = document.createElement('span');
                    traitBadge.className = 'trait-badge';
                    traitBadge.textContent = trait;
                    traitsList.appendChild(traitBadge);
                });
            }
        }

        // If this character was selected, deselect it
        if (card.classList.contains('selected')) {
            card.classList.remove('selected');
            const selectionIndicator = card.querySelector('.selection-indicator');
            if (selectionIndicator) {
                selectionIndicator.style.display = 'none';
            }

            // Update selected characters array
            this.selectedCharacters = this.selectedCharacters.filter(id => id !== data.id);
            this.updateSelectedImagesInput();
        }
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

export default CharacterManager;