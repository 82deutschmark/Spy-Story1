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

    // Handle form submission with progress bar
    if (storyForm) {
        storyForm.addEventListener('submit', async function(e) {
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

            // Create and show progress bar
            const progressBar = createProgressBar();

            // Show loading state
            generateStoryBtn.disabled = true;
            generateStoryBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Generating Story...';

            try {
                // Simulate progress while story generates
                let progress = 0;
                const progressInterval = setInterval(() => {
                    progress += 5;
                    if (progress <= 90) {
                        updateProgress(progressBar, progress);
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

                // Clear progress interval
                clearInterval(progressInterval);

                if (data.success && data.redirect) {
                    // Show 100% progress before redirect
                    updateProgress(progressBar, 100);
                    setTimeout(() => {
                        window.location.href = data.redirect;
                    }, 500);
                } else {
                    throw new Error(data.error || 'Failed to generate story');
                }
            } catch (error) {
                showToast('Error', error.message);
                // Reset button state
                generateStoryBtn.disabled = false;
                generateStoryBtn.innerHTML = '<i class="fas fa-pen-fancy me-2"></i>Begin Your Adventure';
                // Remove progress bar on error
                removeProgressBar(progressBar);
            }
        });
    }
});