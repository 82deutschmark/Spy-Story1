document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the index page with the form
    const generateStoryForm = document.getElementById('generateStoryForm');
    if (generateStoryForm) {
        generateStoryForm.addEventListener('submit', function(e) {
            e.preventDefault();
            submitStoryForm();
        });
    }

    // Character selection
    const characterCards = document.querySelectorAll('.character-card');
    characterCards.forEach(card => {
        card.addEventListener('click', function() {
            // Toggle selection
            this.classList.toggle('selected');

            // Update hidden input
            const imageId = this.getAttribute('data-id');
            let selectedImages = document.querySelectorAll('input[name="selected_images[]"]');

            // If no selected_images inputs exist yet, create one
            if (selectedImages.length === 0) {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = 'selected_images[]';
                input.value = imageId;
                generateStoryForm.appendChild(input);
            } else {
                // Otherwise, update the existing one
                selectedImages[0].value = imageId;
            }

            // Visual feedback - make only one card selected
            characterCards.forEach(otherCard => {
                if (otherCard !== this) {
                    otherCard.classList.remove('selected');
                }
            });
        });
    });

    // Custom option toggles
    const customToggles = document.querySelectorAll('.custom-toggle');
    customToggles.forEach(toggle => {
        toggle.addEventListener('change', function() {
            const targetId = this.getAttribute('data-target');
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                if (this.checked) {
                    targetElement.classList.remove('d-none');
                } else {
                    targetElement.classList.add('d-none');
                }
            }
        });
    });
});

function submitStoryForm() {
    // Show loading state
    const generateStoryBtn = document.getElementById('generateStoryBtn');
    if (generateStoryBtn) {
        generateStoryBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Generating...';
        generateStoryBtn.disabled = true;
    }

    // Get form data
    const form = document.getElementById('generateStoryForm');
    const formData = new FormData(form);

    // Check if at least one character is selected
    if (!formData.has('selected_images[]')) {
        showToast('Please select a character for your adventure!', 'warning');
        if (generateStoryBtn) {
            generateStoryBtn.innerHTML = '<i class="fas fa-pen-fancy me-2"></i>Begin Your Adventure';
            generateStoryBtn.disabled = false;
        }
        return;
    }

    // Send request
    fetch('/generate_story', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            showToast(data.error, 'danger');
            if (generateStoryBtn) {
                generateStoryBtn.innerHTML = '<i class="fas fa-pen-fancy me-2"></i>Begin Your Adventure';
                generateStoryBtn.disabled = false;
            }
        } else if (data.success) {
            // Redirect to storyboard
            window.location.href = `/storyboard/${data.story_id}`;
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showToast('An error occurred while generating your story. Please try again.', 'danger');
        if (generateStoryBtn) {
            generateStoryBtn.innerHTML = '<i class="fas fa-pen-fancy me-2"></i>Begin Your Adventure';
            generateStoryBtn.disabled = false;
        }
    });
}

function showToast(message, type) {
    const toastEl = document.getElementById('notificationToast');
    const toastBodyEl = document.getElementById('toastMessage');
    const toastTitleEl = document.getElementById('toastTitle');

    if (!toastEl || !toastBodyEl) {
        console.error('Toast elements not found in the DOM');
        alert(message); // Fallback to alert if toast elements don't exist
        return;
    }

    // Set content
    if (toastBodyEl) toastBodyEl.textContent = message;

    // Set title based on type
    if (toastTitleEl) {
        if (type === 'danger') {
            toastTitleEl.textContent = 'Error';
        } else if (type === 'warning') {
            toastTitleEl.textContent = 'Warning';
        } else {
            toastTitleEl.textContent = 'Notification';
        }
    }

    // Show toast
    const toast = new bootstrap.Toast(toastEl);
    toast.show();
}