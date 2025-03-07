
document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements with null checks
    const storyForm = document.getElementById('storyForm');
    const characterCheckboxes = document.querySelectorAll('.character-checkbox');
    const selectedCharactersContainer = document.querySelector('.selected-characters-container');
    const selectedCharactersList = document.querySelector('.selected-characters-list');
    const generateStoryBtn = document.getElementById('generateStoryBtn');
    const characterSelectionError = document.getElementById('characterSelectionError');
    const rerollButtons = document.querySelectorAll('.reroll-btn');
    const notificationToast = document.getElementById('notificationToast');
    const toastTitle = document.getElementById('toastTitle');
    const toastMessage = document.getElementById('toastMessage');
    
    // Initialize toast if elements exist
    let toast;
    if (notificationToast) {
        toast = new bootstrap.Toast(notificationToast);
    }
    
    // Show notification
    function showNotification(title, message) {
        if (toastTitle && toastMessage && toast) {
            toastTitle.textContent = title;
            toastMessage.textContent = message;
            toast.show();
        }
    }
    
    // Handle character selection
    if (characterCheckboxes.length > 0 && selectedCharactersContainer && selectedCharactersList) {
        characterCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', updateSelectedCharacters);
        });
    }
    
    // Update selected characters
    function updateSelectedCharacters() {
        if (!selectedCharactersContainer || !selectedCharactersList) return;
        
        const selectedCharacters = [];
        characterCheckboxes.forEach(checkbox => {
            if (checkbox.checked) {
                const card = checkbox.closest('.character-select-card');
                if (card) {
                    selectedCharacters.push({
                        id: card.dataset.id,
                        name: card.querySelector('.card-title').textContent,
                        image: card.querySelector('img').src
                    });
                }
            }
        });
        
        // Update UI
        if (selectedCharacters.length > 0) {
            selectedCharactersContainer.style.display = 'block';
            selectedCharactersList.innerHTML = '';
            
            selectedCharacters.forEach(char => {
                const charElement = document.createElement('div');
                charElement.className = 'selected-character-item';
                charElement.innerHTML = `
                    <img src="${char.image}" alt="${char.name}" width="50">
                    <span>${char.name}</span>
                    <input type="hidden" name="selected_images[]" value="${char.id}">
                `;
                selectedCharactersList.appendChild(charElement);
            });
        } else {
            selectedCharactersContainer.style.display = 'none';
        }
        
        // Validate selection
        validateSelection();
    }
    
    // Validate character selection
    function validateSelection() {
        if (!characterSelectionError || !generateStoryBtn) return;
        
        const selectedCount = document.querySelectorAll('.character-checkbox:checked').length;
        const maxAllowed = 3; // Maximum allowed selection
        
        if (selectedCount > 0 && selectedCount <= maxAllowed) {
            characterSelectionError.style.display = 'none';
            generateStoryBtn.disabled = false;
        } else {
            characterSelectionError.style.display = 'block';
            generateStoryBtn.disabled = true;
        }
    }
    
    // Handle reroll buttons
    if (rerollButtons.length > 0) {
        rerollButtons.forEach(button => {
            button.addEventListener('click', function() {
                const cardIndex = this.dataset.cardIndex;
                showNotification('Rerolling Character', 'Generating a new character...');
                
                // Here you would typically send an AJAX request to regenerate the character
                // For now, we'll just simulate it
                setTimeout(() => {
                    showNotification('Character Updated', 'New character has been generated!');
                }, 1500);
            });
        });
    }
    
    // Form submission
    if (storyForm) {
        storyForm.addEventListener('submit', function(e) {
            const selectedCount = document.querySelectorAll('.character-checkbox:checked').length;
            const maxAllowed = 3; // Maximum allowed selection
            
            if (selectedCount === 0 || selectedCount > maxAllowed) {
                e.preventDefault();
                if (characterSelectionError) {
                    characterSelectionError.style.display = 'block';
                }
            }
        });
    }
});

