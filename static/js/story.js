/**
 * Story generation and choice handling module
 */
import { api } from './utils/api.js';
import { dom } from './utils/dom.js';

export const story = {
    /**
     * Generate a new story
     * @param {FormData} formData - The form data for story generation
     * @returns {Promise<boolean>} - Success status
     */
    generate: async (formData) => {
        const loadingPercent = dom.createLoadingOverlay('Generating your story...');
        let progress = 0;
        const progressInterval = setInterval(() => {
            if (progress < 90) {
                progress += 5;
                dom.updateLoadingPercent(loadingPercent, progress);
            }
        }, 500);

        try {
            // Get selected character IDs
            const selectedCharacters = document.querySelectorAll('.character-checkbox:checked');
            const selectedIds = Array.from(selectedCharacters).map(checkbox => checkbox.value);

            // Add selected character IDs to form data
            selectedIds.forEach(id => formData.append('selected_images[]', id));

            const data = await api.postForm('/generate_story', formData);
            clearInterval(progressInterval);

            if (data.success && data.redirect) {
                dom.updateLoadingPercent(loadingPercent, 100);
                setTimeout(() => {
                    window.location.href = data.redirect;
                }, 500);
                return true;
            } else {
                throw new Error(data.error || 'Failed to generate story');
            }
        } catch (error) {
            clearInterval(progressInterval);
            dom.showToast('Error', error.message || 'Failed to generate story', true);
            return false;
        } finally {
            dom.removeLoadingOverlay(loadingPercent);
        }
    },

    /**
     * Process a story choice
     * @param {FormData} formData - The choice form data
     * @returns {Promise<boolean>} - Success status
     */
    makeChoice: async (formData) => {
        const loadingPercent = dom.createLoadingOverlay('Processing your choice...');
        const isCustomChoice = formData.has('custom_choice');

        try {
            // Make the choice
            const response = await api.post('/make_choice', {
                choice_id: formData.get('choice_id'),
                custom_choice: isCustomChoice ? formData.get('custom_choice') : null
            });

            if (!response.success) {
                throw new Error(response.error || 'Failed to process choice');
            }

            // Generate next story part
            const storyData = await api.postForm('/generate_story', formData);

            if (storyData.success && storyData.redirect) {
                dom.updateLoadingPercent(loadingPercent, 100);
                setTimeout(() => {
                    window.location.href = storyData.redirect;
                }, 500);
                return true;
            } else {
                throw new Error(storyData.error || 'Failed to generate next story part');
            }
        } catch (error) {
            dom.showToast('Error', error.message || 'Failed to process your choice', true);
            return false;
        } finally {
            dom.removeLoadingOverlay(loadingPercent);
        }
    }
};