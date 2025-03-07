// Loading overlay functions
function createLoadingOverlay(message = 'Generating your story...') {
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
        <div class="loading-content">
            <div class="loading-spinner"></div>
            <h3>${message}</h3>
            <div class="loading-progress">
                <div class="loading-progress-bar"></div>
            </div>
            <p class="loading-status">Crafting your adventure...</p>
        </div>
    `;
    document.body.appendChild(overlay);
    overlay.style.display = 'flex';
    return overlay.querySelector('.loading-progress-bar');
}

function updateLoadingStatus(progressBar, progress, status) {
    progressBar.style.width = `${progress}%`;
    const statusEl = progressBar.closest('.loading-content').querySelector('.loading-status');
    if (statusEl) statusEl.textContent = status;
}

function removeLoadingOverlay(overlay) {
    overlay.closest('.loading-overlay').remove();
}

// Progress bar functions
function createProgressBar() {
    const container = document.createElement('div');
    container.className = 'progress-container';
    const bar = document.createElement('div');
    bar.className = 'progress-bar';
    container.appendChild(bar);
    document.body.appendChild(container);
    return bar;
}

function updateProgress(progressBar, progress) {
    progressBar.style.width = `${progress}%`;
}

function removeProgressBar(container) {
    container.parentElement.remove();
}

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
            button.addEventListener('click', async function(e) {
                e.preventDefault();
                e.stopPropagation();

                const cardIndex = this.getAttribute('data-card-index');
                const card = characterCards[cardIndex];
                const cardImage = card.querySelector('img');
                const traitsContainer = card.querySelector('.character-traits');
                const checkbox = card.querySelector('.character-checkbox');

                // Show loading state
                this.disabled = true;
                this.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
                cardImage.src = 'https://via.placeholder.com/400x250?text=Loading...';

                try {
                    const response = await fetch('/api/random_character');
                    const data = await response.json();

                    if (data.success) {
                        // Update the card with the new character
                        cardImage.src = data.image_url;

                        // Find the character name element within the container
                        const characterContainer = card.closest('.character-container');
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

                        showToast('Success', 'Character rerolled successfully!');
                    } else {
                        throw new Error(data.error || 'Failed to get a new character');
                    }
                } catch (error) {
                    showToast('Error', error.message);
                } finally {
                    // Reset button state
                    this.disabled = false;
                    this.innerHTML = '<i class="fas fa-dice me-1"></i>Reroll';
                }
            });
        });
    }

    // Handle form submission with enhanced loading UI
    if (storyForm) {
        storyForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const selectedCharacter = document.querySelector('input[name="selectedCharacter"]:checked');
            if (!selectedCharacter) {
                characterSelectionError.style.display = 'block';
                characterSelectionError.textContent = 'Please select a character for your story.';
                return;
            }

            characterSelectionError.style.display = 'none';

            // Create loading overlay
            const progressBar = createLoadingOverlay('Crafting your adventure...');
            generateStoryBtn.disabled = true;

            try {
                let progress = 0;
                const loadingStates = [
                    'Gathering inspiration...',
                    'Creating characters...',
                    'Weaving the narrative...',
                    'Adding dramatic elements...',
                    'Finalizing your story...'
                ];

                const progressInterval = setInterval(() => {
                    if (progress < 90) {
                        progress += 5;
                        const stateIndex = Math.floor((progress / 90) * loadingStates.length);
                        updateLoadingStatus(progressBar, progress, loadingStates[stateIndex]);
                    }
                }, 1000);

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
                    updateLoadingStatus(progressBar, 100, 'Story ready! Redirecting...');
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
                const overlay = progressBar.closest('.loading-overlay');
                if (overlay) overlay.remove();
            }
        });
    }

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
});