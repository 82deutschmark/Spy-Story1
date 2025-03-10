/**
 * Character highlighting and interaction module
 */
import { dom } from './utils/dom.js';
import { api } from './utils/api.js';

export const character = {
    /**
     * Initialize character selection behavior
     */
    initialize() {
        const characterCards = document.querySelectorAll('.character-select-card');
        const characterCheckboxes = document.querySelectorAll('.character-checkbox');
        const storyForm = document.getElementById('storyForm');

        if (!characterCards.length) return;

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

                const characterId = btn.dataset.id;
                // Show loading state
                btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Rerolling...';

                // Fetch a new random character
                fetch('/api/random_character')
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            const cardContainer = btn.closest('.character-container');
                            if (!cardContainer) return;

                            const characterCard = cardContainer.querySelector('.character-select-card');
                            if (!characterCard) return;

                            // Update image
                            const cardImg = characterCard.querySelector('img');
                            if (cardImg) {
                                cardImg.src = data.image_url;
                            }

                            // Update character ID
                            characterCard.dataset.id = data.id;

                            // Update checkbox
                            const checkbox = cardContainer.querySelector('.character-checkbox');
                            if (checkbox) {
                                checkbox.value = data.id;
                                checkbox.id = `character${data.id}`;
                            }

                            // Update name
                            const nameElement = cardContainer.querySelector('.character-name');
                            if (nameElement) {
                                nameElement.textContent = data.name;
                            }

                            // Update traits
                            const traitsContainer = cardContainer.querySelector('.character-traits-list');
                            if (traitsContainer && data.character_traits) {
                                traitsContainer.innerHTML = '';
                                data.character_traits.forEach(trait => {
                                    const traitBadge = document.createElement('span');
                                    traitBadge.className = 'trait-badge';
                                    traitBadge.textContent = trait;
                                    traitsContainer.appendChild(traitBadge);
                                });
                            }

                            dom.showToast('Character Updated', 'A new character has been loaded!');
                        } else {
                            dom.showToast('Error', 'Failed to load a new character. Please try again.');
                        }

                        // Reset button
                        btn.innerHTML = '<i class="fas fa-dice me-1"></i> Reroll Character';
                    })
                    .catch(error => {
                        console.error('Error fetching random character:', error);
                        btn.innerHTML = '<i class="fas fa-dice me-1"></i> Reroll Character';
                        dom.showToast('Error', 'Failed to load a new character. Please try again.');
                    });
            });
        });
    },

    /**
     * Clear all character selections
     * @param {NodeList} cards - Character cards
     * @param {NodeList} checkboxes - Character checkboxes
     */
    clearAllSelections(cards, checkboxes) {
        // Use parameters if provided, otherwise find elements
        const characterCards = cards || document.querySelectorAll('.character-select-card');
        const characterCheckboxes = checkboxes || document.querySelectorAll('.character-checkbox');

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
    },

    /**
     * Update the hidden input fields with selected character IDs
     */
    updateSelectedImagesInput() {
        const storyForm = document.getElementById('storyForm');
        if (!storyForm) return;

        // Remove any existing hidden inputs for selected images
        document.querySelectorAll('input[name="selected_images[]"]').forEach(el => {
            if (!el.classList.contains('character-checkbox')) {
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
     * Initialize character highlighting in storyboard
     */
    initializeHighlighting() {
        const characterPortraits = document.querySelectorAll('.character-mini-img');
        const storyContent = document.querySelector('.story-content');

        if (!characterPortraits.length || !storyContent) {
            console.log("Story content element not found");
            return;
        }

        // Add highlighting for character mentions in story text
        characterPortraits.forEach(portrait => {
            const characterName = portrait.alt.toLowerCase();
            const characterContainer = portrait.closest('.character-portrait-mini');

            if (!characterContainer) return;

            // Add highlighting when hovering over character portrait
            characterContainer.addEventListener('mouseenter', () => {
                // Highlight all mentions of this character in the story text
                const storyText = storyContent.innerHTML;
                const highlightedText = storyText.replace(
                    new RegExp(`(${characterName})`, 'gi'),
                    '<span class="highlighted-character">$1</span>'
                );
                storyContent.innerHTML = highlightedText;
            });

            characterContainer.addEventListener('mouseleave', () => {
                // Remove highlighting
                const highlightedElements = storyContent.querySelectorAll('.highlighted-character');
                highlightedElements.forEach(el => {
                    const parent = el.parentNode;
                    parent.replaceChild(document.createTextNode(el.textContent), el);
                });
            });
        });
    },

    /**
     * Initialize improved character highlighting (for dynamic content)
     */
    initializeHighlightingImproved() {
        // Implementation for improved highlighting if needed
    }
};

// Initialize character module when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    character.initialize();
    character.initializeHighlighting();
});