document.addEventListener('DOMContentLoaded', function() {
    // Character selection elements
    const characterCards = document.querySelectorAll('.character-select-card');
    const characterCheckboxes = document.querySelectorAll('.character-checkbox');
    const rerollButtons = document.querySelectorAll('.reroll-btn');
    const storyForm = document.getElementById('storyForm');
    const generateStoryBtn = document.getElementById('generateStoryBtn');
    const characterSelectionError = document.getElementById('characterSelectionError');
    const notificationToast = document.getElementById('notificationToast');

    // Bootstrap toast instance
    const toast = new bootstrap.Toast(notificationToast);

    // Show toast notification
    function showToast(title, message) {
        document.getElementById('toastTitle').textContent = title;
        document.getElementById('toastMessage').textContent = message;
        toast.show();
    }

    // Character selection
    if (characterCards.length > 0) {
        characterCards.forEach((card, index) => {
            card.addEventListener('click', function(e) {
                // Prevent triggering when clicking the checkbox or reroll button
                if (e.target.type !== 'radio' && !e.target.closest('.reroll-btn')) {
                    const checkbox = characterCheckboxes[index];
                    checkbox.checked = true;
                }
            });
        });
    }

    // Reroll functionality
    if (rerollButtons.length > 0) {
        rerollButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();

                const cardIndex = this.getAttribute('data-card-index');
                const card = characterCards[cardIndex];
                const cardImage = card.querySelector('img');
                const cardTitle = card.querySelector('.card-title');
                const cardText = card.querySelector('.card-text');
                const traitsContainer = card.querySelector('.character-traits');
                const checkbox = card.querySelector('.character-checkbox');

                // Show loading state
                this.disabled = true;
                this.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
                cardImage.src = 'https://via.placeholder.com/400x250?text=Loading...';

                // Fetch a new random character
                fetch('/api/random_character')
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            // Update card with new character data
                            card.setAttribute('data-id', data.id);
                            cardImage.src = data.image_url;
                            cardTitle.textContent = data.name;
                            cardText.textContent = data.style;

                            // Update traits
                            traitsContainer.innerHTML = '';
                            if (data.character_traits && data.character_traits.length > 0) {
                                data.character_traits.forEach(trait => {
                                    const badge = document.createElement('span');
                                    badge.className = 'badge bg-primary me-1';
                                    badge.textContent = trait;
                                    traitsContainer.appendChild(badge);
                                });
                            }

                            // Update checkbox value
                            checkbox.value = data.id;
                            checkbox.id = 'character' + data.id;
                            checkbox.nextElementSibling.setAttribute('for', 'character' + data.id);

                            showToast('Success', 'Character rerolled successfully!');
                        } else {
                            throw new Error(data.error || 'Failed to get a new character');
                        }
                    })
                    .catch(error => {
                        showToast('Error', error.message);
                    })
                    .finally(() => {
                        // Reset button state
                        this.disabled = false;
                        this.innerHTML = '<i class="fas fa-dice me-1"></i>Reroll';
                    });
            });
        });
    }

    // Handle form submission
    if (storyForm) {
        storyForm.addEventListener('submit', function(e) {
            e.preventDefault();

            // Check if a character is selected
            const selectedCharacter = document.querySelector('input[name="selectedCharacter"]:checked');

            if (!selectedCharacter) {
                characterSelectionError.style.display = 'block';
                characterSelectionError.textContent = 'Please select a character for your story.';
                return;
            }

            // Hide any previous errors
            characterSelectionError.style.display = 'none';

            // Show loading state
            generateStoryBtn.disabled = true;
            generateStoryBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Generating Story...';

            // Create FormData and append selected character
            const formData = new FormData(this);

            // Ensure the selected character is included
            formData.set('selected_images[]', selectedCharacter.value);

            // Submit the form
            fetch('/generate_story', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Redirect to the storyboard page
                    window.location.href = '/storyboard/' + data.story_id;
                } else {
                    throw new Error(data.error || 'Failed to generate story');
                }
            })
            .catch(error => {
                showToast('Error', error.message);
                // Reset button state
                generateStoryBtn.disabled = false;
                generateStoryBtn.innerHTML = '<i class="fas fa-pen-fancy me-2"></i>Begin Your Adventure';
            });
        });
    }
});