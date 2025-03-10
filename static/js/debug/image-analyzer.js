/**
 * Image analysis module for handling image URL processing and analysis
 */
import { api } from '../utils/api.js';
import { dom } from '../utils/dom.js';

export const imageAnalyzer = {
    /**
     * Analyze an image URL
     * @param {string} imageUrl - URL of the image to analyze
     * @returns {Promise<Object>} Analysis result
     */
    analyze: async (imageUrl) => {
        if (!imageUrl) {
            dom.showToast('Error', 'Please enter an image URL', 'error');
            return null;
        }

        const loadingPercent = dom.createLoadingOverlay('Analyzing image...');
        
        try {
            const response = await api.post('/generate', {
                image_url: imageUrl
            });

            if (response.success) {
                return {
                    analysis: response.analysis,
                    imageUrl: response.image_url,
                    savedToDb: response.saved_to_db || false
                };
            } else {
                throw new Error(response.error || 'Failed to analyze image');
            }
        } catch (error) {
            dom.showToast('Error', error.message, 'error');
            return null;
        } finally {
            dom.removeLoadingOverlay(loadingPercent);
        }
    },

    /**
     * Save analysis to database
     * @param {Object} data - Analysis data to save
     * @returns {Promise<boolean>} Success status
     */
    saveToDatabase: async (data) => {
        if (!data.imageUrl || !data.analysis) {
            dom.showToast('Error', 'No image URL or analysis found', 'error');
            return false;
        }

        const loadingPercent = dom.createLoadingOverlay('Saving analysis...');

        try {
            const response = await api.post('/save_analysis', {
                image_url: data.imageUrl,
                analysis: data.analysis
            });

            if (response.error) {
                throw new Error(response.error);
            }

            dom.showToast('Success', 'Analysis saved to database', 'success');
            return true;
        } catch (error) {
            dom.showToast('Error', `Failed to save analysis: ${error.message}`, 'error');
            return false;
        } finally {
            dom.removeLoadingOverlay(loadingPercent);
        }
    }
};
