
/**
 * Story management module
 */
import { dom } from './utils/dom.js';
import { api } from './utils/api.js';

export const story = {
    /**
     * Generate a new story based on form data
     * @param {FormData} formData - Form data with story parameters
     */
    async generate(formData) {
        // Create loading overlay
        const loadingPercent = dom.createLoadingOverlay('Generating your adventure...');
        
        try {
            // Get the button to update its state
            const generateBtn = document.getElementById('generateStoryBtn');
            if (generateBtn) {
                generateBtn.disabled = true;
                generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Generating Story...';
            }

            // Progress updates simulation
            let progress = 0;
            const interval = setInterval(() => {
                progress += 5;
                if (progress > 95) {
                    clearInterval(interval);
                    return;
                }
                dom.updateLoadingPercent(loadingPercent, progress);
            }, 700);

            // Submit form to server
            const response = await fetch('/generate_story', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            
            // Clear the interval
            clearInterval(interval);
            
            // Process the response
            const result = await response.json();
            
            if (response.ok && result.success) {
                // Show full progress before redirect
                dom.updateLoadingPercent(loadingPercent, 100);
                setTimeout(() => {
                    // Redirect to the generated story
                    window.location.href = result.redirect;
                }, 500);
            } else {
                // Show error and re-enable button
                dom.showToast('Error', result.error || 'Failed to generate story');
                if (generateBtn) {
                    generateBtn.disabled = false;
                    generateBtn.innerHTML = '<i class="fas fa-pen-fancy me-2"></i>Begin Your Adventure';
                }
                dom.removeLoadingOverlay(loadingPercent);
            }
        } catch (error) {
            console.error('Error generating story:', error);
            dom.showToast('Error', 'Failed to generate story');
            
            // Re-enable button
            const generateBtn = document.getElementById('generateStoryBtn');
            if (generateBtn) {
                generateBtn.disabled = false;
                generateBtn.innerHTML = '<i class="fas fa-pen-fancy me-2"></i>Begin Your Adventure';
            }
            
            dom.removeLoadingOverlay(loadingPercent);
        }
    },

    /**
     * Process a story choice
     * @param {FormData} formData - Form data with choice parameters
     * @param {Object} currencyRequirements - Currency requirements for the choice
     */
    async makeChoice(formData, currencyRequirements) {
        // Create loading overlay
        const loadingPercent = dom.createLoadingOverlay('Processing your choice...');
        
        try {
            // Progress updates simulation
            let progress = 0;
            const interval = setInterval(() => {
                progress += 8;
                if (progress > 95) {
                    clearInterval(interval);
                    return;
                }
                dom.updateLoadingPercent(loadingPercent, progress);
            }, 500);

            // Submit form to server
            const response = await fetch('/generate_story', {
                method: 'POST',
                body: formData
            });
            
            // Clear the interval
            clearInterval(interval);
            
            // Show full progress before redirect
            dom.updateLoadingPercent(loadingPercent, 100);
            
            // Handle response - simply reload with the new page
            if (response.ok) {
                setTimeout(() => {
                    window.location.href = response.url;
                }, 500);
            } else {
                const result = await response.json();
                dom.showToast('Error', result.error || 'Failed to process choice');
                dom.removeLoadingOverlay(loadingPercent);
            }
        } catch (error) {
            console.error('Error processing choice:', error);
            dom.showToast('Error', 'Failed to process choice');
            dom.removeLoadingOverlay(loadingPercent);
        }
    }
};
