document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('imageForm');
    const resultDiv = document.getElementById('result');
    const contentDiv = document.getElementById('generatedContent');
    const generateBtn = document.getElementById('generateBtn');
    const copyBtn = document.getElementById('copyBtn');
    const toast = new bootstrap.Toast(document.getElementById('notificationToast'));
    
    function showNotification(title, message, success = true) {
        document.getElementById('toastTitle').textContent = title;
        document.getElementById('toastMessage').textContent = message;
        document.getElementById('notificationToast').classList.toggle('bg-success', success);
        document.getElementById('notificationToast').classList.toggle('bg-danger', !success);
        toast.show();
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Generating...';
        
        try {
            const response = await fetch('/generate', {
                method: 'POST',
                body: new FormData(form)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                contentDiv.textContent = data.caption;
                resultDiv.style.display = 'block';
                showNotification('Success', 'Instagram post generated successfully!', true);
            } else {
                showNotification('Error', data.error || 'Failed to generate post', false);
            }
        } catch (error) {
            showNotification('Error', 'An error occurred while generating the post', false);
        } finally {
            generateBtn.disabled = false;
            generateBtn.innerHTML = '<i class="fas fa-magic me-2"></i>Generate Post';
        }
    });

    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(contentDiv.textContent)
            .then(() => showNotification('Success', 'Copied to clipboard!', true))
            .catch(() => showNotification('Error', 'Failed to copy text', false));
    });
});
document.addEventListener('DOMContentLoaded', function() {
    const imageForm = document.getElementById('imageForm');
    const generateBtn = document.getElementById('generateBtn');
    const resultDiv = document.getElementById('result');
    const generatedContent = document.getElementById('generatedContent');
    const copyBtn = document.getElementById('copyBtn');
    const toast = new bootstrap.Toast(document.getElementById('notificationToast'));
    const toastTitle = document.getElementById('toastTitle');
    const toastMessage = document.getElementById('toastMessage');

    if (imageForm) {
        imageForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Show loading state
            generateBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Generating...';
            generateBtn.disabled = true;
            resultDiv.style.display = 'none';
            
            const formData = new FormData(imageForm);
            
            fetch('/generate', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                generateBtn.innerHTML = '<i class="fas fa-magic me-2"></i>Generate Post';
                generateBtn.disabled = false;
                
                if (data.error) {
                    // Show error toast
                    toastTitle.textContent = 'Error';
                    toastMessage.textContent = data.error;
                    toast.show();
                } else {
                    // Display the result
                    resultDiv.style.display = 'block';
                    generatedContent.textContent = data.caption;
                    
                    // Show success toast
                    toastTitle.textContent = 'Success';
                    toastMessage.textContent = 'Post generated successfully!';
                    toast.show();
                }
            })
            .catch(error => {
                console.error('Error:', error);
                generateBtn.innerHTML = '<i class="fas fa-magic me-2"></i>Generate Post';
                generateBtn.disabled = false;
                
                // Show error toast
                toastTitle.textContent = 'Error';
                toastMessage.textContent = 'Failed to generate post. Please try again.';
                toast.show();
            });
        });
    }
    
    if (copyBtn) {
        copyBtn.addEventListener('click', function() {
            navigator.clipboard.writeText(generatedContent.textContent)
                .then(() => {
                    toastTitle.textContent = 'Success';
                    toastMessage.textContent = 'Copied to clipboard!';
                    toast.show();
                })
                .catch(err => {
                    console.error('Could not copy text: ', err);
                    toastTitle.textContent = 'Error';
                    toastMessage.textContent = 'Failed to copy to clipboard';
                    toast.show();
                });
        });
    }
});
document.addEventListener('DOMContentLoaded', function() {
    // Character selection functionality
    const characterCards = document.querySelectorAll('.character-select-card');
    const characterCheckboxes = document.querySelectorAll('.character-checkbox');
    const selectedCharactersContainer = document.querySelector('.selected-characters-container');
    const selectedCharactersList = document.querySelector('.selected-characters-list');
    const storyForm = document.getElementById('storyForm');
    const generateStoryBtn = document.getElementById('generateStoryBtn');
    const characterSelectionError = document.getElementById('characterSelectionError');
    
    // Image analysis form
    const imageForm = document.getElementById('imageForm');
    const resultDiv = document.getElementById('result');
    const generatedContent = document.getElementById('generatedContent');
    const copyBtn = document.getElementById('copyBtn');
    const notificationToast = document.getElementById('notificationToast');
    
    // Track selected characters
    let selectedCharacters = [];
    const MAX_CHARACTERS = 3;
    
    // Character selection
    if (characterCards.length > 0) {
        characterCards.forEach((card, index) => {
            card.addEventListener('click', function(e) {
                // Prevent triggering when clicking the checkbox itself
                if (e.target.type !== 'checkbox') {
                    const checkbox = characterCheckboxes[index];
                    checkbox.checked = !checkbox.checked;
                    updateCharacterSelection(checkbox);
                }
            });
        });
        
        characterCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                updateCharacterSelection(this);
            });
        });
    }
    
    function updateCharacterSelection(checkbox) {
        const characterId = checkbox.value;
        const card = checkbox.closest('.character-select-card');
        
        if (checkbox.checked) {
            // If already selected MAX_CHARACTERS, uncheck the newest one
            if (selectedCharacters.length >= MAX_CHARACTERS) {
                checkbox.checked = false;
                showToast('Selection limit reached', `You can only select up to ${MAX_CHARACTERS} characters.`);
                return;
            }
            
            // Add to selected characters
            card.classList.add('selected');
            const characterName = card.querySelector('.card-title').textContent;
            const characterImg = card.querySelector('img').src;
            
            selectedCharacters.push({
                id: characterId,
                name: characterName,
                img: characterImg
            });
        } else {
            // Remove from selected characters
            card.classList.remove('selected');
            selectedCharacters = selectedCharacters.filter(char => char.id !== characterId);
        }
        
        updateSelectedCharactersDisplay();
    }
    
    function updateSelectedCharactersDisplay() {
        if (selectedCharacters.length > 0) {
            selectedCharactersContainer.style.display = 'block';
            selectedCharactersList.innerHTML = '';
            
            selectedCharacters.forEach(char => {
                const pill = document.createElement('div');
                pill.className = 'selected-character-pill';
                pill.innerHTML = `
                    <img src="${char.img}" alt="${char.name}">
                    <span>${char.name}</span>
                    <span class="remove-character" data-id="${char.id}">×</span>
                `;
                selectedCharactersList.appendChild(pill);
            });
            
            // Add remove character functionality
            document.querySelectorAll('.remove-character').forEach(btn => {
                btn.addEventListener('click', function() {
                    const characterId = this.getAttribute('data-id');
                    const checkbox = document.querySelector(`.character-checkbox[value="${characterId}"]`);
                    if (checkbox) {
                        checkbox.checked = false;
                        updateCharacterSelection(checkbox);
                    }
                });
            });
        } else {
            selectedCharactersContainer.style.display = 'none';
        }
    }
    
    // Form submission for generating story
    if (storyForm) {
        storyForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Validate character selection
            if (selectedCharacters.length !== MAX_CHARACTERS) {
                characterSelectionError.style.display = 'block';
                characterSelectionError.textContent = `Please select exactly ${MAX_CHARACTERS} characters for your story.`;
                return;
            }
            
            characterSelectionError.style.display = 'none';
            
            // Add selected characters to form
            const formData = new FormData(storyForm);
            selectedCharacters.forEach(char => {
                formData.append('selected_images[]', char.id);
            });
            
            // Show loading state
            generateStoryBtn.disabled = true;
            generateStoryBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Generating...';
            
            // Submit form
            fetch(storyForm.action, {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    window.location.href = `/storyboard/${data.story_id}`;
                } else {
                    throw new Error(data.error || 'An error occurred while generating the story.');
                }
            })
            .catch(error => {
                showToast('Error', error.message);
                generateStoryBtn.disabled = false;
                generateStoryBtn.innerHTML = '<i class="fas fa-pen-fancy me-2"></i>Begin Your Adventure';
            });
        });
    }
    
    // Image analysis form (debug functionality)
    if (imageForm) {
        imageForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const imageUrl = formData.get('image_url');
            
            if (!imageUrl) {
                showToast('Error', 'Please enter an image URL.');
                return;
            }
            
            // Show loading state
            const generateBtn = document.getElementById('generateBtn');
            generateBtn.disabled = true;
            generateBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Analyzing...';
            
            fetch('/generate', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Display the results
                    resultDiv.style.display = 'block';
                    generatedContent.textContent = JSON.stringify(data.analysis, null, 2);
                } else {
                    throw new Error(data.error || 'An error occurred during analysis.');
                }
            })
            .catch(error => {
                showToast('Error', error.message);
            })
            .finally(() => {
                // Reset button state
                generateBtn.disabled = false;
                generateBtn.innerHTML = '<i class="fas fa-magic me-2"></i>Analyze Image';
            });
        });
        
        // Copy to clipboard functionality
        if (copyBtn) {
            copyBtn.addEventListener('click', function() {
                const content = generatedContent.textContent;
                navigator.clipboard.writeText(content)
                    .then(() => {
                        showToast('Success', 'Content copied to clipboard!');
                    })
                    .catch(err => {
                        showToast('Error', 'Failed to copy: ' + err);
                    });
            });
        }
    }
    
    // Toast notification function
    function showToast(title, message) {
        const toast = new bootstrap.Toast(notificationToast);
        document.getElementById('toastTitle').textContent = title;
        document.getElementById('toastMessage').textContent = message;
        toast.show();
    }
});
