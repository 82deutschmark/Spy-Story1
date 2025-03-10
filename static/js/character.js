/**
 * Character highlighting and interaction module
 */
import { dom } from './utils/dom.js';

export const character = {
    /**
     * Initialize character highlighting in story text
     */
    initializeHighlighting: () => {
        const storyContent = document.querySelector('.story-content');
        if (!storyContent) {
            return;
        }

        const characterPortraits = document.querySelectorAll('.character-portrait-mini');
        if (characterPortraits.length === 0) {
            return;
        }

        // Collect character data from portraits
        const characterNames = Array.from(characterPortraits).map(portrait => {
            const nameElement = portrait.querySelector('.character-mini-name');
            const imageElement = portrait.querySelector('img');

            if (!nameElement || !imageElement) return null;

            const name = nameElement.textContent.trim();
            if (!name) return null;

            return {
                name: name,
                image: imageElement.src,
                dataName: portrait.getAttribute('data-character-name') || 
                         name.toLowerCase().replace(/\s/g, '-')
            };
        }).filter(Boolean);

        if (characterNames.length === 0) {
            return;
        }

        // Sort names by length (longest first) to avoid partial matches
        characterNames.sort((a, b) => b.name.length - a.name.length);

        // Get the story text content
        let storyHTML = storyContent.innerHTML;
        const originalHTML = storyHTML;

        // Replace character names with highlighted spans
        characterNames.forEach(character => {
            const escapedName = character.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`\\b${escapedName}\\b(?![^<]*>)`, 'gi');

            storyHTML = storyHTML.replace(regex, match => 
                `<span class="character-mention" data-character="${character.dataName}">` +
                `${match}<span class="character-tooltip"><img src="${character.image}" ` +
                `alt="${match}">${match}</span></span>`
            );
        });

        // Only update if changes were made
        if (storyHTML !== originalHTML) {
            storyContent.innerHTML = storyHTML;

            // Add click event listeners
            document.querySelectorAll('.character-mention').forEach(mention => {
                mention.addEventListener('click', function() {
                    const characterId = this.dataset.character;
                    if (!characterId) return;

                    // Remove highlight from all portraits
                    document.querySelectorAll('.character-mini-img')
                        .forEach(img => img.classList.remove('character-mini-highlight'));

                    // Add highlight to this portrait
                    const targetPortrait = document.querySelector(
                        `.character-portrait-mini[data-character-name="${characterId}"]`
                    );
                    if (targetPortrait) {
                        const portraitImg = targetPortrait.querySelector('.character-mini-img');
                        if (portraitImg) {
                            portraitImg.classList.add('character-mini-highlight');
                            targetPortrait.scrollIntoView({ 
                                behavior: 'smooth', 
                                block: 'nearest' 
                            });

                            // Remove highlight after 3 seconds
                            setTimeout(() => {
                                portraitImg.classList.remove('character-mini-highlight');
                            }, 3000);
                        }
                    }
                });
            });
        }
    }
};

// Initialize character highlighting when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    character.initializeHighlighting();
});
/**
 * Character selection and management functionality
 */
import { dom } from './utils/dom.js';

