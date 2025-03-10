
/**
 * CharacterManager.js - Manages character selection and interaction
 */
import DOMUtils from './DOMUtils.js';
import UIUtils from './UIUtils.js';
import EventManager from './EventManager.js';

class CharacterManager {
    constructor() {
        console.log('CharacterManager initialized');

        // Store encountered characters
        this.encounteredCharacters = {};

        // Track selected characters
        this.selectedCharacters = [];
        
        // Initialize when DOM is ready
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

    // Setup listeners for character selection cards using delegation
    setupCharacterSelectListeners() {
        // Use delegation for better performance and reliability
        const characterSelectionArea = DOMUtils.getElement('#character-selection-area');
        if (!characterSelectionArea) {
            console.log('Character selection area not found, may be on a different page');
            return;
        }
        
        console.log('Setting up character selection listeners');
        
        // Add delegation for character card clicks
        EventManager.delegate(
            characterSelectionArea, 
            'click',
            '.character-select-card',
            (event, card) => {
                // Prevent if clicking on a button inside the card
                if (event.target.closest('.reroll-btn') || event.target.closest('.select-character-btn')) {
                    return;
                }
                
                const characterId = DOMUtils.dataAttr(card, 'id');
                console.log(`Character card clicked: ${characterId}`);
                this.toggleCharacterSelection(characterId, card);
            }
        );
        
        // Add delegation for select buttons
        EventManager.delegate(
            characterSelectionArea,
            'click',
            '.select-character-btn',
            (event, button) => {
                event.preventDefault();
                event.stopPropagation();
                
                const characterId = DOMUtils.dataAttr(button, 'characterId');
                console.log(`Select button clicked for character: ${characterId}`);
                
                // Find the associated card
                const characterContainer = button.closest('.character-container');
                if (characterContainer) {
                    const card = characterContainer.querySelector('.character-select-card');
                    if (card) {
                        this.toggleCharacterSelection(characterId, card);
                    } else {
                        console.error('Character card not found for selection button');
                    }
                } else {
                    console.error('Character container not found for selection button');
                }
            }
        );
        
        console.log('Character selection listeners configured');
    }

    // Setup listeners for reroll buttons using delegation
    setupRerollButtonListeners() {
        console.log('Setting up reroll button listeners');
        
        // Use delegation for all reroll buttons
        const characterSelectionArea = DOMUtils.getElement('#character-selection-area');
        if (!characterSelectionArea) {
            console.log('Character selection area not found, may be on a different page');
            return;
        }
        
        // Delegate reroll button clicks
        EventManager.delegate(
            characterSelectionArea,
            'click',
            '.reroll-btn',
            (event, button) => {
                event.preventDefault();
                event.stopPropagation();
                
                console.log('Reroll button clicked');
                
                // Find the character container
                const characterContainer = button.closest('.character-container');
                if (!characterContainer) {
                    console.error('Character container not found for reroll button');
                    return;
                }
                
                const card = characterContainer.querySelector('.character-select-card');
                if (!card) {
                    console.error('Character card not found for reroll button');
                    return;
                }
                
                const cardIndex = DOMUtils.dataAttr(button, 'cardIndex') || 
                    Array.from(DOMUtils.getElements('.character-select-card')).indexOf(card);
                
                console.log(`Rerolling character at index: ${cardIndex}`);
                
                // Show loading state on button
                const restoreButton = UIUtils.showButtonLoading(button, 'Loading...');
                
                // Create loading overlay with percentage
                const loadingContext = UIUtils.createLoadingOverlay('Finding new character...', card);
                
                // Simulate progress updates
                let progress = 0;
                const progressInterval = setInterval(() => {
                    if (progress < 90) {
                        progress += 5;
                        UIUtils.updateLoadingPercent(loadingContext, progress);
                    }
                }, 500);
                
                // Fetch new character
                this.fetchRandomCharacter()
                    .then(data => {
                        clearInterval(progressInterval);
                        UIUtils.updateLoadingPercent(loadingContext, 100);
                        
                        // Update the character card
                        this.updateCharacterCard(card, data);
                        
                        // Remove loading overlay with a small delay for visual polish
                        setTimeout(() => {
                            UIUtils.removeLoadingOverlay(loadingContext, () => {
                                // Restore button state
                                restoreButton('<i class="fas fa-dice me-1"></i> Reroll Character');
                                
                                // Show success message
                                UIUtils.showToast('Success', 'Character rerolled successfully!');
                                
                                // Trigger event for any interested listeners
                                EventManager.emit('character-rerolled', {
                                    characterId: data.id,
                                    cardIndex: cardIndex
                                });
                            });
                        }, 300);
                    })
                    .catch(error => {
                        console.error('Error fetching random character:', error);
                        clearInterval(progressInterval);
                        
                        // Remove loading overlay
                        UIUtils.removeLoadingOverlay(loadingContext);
                        
                        // Restore button state
                        restoreButton('<i class="fas fa-dice me-1"></i> Reroll Character');
                        
                        // Show error message
                        UIUtils.showToast('Error', 'Failed to reroll character. Please try again.', 'error');
                    });
            }
        );
        
        console.log('Reroll button listeners configured');
    }

    // Toggle selection of a character
    toggleCharacterSelection(characterId, card) {
        if (!card) {
            card = DOMUtils.getElement(`.character-select-card[data-id="${characterId}"]`);
            if (!card) {
                console.error(`Card not found for character ID: ${characterId}`);
                return;
            }
        }

        const selectionIndicator = card.querySelector('.selection-indicator');
        const radioInput = DOMUtils.getElement(`input.character-checkbox[value="${characterId}"]`);

        if (card.classList.contains('selected')) {
            // Deselect
            card.classList.remove('selected');
            if (selectionIndicator) selectionIndicator.style.display = 'none';
            if (radioInput) radioInput.checked = false;

            // Remove from selected array
            this.selectedCharacters = this.selectedCharacters.filter(id => id !== characterId);

            console.log(`Character ${characterId} deselected`);
        } else {
            // Clear previous selections (for single select mode)
            DOMUtils.getElements('.character-select-card.selected').forEach(selected => {
                selected.classList.remove('selected');
                const indicator = selected.querySelector('.selection-indicator');
                if (indicator) indicator.style.display = 'none';
                
                // Uncheck all other radio inputs
                const selectedId = DOMUtils.dataAttr(selected, 'id');
                if (selectedId) {
                    const input = DOMUtils.getElement(`input.character-checkbox[value="${selectedId}"]`);
                    if (input) input.checked = false;
                }
            });

            // Select new card
            card.classList.add('selected');
            if (selectionIndicator) selectionIndicator.style.display = 'flex';
            if (radioInput) radioInput.checked = true;

            // Update selected array
            this.selectedCharacters = [characterId];

            console.log(`Character ${characterId} selected`);

            // Show toast notification
            UIUtils.showToast('Character Selected', 'Character has been selected for your story.');
        }

        // Update form inputs
        this.updateSelectedImagesInput();
        
        // Trigger event for any interested listeners
        EventManager.emit('character-selection-changed', {
            selectedCharacters: this.selectedCharacters
        });
    }

    // Update hidden form inputs with selected characters
    updateSelectedImagesInput() {
        // Clear previous inputs
        DOMUtils.getElements('input[name="selected_images[]"]').forEach(input => {
            if (input.parentNode) {
                input.parentNode.removeChild(input);
            }
        });

        // Get the form
        const form = DOMUtils.getElement('#storyForm');
        if (!form) return;

        // Add an input for each selected character
        this.selectedCharacters.forEach(characterId => {
            const input = DOMUtils.createElement('input', {
                type: 'hidden',
                name: 'selected_images[]',
                value: characterId
            });
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

        // Store whether the card was previously selected
        const wasSelected = card.classList.contains('selected');
        const oldCharacterId = DOMUtils.dataAttr(card, 'id');

        // Update image
        const cardImg = card.querySelector('img');
        if (cardImg) {
            cardImg.src = data.image_url;
        }

        // Update card ID
        DOMUtils.dataAttr(card, 'id', data.id);

        // Update selection button ID
        const selectBtn = card.closest('.character-container')?.querySelector('.select-character-btn');
        if (selectBtn) {
            DOMUtils.dataAttr(selectBtn, 'characterId', data.id);
        }

        // Update checkbox value
        const checkbox = card.closest('.character-container')?.querySelector('.character-checkbox');
        if (checkbox) {
            checkbox.value = data.id;
            checkbox.id = `character${data.id}`;
        }

        // Update name and traits
        const nameElement = card.closest('.character-container')?.querySelector('.character-name');
        if (nameElement) {
            nameElement.textContent = data.name;
        }

        // Update traits
        const traitsList = card.closest('.character-container')?.querySelector('.character-traits-list');
        if (traitsList) {
            traitsList.innerHTML = '';

            if (data.character_traits && data.character_traits.length > 0) {
                data.character_traits.forEach(trait => {
                    const traitBadge = DOMUtils.createElement('span', {
                        className: 'trait-badge',
                    }, trait);
                    traitsList.appendChild(traitBadge);
                });
            }
        }

        // If this character was selected, update the selection
        if (wasSelected) {
            // Update selected characters array
            this.selectedCharacters = this.selectedCharacters.filter(id => id !== oldCharacterId);
            this.selectedCharacters.push(data.id);
            this.updateSelectedImagesInput();
            
            // Keep the visual selection state
            card.classList.add('selected');
            const selectionIndicator = card.querySelector('.selection-indicator');
            if (selectionIndicator) {
                selectionIndicator.style.display = 'flex';
            }
            
            // Update checkbox
            if (checkbox) {
                checkbox.checked = true;
            }
        }
    }

    // Record a character encounter
    recordCharacterEncounter(characterId, characterName, initialRelationship = 0) {
        return fetch('/api/character/encounter', {
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
                EventManager.emit('character-encountered', { 
                    characterId,
                    characterName,
                    encounteredCharacters: this.encounteredCharacters
                });

                return data;
            } else {
                throw new Error(data.error || 'Failed to record character encounter');
            }
        });
    }

    // Change relationship with a character
    changeCharacterRelationship(characterId, changeAmount, reason) {
        return fetch('/api/character/relationship', {
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
                EventManager.emit('relationship-changed', { 
                    characterId,
                    changeAmount,
                    reason,
                    encounteredCharacters: this.encounteredCharacters
                });

                return data;
            } else {
                throw new Error(data.error || 'Failed to update character relationship');
            }
        });
    }

    // Get encountered characters
    getEncounteredCharacters() {
        return fetch('/api/character/encountered')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    this.encounteredCharacters = data.encountered_characters || {};
                    return this.encounteredCharacters;
                } else {
                    throw new Error(data.error || 'Failed to get encountered characters');
                }
            });
    }
}

// Create a global instance
const characterManager = new CharacterManager();

// Export to global scope for now
window.CharacterManager = characterManager;
export default characterManager;
