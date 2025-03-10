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
     * Generate a new story
     * @param {FormData} formData - The form data for story generation
     * @returns {Promise<boolean>} - Success status
     */
    generate: async (formData) => {
        const loadingPercent = createLoadingOverlay('Generating your adventure...');
        let progress = 0;
        const progressInterval = setInterval(() => {
            if (progress < 90) {
                progress += 5;
                updateLoadingPercent(loadingPercent, progress);
            }
        }, 500);

        try {
            // Debug log form data
            console.log('Submitting form with data:', Array.from(formData.entries()));

            const data = await api.postForm('/generate_story', formData);
            clearInterval(progressInterval);

            if (data.success && data.redirect) {
                updateLoadingPercent(loadingPercent, 100);
                setTimeout(() => {
                    window.location.href = data.redirect;
                }, 500);
                return true;
            } else {
                throw new Error(data.error || 'Failed to generate story');
            }
        } catch (error) {
            console.error('Error generating story:', error);
            dom.showToast('Error', error.message || 'Failed to generate story', true);
            return false;
        } finally {
            clearInterval(progressInterval);
            removeLoadingOverlay(loadingPercent);
        }
    },

    /**
     * Process a story choice
     * @param {FormData} formData - The choice form data
     * @returns {Promise<boolean>} - Success status
     */
    makeChoice: async (formData) => {
        const loadingPercent = createLoadingOverlay('Processing your choice...');
        let progress = 0;
        const progressInterval = setInterval(() => {
            if (progress < 90) {
                progress += 5;
                updateLoadingPercent(loadingPercent, progress);
            }
        }, 500);

        try {
            const response = await api.postForm('/make_choice', formData);

            if (!response.success) {
                throw new Error(response.error || 'Failed to process choice');
            }

            updateLoadingPercent(loadingPercent, 100);
            setTimeout(() => {
                if (response.redirect) {
                    window.location.href = response.redirect;
                }
            }, 500);
            return true;
        } catch (error) {
            console.error('Error processing choice:', error);
            dom.showToast('Error', error.message || 'Failed to process your choice', true);
            return false;
        } finally {
            clearInterval(progressInterval);
            removeLoadingOverlay(loadingPercent);
        }
    }
};
/**
 * Story generation and interaction functionality
 */
import { dom } from './utils/dom.js';
import { api } from './utils/api.js';

export const story = {
    /**
     * Generate a new story
     * @param {FormData} formData - Form data for story generation
     */
    async generate(formData) {
        // Validate form data
        const selectedCharacters = formData.getAll('selected_images[]');
        if (selectedCharacters.length === 0) {
            dom.showToast('Selection Needed', 'Please select a character for your story', true);
            
            // Show error message if it exists
            const characterSelectionError = document.getElementById('characterSelectionError');
            if (characterSelectionError) {
                characterSelectionError.style.display = 'block';
                characterSelectionError.textContent = 'Please select a character for your story';
                window.scrollTo(0, 0);
            }
            return;
        }
        
        // Disable the generate button to prevent multiple submissions
        const generateBtn = document.getElementById('generateStoryBtn');
        if (generateBtn) {
            generateBtn.disabled = true;
            generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Generating Story...';
        }
        
        try {
            // Submit form data
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
