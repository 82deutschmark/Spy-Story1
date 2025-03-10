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
        console.log('Starting image analysis for URL:', imageUrl);

        if (!imageUrl) {
            dom.showToast('Error', 'Please enter an image URL', true);
            return null;
        }

        const loadingPercent = dom.createLoadingOverlay('Analyzing image...');

        try {
            console.log('Making API request to /generate');
            const response = await api.post('/generate', {
                image_url: imageUrl
            });

            console.log('Received API response:', response);

            if (response.success) {
                console.log('Analysis successful:', response.analysis);
                return {
                    analysis: response.analysis,
                    imageUrl: response.image_url,
                    savedToDb: response.saved_to_db || false
                };
            } else {
                throw new Error(response.error || 'Failed to analyze image');
            }
        } catch (error) {
            console.error('Error in image analysis:', error);
            dom.showToast('Error', error.message, true);
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
        console.log('Attempting to save analysis to database:', data);

        if (!data.imageUrl || !data.analysis) {
            dom.showToast('Error', 'No image URL or analysis found', true);
            return false;
        }

        const loadingPercent = dom.createLoadingOverlay('Saving analysis...');

        try {
            const response = await api.post('/save_analysis', {
                image_url: data.imageUrl,
                analysis: data.analysis
            });

            console.log('Save response:', response);

            if (response.error) {
                throw new Error(response.error);
            }

            dom.showToast('Success', 'Analysis saved to database');
            return true;
        } catch (error) {
            console.error('Error saving analysis:', error);
            dom.showToast('Error', `Failed to save analysis: ${error.message}`, true);
            return false;
        } finally {
            dom.removeLoadingOverlay(loadingPercent);
        }
    }
};