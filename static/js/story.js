/**
 * Story generation and choice handling module
 */
import { api } from './utils/api.js';
import { dom } from './utils/dom.js';

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

export const story = {
    /**
     * Generate a new story based on form data
     * @param {FormData} formData - Form data with story parameters
     */
    async generate(formData) {
        // Get the button to update its state
        const generateBtn = document.getElementById('generateStoryBtn');
        if (generateBtn) {
            generateBtn.disabled = true;
            generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Generating Story...';
        }

        try {
            // Check if at least one character is selected
            const selectedImages = formData.getAll('selected_images[]');
            if (!selectedImages.length) {
                const characterSelectionError = document.getElementById('characterSelectionError');
                if (characterSelectionError) {
                    characterSelectionError.style.display = 'block';
                    characterSelectionError.textContent = 'Please select a character for your story';
                }

                dom.showToast('Selection Needed', 'Please select a character before continuing');

                // Re-enable the button
                if (generateBtn) {
                    generateBtn.disabled = false;
                    generateBtn.innerHTML = '<i class="fas fa-pen-fancy me-2"></i>Begin Your Adventure';
                }

                return;
            }

            // Hide any error messages
            const characterSelectionError = document.getElementById('characterSelectionError');
            if (characterSelectionError) {
                characterSelectionError.style.display = 'none';
            }

            // Send the form data to the server
            const data = await api.postForm('/generate_story', formData, 'Generating your adventure...');

            if (data.success && data.redirect) {
                // Redirect to the new story
                window.location.href = data.redirect;
            } else {
                throw new Error(data.error || 'Failed to generate story');
            }
        } catch (error) {
            console.error('Error generating story:', error);
            dom.showToast('Error', error.message || 'Failed to generate story', true);

            // Re-enable the button
            if (generateBtn) {
                generateBtn.disabled = false;
                generateBtn.innerHTML = '<i class="fas fa-pen-fancy me-2"></i>Begin Your Adventure';
            }
        }
    },

    /**
     * Make a story choice
     * @param {FormData} formData - Form data for the choice
     * @param {Object} currencyReq - Currency requirements, if any
     */
    async makeChoice(formData, currencyReq) {
        try {
            // Submit form data
            const data = await api.postForm('/generate_story', formData, 'Continuing your story...');

            if (data.success && data.redirect) {
                // Redirect to the new story segment
                window.location.href = data.redirect;
            } else {
                throw new Error(data.error || 'Failed to continue story');
            }
        } catch (error) {
            console.error('Error making choice:', error);
            dom.showToast('Error', error.message || 'Failed to continue the story', true);
        }
    }
};