export const character = {
    /**
     * Initialize character selection functionality
     */
    initialize() {
        const characterCards = document.querySelectorAll('.character-select-card');
        const characterCheckboxes = document.querySelectorAll('.character-checkbox');
        const storyForm = document.getElementById('storyForm');
        
        // Clear all selections
        const clearAllSelections = () => {
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
        };
        
        // Update form with selected characters
        const updateSelectedImagesInput = () => {
            if (!storyForm) return;
            
            // Clear existing hidden inputs to avoid duplicates
            storyForm.querySelectorAll('input[name="selected_images[]"]').forEach(el => {
                if (el.type === 'hidden') {
                    el.remove();
                }
            });
            
            // Add new hidden inputs for each selected character
            document.querySelectorAll('.character-checkbox:checked').forEach(checkbox => {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = 'selected_images[]';
                input.value = checkbox.value;
                storyForm.appendChild(input);
            });
        };
        
        // Handle character card clicks
        characterCards.forEach(card => {
            card.addEventListener('click', function() {
                const characterId = this.dataset.id;
                const checkbox = document.getElementById(`character${characterId}`);
                const selectionIndicator = this.querySelector('.selection-indicator');
                
                // Single-select behavior
                clearAllSelections();
                
                // Select this character
                checkbox.checked = true;
                selectionIndicator.style.display = 'block';
                this.classList.add('selected');
                
                // Update form inputs
                updateSelectedImagesInput();
                
                // Provide feedback
                dom.showToast('Character Selected', 'Character has been selected for your story.');
            });
        });
        
        // Handle reroll buttons
        const rerollButtons = document.querySelectorAll('.reroll-btn');
        rerollButtons.forEach(button => {
            button.addEventListener('click', async function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const characterContainer = this.closest('.character-container');
                if (!characterContainer) return;
                
                const characterCard = characterContainer.querySelector('.character-select-card');
                if (!characterCard) return;
                
                // Show loading state
                this.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Rerolling...';
                
                try {
                    // Fetch a new random character
                    const response = await fetch('/api/random_character');
                    const data = await response.json();
                    
                    if (data.success) {
                        // Update the character card
                        const cardImg = characterCard.querySelector('img');
                        if (cardImg) {
                            cardImg.src = data.image_url;
                        }
                        
                        // Update character ID
                        characterCard.dataset.id = data.id;
                        
                        // Update character name
                        const nameElement = characterContainer.querySelector('.character-name');
                        if (nameElement) {
                            nameElement.textContent = data.name;
                        }
                        
                        // Update traits
                        const traitsContainer = characterContainer.querySelector('.character-traits-list');
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
                        const checkbox = characterContainer.querySelector('.character-checkbox');
                        if (checkbox) {
                            checkbox.value = data.id;
                            checkbox.id = `character${data.id}`;
                        }
                        
                        dom.showToast('Character Updated', 'A new character has been loaded!');
                    } else {
                        dom.showToast('Error', 'Failed to load a new character', true);
                    }
                } catch (error) {
                    console.error('Error fetching random character:', error);
                    dom.showToast('Error', 'Failed to load a new character', true);
                } finally {
                    // Reset button
                    this.innerHTML = '<i class="fas fa-dice me-1"></i> Reroll Character';
                }
            });
        });
        
        // Set initial state
        characterCheckboxes.forEach((checkbox, index) => {
            if (checkbox.checked && index < characterCards.length) {
                characterCards[index].classList.add('selected');
                const indicator = characterCards[index].querySelector('.selection-indicator');
                if (indicator) {
                    indicator.style.display = 'block';
                }
            }
        });
    },
    
    /**
     * Initialize character highlighting in story text
     */
    initializeHighlighting() {
        const storyContent = document.querySelector('.story-content');
        if (!storyContent) {
            console.log('Story content element not found');
            return;
        }
        
        // Get character names from mini-portraits
        const characterPortraits = document.querySelectorAll('.character-portrait-mini');
        const characterNames = Array.from(characterPortraits).map(portrait => {
            return {
                name: portrait.querySelector('.character-mini-name').textContent.trim(),
                image: portrait.querySelector('img').src,
                element: portrait
            };
        });
        
        // Sort by name length (longest first) to avoid partial matches
        characterNames.sort((a, b) => b.name.length - a.name.length);
        
        // Get story text
        let storyText = storyContent.innerHTML;
        
        // Replace character names with highlighted spans
        characterNames.forEach(character => {
            const regex = new RegExp(`\\b${character.name}\\b`, 'gi');
            storyText = storyText.replace(regex, match => {
                return `<span class="character-mention" data-character="${character.name.toLowerCase().replace(/\s/g, '-')}">${match}<span class="character-tooltip"><img src="${character.image}" alt="${match}">${match}</span></span>`;
            });
        });
        
        // Update content
        storyContent.innerHTML = storyText;
        
        // Add click handlers
        document.querySelectorAll('.character-mention').forEach(mention => {
            mention.addEventListener('click', function() {
                const characterId = this.dataset.character;
                const targetPortrait = document.querySelector(`.character-portrait-mini[data-character-name="${characterId}"]`);
                
                // Remove existing highlights
                document.querySelectorAll('.character-mini-img').forEach(img => {
                    img.classList.remove('character-mini-highlight');
                });
                
                // Highlight selected character
                if (targetPortrait) {
                    const portraitImg = targetPortrait.querySelector('.character-mini-img');
                    portraitImg.classList.add('character-mini-highlight');
                    
                    // Scroll to character
                    targetPortrait.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    
                    // Remove highlight after delay
                    setTimeout(() => {
                        portraitImg.classList.remove('character-mini-highlight');
                    }, 3000);
                }
            });
        });
    }
};
