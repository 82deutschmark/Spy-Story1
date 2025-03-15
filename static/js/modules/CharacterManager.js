
// Character Manager Module
console.log("Initializing CharacterManager module");

export class CharacterManager {
    constructor() {
        this.selectedCharacters = [];
        this.maxCharacters = 2;
    }

    initialize() {
        this.setupCharacterCards();
        this.highlightCharactersInStory();
    }

    setupCharacterCards() {
        // Select all character cards
        const characterCards = document.querySelectorAll('.character-card');
        characterCards.forEach(card => {
            card.addEventListener('click', (e) => this.handleCharacterSelection(e, card));
        });
    }

    handleCharacterSelection(e, card) {
        // Don't process click if coming from a button inside the card
        if (e.target.closest('button')) return;

        const characterId = card.dataset.id;
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
                document.querySelector(`.character-card[data-id="${oldestId}"]`)?.classList.remove('selected');
            }
            
            // Select character
            card.classList.add('selected');
            this.selectedCharacters.push(characterId);
        }
        
        // Update hidden form field with selected characters
        this.updateSelectedCharactersField();
    }

    updateSelectedCharactersField() {
        const hiddenField = document.getElementById('selected_images');
        if (hiddenField) {
            hiddenField.value = this.selectedCharacters.join(',');
        }
    }

    rerollCharacter(characterId) {
        console.log(`Rerolling character ${characterId}`);
        
        fetch('/reroll_character', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({ character_id: characterId })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const cardContainer = document.querySelector(`.character-card[data-id="${characterId}"]`).parentNode;
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
            } else {
                console.error('Failed to reroll character:', data.error);
            }
        })
        .catch(error => {
            console.error('Failed to reroll character:', error);
        });
    }

    highlightCharactersInStory() {
        console.log("Highlighting characters in story");
        const storyContent = document.querySelector('.story-content');
        if (!storyContent) {
            console.log("No story content found");
            return;
        }

        // Get character names from the character images
        const characterImages = document.querySelectorAll('.character-image');
        const characterNames = Array.from(characterImages).map(img => {
            const nameElement = img.nextElementSibling;
            return nameElement ? nameElement.textContent.trim() : null;
        }).filter(Boolean);

        if (characterNames.length === 0) return;

        // Create a regex to match any of the character names
        const namePattern = characterNames.map(name => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
        const nameRegex = new RegExp(`\\b(${namePattern})\\b`, 'gi');

        // Replace text with highlighted version
        storyContent.innerHTML = storyContent.innerHTML.replace(nameRegex, match => {
            return `<span class="character-highlight">${match}</span>`;
        });
    }
}

// Create an instance that can be imported by other modules
const characterManager = new CharacterManager();
console.log("Character manager initialized");

// Export the instance as default and named export
export default characterManager;
