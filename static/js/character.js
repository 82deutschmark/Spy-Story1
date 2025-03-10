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
 * Character management functionality
 */
import { dom } from './utils/dom.js';
import { api } from './utils/api.js';

export const character = {
    /**
     * Initialize character selection functionality
     */
    initialize() {
        const characterCards = document.querySelectorAll('.character-select-card');
        const characterCheckboxes = document.querySelectorAll('.character-checkbox');
        const storyForm = document.getElementById('storyForm');

        if (!characterCards.length) {
            console.log('No character cards found');
            return;
        }

        /**
         * Clear all character selections
         */
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

        /**
         * Update hidden inputs with selected characters
         */
        const updateSelectedImagesInput = () => {
            if (!storyForm) return;

            // Remove any existing hidden inputs
            document.querySelectorAll('input[name="selected_images[]"]').forEach(el => el.remove());

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

                if (!checkbox || !selectionIndicator) return;

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

                const cardContainer = this.closest('.character-container');
                if (!cardContainer) return;

                const characterCard = cardContainer.querySelector('.character-select-card');
                if (!characterCard) return;

                // Show loading state
                this.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Rerolling...';

                try {
                    // Fetch a new random character
                    const data = await api.get('/api/random_character', false);

                    if (data.success) {
                        // Update image
                        const cardImg = characterCard.querySelector('img');
                        if (cardImg) {
                            cardImg.src = data.image_url;
                        }

                        // Update character info
                        const nameEl = cardContainer.querySelector('.character-name');
                        if (nameEl) {
                            nameEl.textContent = data.name;
                        }

                        const traitsContainer = cardContainer.querySelector('.character-traits-list');
                        if (traitsContainer && data.character_traits) {
                            traitsContainer.innerHTML = '';
                            data.character_traits.forEach(trait => {
                                const span = document.createElement('span');
                                span.className = 'trait-badge';
                                span.textContent = trait;
                                traitsContainer.appendChild(span);
                            });
                        }

                        // Update checkbox value
                        const checkbox = cardContainer.querySelector('.character-checkbox');
                        if (checkbox) {
                            checkbox.value = data.id;
                            checkbox.id = `character${data.id}`;
                        }

                        // Update card data id
                        characterCard.dataset.id = data.id;

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

        // Set initial state for any pre-selected characters
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

        if (!characterNames.length) return;

        // Replace character names with highlighted versions
        characterNames.forEach(character => {
            const regex = new RegExp(`\\b${character.name}\\b`, 'gi');
            storyContent.innerHTML = storyContent.innerHTML.replace(regex, match => {
                return `<span class="character-highlight" data-character="${character.name.toLowerCase().replace(/\s+/g, '-')}">${match}</span>`;
            });
        });

        // Add click events to highlighted character names
        document.querySelectorAll('.character-highlight').forEach(highlight => {
            highlight.addEventListener('click', function() {
                const characterName = this.dataset.character;
                const characterEl = document.querySelector(`.character-portrait-mini[data-character-name="${characterName}"]`);
                if (characterEl) {
                    characterEl.scrollIntoView({ behavior: 'smooth' });
                    characterEl.classList.add('highlight-pulse');
                    setTimeout(() => {
                        characterEl.classList.remove('highlight-pulse');
                    }, 2000);
                }
            });
        });
    }
};