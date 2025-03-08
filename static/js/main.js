// Loading overlay functions
function createLoadingOverlay(message = 'Generating Story...') {
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
        <div class="loading-content">
            <div class="loading-spinner"></div>
            <div class="loading-percentage">0%</div>
        </div>
    `;
    document.body.appendChild(overlay);
    overlay.style.display = 'flex';
    return overlay.querySelector('.loading-percentage');
}

function updateLoadingPercent(element, percent) {
    element.textContent = `${Math.round(percent)}%`;
}

function removeLoadingOverlay(overlay) {
    overlay.closest('.loading-overlay').remove();
}


document.addEventListener('DOMContentLoaded', function() {
    // Character selection
    const characterCards = document.querySelectorAll('.character-select-card');
    const characterCheckboxes = document.querySelectorAll('.character-checkbox');
    const storyForm = document.getElementById('storyForm');
    const generateStoryBtn = document.getElementById('generateStoryBtn');
    const characterSelectionError = document.getElementById('characterSelectionError');

    // Function to handle character selection
    function selectCharacter(cardIndex) {
        // Clear any previous selections first
        characterCards.forEach(c => c.classList.remove('selected'));
        characterCheckboxes.forEach(cb => cb.checked = false);
        
        // Find all selection indicators and hide them
        document.querySelectorAll('.selection-indicator').forEach(indicator => {
            indicator.style.display = 'none';
        });

        // Select this character
        if (characterCards[cardIndex]) {
            characterCards[cardIndex].classList.add('selected');
            
            // Show the selection indicator for this card
            const indicator = characterCards[cardIndex].querySelector('.selection-indicator');
            if (indicator) {
                indicator.style.display = 'block';
            }
        }
        
        if (characterCheckboxes[cardIndex]) {
            characterCheckboxes[cardIndex].checked = true;
        }

        // Show visual feedback
        showToast('Character Selected', 'Your character has been selected for the adventure');
    }

    // Select character when card is clicked
    characterCards.forEach((card, index) => {
        card.addEventListener('click', function() {
            selectCharacter(index);
        });
    });
    
    // Select character when button is clicked
    const selectButtons = document.querySelectorAll('.select-character-btn');
    selectButtons.forEach((button, index) => {
        button.addEventListener('click', function(e) {
            e.stopPropagation(); // Prevent the card click event from also firing
            selectCharacter(index);
        });
    });

    // No duplicate reroll button functionality needed, as it's handled elsewhere

    // Toast notification function
    function showToast(title, message) {
        const toastElement = document.getElementById('notificationToast');
        const toastTitle = document.getElementById('toastTitle');
        const toastMessage = document.getElementById('toastMessage');

        if (toastElement && toastTitle && toastMessage) {
            toastTitle.textContent = title;
            toastMessage.textContent = message;
            const toast = new bootstrap.Toast(toastElement);
            toast.show();
        }
    }

    // Form submission
    if (storyForm) {
        storyForm.addEventListener('submit', function(e) {
            // Check if a character is selected
            const selectedCharacters = document.querySelectorAll('.character-checkbox:checked');

            if (selectedCharacters.length < 1) {
                e.preventDefault();
                if (characterSelectionError) {
                    characterSelectionError.style.display = 'block';
                    characterSelectionError.textContent = 'Please select a character for your story';
                }
                window.scrollTo(0, 0);
                showToast('Selection Needed', 'Please select a character before continuing');
            }
        });
    }

    // Check radio buttons on page load to restore selection state
    characterCheckboxes.forEach((checkbox, index) => {
        if (checkbox.checked) {
            characterCards[index].classList.add('selected');
        }
    });
});

// Story choice form submission
const choiceForms = document.querySelectorAll('.choice-form');
if (choiceForms.length > 0) {
    choiceForms.forEach(form => {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            const btn = this.querySelector('button');
            btn.disabled = true;
            btn.classList.add('loading');

            const loadingPercent = createLoadingOverlay('Continuing your story...');
            let progress = 0;
            const progressInterval = setInterval(() => {
                if (progress < 90) {
                    progress += 5;
                    updateLoadingPercent(loadingPercent, progress);
                }
            }, 500);

            try {
                const response = await fetch(this.action, {
                    method: 'POST',
                    body: new FormData(this),
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });

                const data = await response.json();
                clearInterval(progressInterval);

                if (data.success && data.redirect) {
                    updateLoadingPercent(loadingPercent, 100);
                    setTimeout(() => {
                        window.location.href = data.redirect;
                    }, 500);
                } else {
                    throw new Error(data.error || 'Failed to continue story');
                }
            } catch (error) {
                showToast('Error', error.message);
                btn.disabled = false;
                btn.classList.remove('loading');
                clearInterval(progressInterval);
                const overlay = loadingPercent.closest('.loading-overlay');
                if (overlay) overlay.remove();
            }
        });
    });
}

// Handle main story form submission
const storyFormMain = document.getElementById('storyForm');
if (storyFormMain) {
    storyFormMain.addEventListener('submit', async function(e) {
        e.preventDefault();

        const selectedCharacter = document.querySelector('input[name="selectedCharacter"]:checked');
        if (!selectedCharacter) {
            characterSelectionError.style.display = 'block';
            characterSelectionError.textContent = 'Please select a character for your story.';
            return;
        }

        characterSelectionError.style.display = 'none';

        // Create loading overlay with percentage
        const loadingPercent = createLoadingOverlay();
        generateStoryBtn.disabled = true;

        try {
            let progress = 0;
            const progressInterval = setInterval(() => {
                if (progress < 90) {
                    progress += 5;
                    updateLoadingPercent(loadingPercent, progress);
                }
            }, 500);

            const formData = new FormData(this);
            formData.set('selected_images[]', selectedCharacter.value);

            const response = await fetch('/generate_story', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            const data = await response.json();
            clearInterval(progressInterval);

            if (data.success && data.redirect) {
                updateLoadingPercent(loadingPercent, 100);
                setTimeout(() => {
                    window.location.href = data.redirect;
                }, 500);
            } else {
                throw new Error(data.error || 'Failed to generate story');
            }
        } catch (error) {
            showToast('Error', error.message);
            generateStoryBtn.disabled = false;
            generateStoryBtn.innerHTML = '<i class="fas fa-pen-fancy me-2"></i>Begin Your Adventure';
            const overlay = loadingPercent.closest('.loading-overlay');
            if (overlay) overlay.remove();
        }
    });
}

// Reroll functionality (adapted to use new loading overlay)
// No duplicate variable declarations needed
// Remove duplicate reroll button functionality

                    // Find the character name element within the container
                    const characterContainer = cardContainer;
                    const nameElement = characterContainer ? characterContainer.querySelector('.character-name') : null;
                    if (nameElement) {
                        nameElement.textContent = data.name;
                    }

                    // Update character traits
                    if (traitsContainer && data.character_traits) {
                        traitsContainer.innerHTML = '';
                        data.character_traits.forEach(trait => {
                            const badge = document.createElement('span');
                            badge.className = 'badge bg-primary me-1';
                            badge.textContent = trait;
                            traitsContainer.appendChild(badge);
                        });
                    }

                    // Update checkbox value
                    if (checkbox) {
                        checkbox.value = data.id;
                    }

                    // Removed duplicate reroll handler

// Debug page enhancements
const editModeSwitch = document.getElementById('editModeSwitch');
const generatedContent = document.getElementById('generatedContent');

if (editModeSwitch && generatedContent) {
    editModeSwitch.addEventListener('change', function() {
        if (this.checked) {
            generatedContent.contentEditable = true;
            generatedContent.classList.add('editable');
            generatedContent.focus();
        } else {
            generatedContent.contentEditable = false;
            generatedContent.classList.remove('editable');
        }
    });
}
document.addEventListener('DOMContentLoaded', function() {
    // Handle character selection
    const characterCards = document.querySelectorAll('.character-select-card');
    const characterCheckboxes = document.querySelectorAll('.character-checkbox');
    const generateStoryBtn = document.getElementById('generateStoryBtn');
    const storyForm = document.getElementById('storyForm');
    const selectedCharactersList = document.querySelector('.selected-characters-list');
    const selectedCharactersContainer = document.querySelector('.selected-characters-container');
    const characterSelectionError = document.getElementById('characterSelectionError');
    
    // Add hidden input fields for selected images
    function updateSelectedImagesInput() {
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
    
    // Handle character selection when clicking on card
    characterCards.forEach((card, index) => {
        card.addEventListener('click', function() {
            const characterId = this.dataset.id;
            const checkbox = document.getElementById(`character${characterId}`);
            const selectionIndicator = this.querySelector('.selection-indicator');
            
            // Toggle selection
            if (checkbox.checked) {
                checkbox.checked = false;
                selectionIndicator.style.display = 'none';
            } else {
                checkbox.checked = true;
                selectionIndicator.style.display = 'block';
            }
            
            updateSelectedImagesInput();
        });
    });
    
    // Handle select character button clicks
    const selectButtons = document.querySelectorAll('.select-character-btn');
    selectButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const characterId = this.dataset.characterId;
            const characterCard = document.querySelector(`.character-select-card[data-id="${characterId}"]`);
            const checkbox = document.getElementById(`character${characterId}`);
            const selectionIndicator = characterCard.querySelector('.selection-indicator');
            
            // Select this character
            checkbox.checked = true;
            selectionIndicator.style.display = 'block';
            characterCard.classList.add('selected');
            
            updateSelectedImagesInput();
            
            // Show toast notification
            const toast = new bootstrap.Toast(document.getElementById('notificationToast'));
            document.getElementById('toastTitle').textContent = 'Character Selected';
            document.getElementById('toastMessage').textContent = 'Character has been selected for your story.';
            toast.show();
        });
    });
    
    // Handle reroll buttons
    const rerollButtons = document.querySelectorAll('.reroll-btn');
    rerollButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const cardIndex = this.dataset.cardIndex;
            const cardContainer = this.closest('.character-container');
            const characterCard = cardContainer.querySelector('.character-select-card');
            
            // Show loading state
            this.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Rerolling...';
            characterCard.style.opacity = '0.6';
            
            // Fetch a new random character
            fetch('/api/random_character')
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Update image
                        const cardImg = characterCard.querySelector('img');
                        cardImg.src = data.image_url;
                        
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
                        
                        // Update select button data attribute
                        const selectBtn = cardContainer.querySelector('.select-character-btn');
                        if (selectBtn) {
                            selectBtn.dataset.characterId = data.id;
                        }
                        
                        // Update hidden input
                        const checkbox = cardContainer.querySelector('.character-checkbox');
                        if (checkbox) {
                            checkbox.value = data.id;
                            checkbox.id = `character${data.id}`;
                        }
                        
                        // Show toast notification
                        showToast('Character Updated', 'A new character has been loaded!');
                    } else {
                        showToast('Error', 'Failed to load a new character. Please try again.');
                    }
                    
                    // Reset button
                    this.innerHTML = '<i class="fas fa-dice me-1"></i> Reroll Character';
                })
                .catch(error => {
                    console.error('Error fetching random character:', error);
                    this.innerHTML = '<i class="fas fa-dice me-1"></i> Reroll Character';
                });
            
            // Show loading state
            characterCard.style.opacity = '0.5';
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
            
            // Fetch a random character
            fetch('/api/random_character')
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Update the character card
                        characterCard.dataset.id = data.id;
                        characterCard.querySelector('img').src = data.image_url;
                        characterNameElement.textContent = data.name;
                        
                        // Update character traits
                        traitsContainer.innerHTML = '';
                        if (data.character_traits && data.character_traits.length > 0) {
                            data.character_traits.forEach(trait => {
                                const traitBadge = document.createElement('span');
                                traitBadge.className = 'trait-badge';
                                traitBadge.textContent = trait;
                                traitsContainer.appendChild(traitBadge);
                            });
                        }
                        
                        // Update checkbox
                        const checkbox = cardContainer.querySelector('.character-checkbox');
                        checkbox.value = data.id;
                        checkbox.id = `character${data.id}`;
                        
                        // Update select button
                        const selectBtn = cardContainer.querySelector('.select-character-btn');
                        selectBtn.dataset.characterId = data.id;
                        
                        // Reset selection state
                        checkbox.checked = false;
                        characterCard.querySelector('.selection-indicator').style.display = 'none';
                        
                        // Show toast notification
                        showToast('Character Updated', 'A new character has been loaded!');
                    } else {
                        showToast('Error', 'Failed to load a new character. Please try again.');
                    }
                })
                .catch(error => {
                    console.error('Error fetching random character:', error);
                    showToast('Error', 'Failed to load a new character. Please try again.');
                })
                .finally(() => {
                    // Reset button state
                    characterCard.style.opacity = '1';
                    this.innerHTML = '<i class="fas fa-dice me-1"></i> Reroll Character';
                });
        });
    });
    
    // Handle direct character selection buttons
    const selectCharacterButtons = document.querySelectorAll('.select-character-btn');
    selectCharacterButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const characterId = this.dataset.characterId;
            const card = document.querySelector(`.character-select-card[data-id="${characterId}"]`);
            const checkbox = document.getElementById(`character${characterId}`);
            const selectionIndicator = card.querySelector('.selection-indicator');
            
            // Toggle selection
            if (checkbox.checked) {
                checkbox.checked = false;
                selectionIndicator.style.display = 'none';
            } else {
                checkbox.checked = true;
                selectionIndicator.style.display = 'block';
            }
            
            updateSelectedImagesInput();
        });
    });
    
    // Form submission
    storyForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Check if at least one character is selected
        const selectedCharactersCount = document.querySelectorAll('.character-checkbox:checked').length;
        if (selectedCharactersCount !== 1) {
            characterSelectionError.style.display = 'block';
            return;
        }
        
        // Hide error message if shown
        characterSelectionError.style.display = 'none';
        
        // Show loading state
        generateStoryBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Generating Story...';
        generateStoryBtn.disabled = true;
        
        // Update selected images input
        updateSelectedImagesInput();
        
        // Submit the form
        const formData = new FormData(this);
        fetch('/generate_story', {
            method: 'POST',
            body: formData,
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success && data.redirect) {
                window.location.href = data.redirect;
            } else {
                showToast('Error', data.error || 'Failed to generate story');
                // Reset button state
                generateStoryBtn.innerHTML = '<i class="fas fa-pen-fancy me-2"></i>Begin Your Adventure';
                generateStoryBtn.disabled = false;
            }
        })
        .catch(error => {
            console.error('Error generating story:', error);
            showToast('Error', 'Failed to generate story. Please try again.');
            // Reset button state
            generateStoryBtn.innerHTML = '<i class="fas fa-pen-fancy me-2"></i>Begin Your Adventure';
            generateStoryBtn.disabled = false;
        });
    });
    
    // Toast notification function
    function showToast(title, message) {
        const toastEl = document.getElementById('notificationToast');
        const toast = new bootstrap.Toast(toastEl);
        
        document.getElementById('toastTitle').textContent = title;
        document.getElementById('toastMessage').textContent = message;
        
        toast.show();
    }
});
