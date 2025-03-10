/**
 * Event handlers and initialization module
 */
import { story } from './story.js';
import { dom } from './utils/dom.js';

function updateSelectedImagesInput() {
    const storyForm = document.getElementById('storyForm');
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
}

function clearAllSelections() {
    document.querySelectorAll('.character-select-card').forEach(card => {
        card.classList.remove('selected');
        const indicator = card.querySelector('.selection-indicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    });

    document.querySelectorAll('.character-checkbox').forEach(checkbox => {
        checkbox.checked = false;
    });
}

export const events = {
    init: () => {
        document.addEventListener('DOMContentLoaded', () => {
            // Character selection
            document.querySelectorAll('.character-select-card').forEach(card => {
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

                    updateSelectedImagesInput();

                    // Show toast notification
                    dom.showToast('Character Selected', 'Character has been selected for your story.');
                });
            });

            // Handle reroll buttons
            document.querySelectorAll('.reroll-btn').forEach(button => {
                button.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();

                    const cardContainer = this.closest('.character-container');
                    if (!cardContainer) return;

                    const characterCard = cardContainer.querySelector('.character-select-card');
                    if (!characterCard) return;

                    // Show loading state
                    this.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Rerolling...';

                    // Fetch a new random character
                    fetch('/api/random_character')
                        .then(response => response.json())
                        .then(data => {
                            if (data.success) {
                                // Update image
                                const cardImg = characterCard.querySelector('img');
                                if (cardImg) {
                                    cardImg.src = data.image_url;
                                }

                                // Update character ID
                                characterCard.dataset.id = data.id;

                                // Update character name
                                const nameElement = cardContainer.querySelector('.character-name');
                                if (nameElement) {
                                    nameElement.textContent = data.name;
                                }

                                // Update traits
                                const traitsContainer = cardContainer.querySelector('.character-traits-list');
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
                                const checkbox = cardContainer.querySelector('.character-checkbox');
                                if (checkbox) {
                                    checkbox.value = data.id;
                                    checkbox.id = `character${data.id}`;
                                }

                                dom.showToast('Character Updated', 'A new character has been loaded!');
                            } else {
                                dom.showToast('Error', 'Failed to load a new character. Please try again.');
                            }

                            // Reset button
                            this.innerHTML = '<i class="fas fa-dice me-1"></i> Reroll Character';
                        })
                        .catch(error => {
                            console.error('Error fetching random character:', error);
                            this.innerHTML = '<i class="fas fa-dice me-1"></i> Reroll Character';
                            dom.showToast('Error', 'Failed to load a new character. Please try again.');
                        });
                });
            });

            // Form submission handling
            const storyForm = document.getElementById('storyForm');
            if (storyForm) {
                storyForm.addEventListener('submit', function(e) {
                    e.preventDefault();

                    // Check if at least one character is selected
                    const selectedCharacters = document.querySelectorAll('.character-checkbox:checked');
                    if (selectedCharacters.length !== 1) {
                        const characterSelectionError = document.getElementById('characterSelectionError');
                        if (characterSelectionError) {
                            characterSelectionError.style.display = 'block';
                            characterSelectionError.textContent = 'Please select a character for your story';
                            window.scrollTo(0, 0);
                        }
                        dom.showToast('Selection Needed', 'Please select a character before continuing');
                        return;
                    }

                    // Hide error message if shown
                    const characterSelectionError = document.getElementById('characterSelectionError');
                    if (characterSelectionError) {
                        characterSelectionError.style.display = 'none';
                    }

                    const generateStoryBtn = document.getElementById('generateStoryBtn');
                    if (generateStoryBtn) {
                        generateStoryBtn.disabled = true;
                        generateStoryBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Generating Story...';
                    }

                    // Update selected images input
                    updateSelectedImagesInput();

                    // Submit the form
                    const formData = new FormData(this);
                    story.generate(formData)
                        .catch(error => {
                            console.error('Error generating story:', error);
                            if (generateStoryBtn) {
                                generateStoryBtn.disabled = false;
                                generateStoryBtn.innerHTML = '<i class="fas fa-pen-fancy me-2"></i>Begin Your Adventure';
                            }
                        });
                });
            }
        });
    }
};

// Initialize events when script loads
events.init();