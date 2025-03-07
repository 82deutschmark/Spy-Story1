
document.addEventListener('DOMContentLoaded', function() {
    // Get all story choice buttons
    const choiceButtons = document.querySelectorAll('.story-choice-btn');
    const loadingOverlay = document.getElementById('loadingOverlay');
    
    // Add event listeners to choice buttons
    choiceButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Show loading overlay
            if (loadingOverlay) {
                loadingOverlay.style.display = 'flex';
            }
            
            // Get data from button attributes
            const choice = this.getAttribute('data-choice');
            const context = this.getAttribute('data-context');
            const storyId = this.getAttribute('data-story-id');
            
            // Get character image IDs
            const characterImages = [];
            document.querySelectorAll('.character-card').forEach(card => {
                const imageId = card.getAttribute('data-image-id');
                if (imageId) {
                    characterImages.push(imageId);
                }
            });
            
            // Prepare form data
            const formData = new FormData();
            formData.append('previous_choice', choice);
            formData.append('story_context', context);
            characterImages.forEach(id => {
                formData.append('selected_images[]', id);
            });
            
            // Send AJAX request
            fetch('/generate_story', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Redirect to the new story page
                    window.location.href = `/storyboard/${data.story_id}`;
                } else {
                    throw new Error(data.error || 'Failed to generate story');
                }
            })
            .catch(error => {
                console.error('Error generating story:', error);
                alert('Error: ' + error.message);
                
                // Hide loading overlay
                if (loadingOverlay) {
                    loadingOverlay.style.display = 'none';
                }
            });
        });
    });
});
