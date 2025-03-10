/**
 * Character highlighting and interaction module
 */
import { dom } from './utils/dom.js';
import { api } from './utils/api.js';

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
    },
    /**
     * Initialize character selection
     */
    initialize() {
        const characterCards = document.querySelectorAll('.character-select-card');
        const characterCheckboxes = document.querySelectorAll('.character-checkbox');

        if (!characterCards.length) return;

        // Clear all selections on start
        this.clearAllSelections(characterCards, characterCheckboxes);

        // Handle character selection when clicking on card
        characterCards.forEach(card => {
            card.addEventListener('click', function() {
                const characterId = this.dataset.id;
                const checkbox = document.getElementById(`character${characterId}`);
                const selectionIndicator = this.querySelector('.selection-indicator');

                if (!checkbox || !selectionIndicator) return;

                // For single-select behavior
                character.clearAllSelections(characterCards, characterCheckboxes);

                // Select this character
                checkbox.checked = true;
                selectionIndicator.style.display = 'block';
                this.classList.add('selected');

                // Update selected images input
                character.updateSelectedImagesInput();

                // Show toast notification
                dom.showToast('Character Selected', 'Character has been selected for your story');
            });
        });

        // Handle reroll buttons
        const rerollBtns = document.querySelectorAll('.reroll-btn');
        rerollBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.rerollCharacter(btn.dataset.id);
            });
        });
    },

    /**
     * Clear all character selections
     * @param {NodeList} cards - Character cards
     * @param {NodeList} checkboxes - Character checkboxes
     */
    clearAllSelections(cards, checkboxes) {
        // Reset card visual state
        cards.forEach(card => {
            card.classList.remove('selected');
            const indicator = card.querySelector('.selection-indicator');
            if (indicator) {
                indicator.style.display = 'none';
            }
        });

        // Uncheck all checkboxes
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
    },

    /**
     * Update hidden inputs for selected images
     */
    updateSelectedImagesInput() {
        const storyForm = document.getElementById('storyForm');
        if (!storyForm) return;

        // Remove any existing hidden inputs
        document.querySelectorAll('input[name="selected_images[]"]').forEach(el => {
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
    },

    /**
     * Initialize character highlighting in story
     */
    initializeHighlightingImproved() {
        const storyContent = document.querySelector('.story-content');
        const characterPortraits = document.querySelectorAll('.character-portrait-mini');

        if (!storyContent || !characterPortraits.length) {
            console.log('Story content element not found');
            return;
        }

        // Highlight character mentions in the story text
        characterPortraits.forEach(portrait => {
            const characterName = portrait.dataset.characterName;
            if (!characterName) return;

            // Highlight this character's name in the story text
            const regex = new RegExp(`\\b${characterName}\\b`, 'gi');
            storyContent.innerHTML = storyContent.innerHTML.replace(
                regex,
                match => `<span class="character-highlight" data-character="${characterName}">${match}</span>`
            );
        });

        // Add hover effects
        document.querySelectorAll('.character-highlight').forEach(highlight => {
            const characterName = highlight.dataset.character;
            const portrait = document.querySelector(`.character-portrait-mini[data-character-name="${characterName}"]`);

            if (!portrait) return;

            highlight.addEventListener('mouseenter', () => {
                portrait.classList.add('highlighted');
            });

            highlight.addEventListener('mouseleave', () => {
                portrait.classList.remove('highlighted');
            });
        });
    },

    /**
     * Reroll a character to get new traits
     * @param {string} characterId - Character ID
     */
    async rerollCharacter(characterId) {
        try {
            // Show loading overlay
            const loadingPercent = dom.createLoadingOverlay('Regenerating character...');

            // Call API to reroll character
            const response = await api.post('/api/character/reroll', {
                character_id: characterId
            });

            // Update UI with new character traits
            if (response && response.success) {
                const characterContainer = document.querySelector(`.character-select-card[data-id="${characterId}"]`).closest('.character-container');
                const traitsContainer = characterContainer.querySelector('.character-traits-list');

                // Update traits list
                if (traitsContainer && response.traits) {
                    traitsContainer.innerHTML = '';
                    response.traits.forEach(trait => {
                        const traitEl = document.createElement('span');
                        traitEl.className = 'trait-badge';
                        traitEl.textContent = trait;
                        traitsContainer.appendChild(traitEl);
                    });
                }

                dom.showToast('Character Updated', 'Character traits have been refreshed');
            } else {
                dom.showToast('Error', response.error || 'Failed to update character');
            }

            dom.removeLoadingOverlay(loadingPercent);
        } catch (error) {
            console.error('Error rerolling character:', error);
            dom.showToast('Error', 'Failed to update character');
            dom.removeLoadingOverlay(document.querySelector('.loading-percentage'));
        }
    }
};

// Initialize character highlighting when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    character.initializeHighlighting();
    character.initialize();
    character.initializeHighlightingImproved();
});