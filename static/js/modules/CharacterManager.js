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
        console.log('Setting up reroll button listeners');
        // Set up event listeners for the reroll buttons
        document.querySelectorAll('.reroll-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation(); // Prevent event from bubbling up
                const characterContainer = button.closest('.character-select-card');
                if (!characterContainer) {
                    console.error('Character container not found');
                    return;
                }

                // Get the index from data attribute
                const index = button.dataset.cardIndex;
                console.log(`Rerolling character at index: ${index}`);

                // Disable the button and show loading state
                button.disabled = true;
                button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Rerolling...';

                // Create loading overlay
                const loadingPercent = window.UIUtils.createLoadingOverlay('Finding a new character...');
                let progress = 0;
                const progressInterval = setInterval(() => {
                    if (progress < 90) {
                        progress += 10;
                        window.UIUtils.updateLoadingPercent(loadingPercent, progress);
                    }
                }, 200);

                fetch('/api/random_character')
                    .then(response => response.json())
                    .then(data => {
                        clearInterval(progressInterval);
                        window.UIUtils.updateLoadingPercent(loadingPercent, 100);

                        if (data.success) {
                            setTimeout(() => {
                                this.updateCharacterCard(characterContainer, data);
                                window.UIUtils.removeLoadingOverlay(loadingPercent);

                                // Re-enable the button
                                button.disabled = false;
                                button.innerHTML = '<i class="fas fa-dice me-1"></i> Reroll Character';

                                window.UIUtils.showToast('Success', 'Character rerolled successfully!');
                            }, 500);
                        } else {
                            throw new Error(data.error || 'Failed to reroll character');
                        }
                    })
                    .catch(error => {
                        console.error('Error fetching random character:', error);
                        clearInterval(progressInterval);
                        window.UIUtils.removeLoadingOverlay(loadingPercent);

                        // Re-enable the button
                        button.disabled = false;
                        button.innerHTML = '<i class="fas fa-dice me-1"></i> Reroll Character';

                        window.UIUtils.showToast('Error', 'Failed to reroll character. Please try again.');
                    });
            });
        });
        console.log('Reroll button listeners configured');
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
    updateCharacterCard(card, data) {
        if (!card || !data) return;

        // Update image
        const cardImg = card.querySelector('img');
        if (cardImg) {
            cardImg.src = data.image_url;
        }

        // Update card ID
        card.dataset.id = data.id;

        // Update selection button ID
        const selectBtn = card.querySelector('.select-character-btn');
        if (selectBtn) {
            selectBtn.dataset.characterId = data.id;
        }

        // Update name and traits
        const nameElement = card.querySelector('.character-name');
        if (nameElement) {
            nameElement.textContent = data.name;
        }

        // Update traits
        const traitsList = card.querySelector('.character-traits-list');
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