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
            dom.showToast('Error', 'Please enter an image URL', true);
            return null;
        }

        const loadingPercent = dom.createLoadingOverlay('Analyzing image...');

        try {
            // Create form data for the request
            const formData = new FormData();
            formData.append('image_url', imageUrl);

            const response = await api.postForm('/generate', formData);

            if (!response) {
                throw new Error('No response received from server');
            }

            if (response.error) {
                throw new Error(response.error);
            }

            if (!response.success) {
                throw new Error('Failed to analyze image');
            }
            
            // Return with analysis data and image URL
            return {
                analysis: response.analysis,
                imageUrl: response.image_url,
                description: response.description,
                savedToDb: response.saved_to_db || false
            };
        } catch (error) {
            console.error('Image analysis error:', error);
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
        if (!data.imageUrl || !data.analysis) {
            dom.showToast('Error', 'Missing image URL or analysis data', true);
            return false;
        }

        const loadingPercent = dom.createLoadingOverlay('Saving to database...');

        try {
            // Make sure the analysis is a proper object, not a string
            let analysisData = data.analysis;
            if (typeof data.analysis === 'string') {
                try {
                    analysisData = JSON.parse(data.analysis);
                } catch (parseError) {
                    console.error('Failed to parse analysis JSON:', parseError);
                    throw new Error('Invalid analysis data format');
                }
            }
            
            // Ensure image_type is set
            if (!analysisData.image_type) {
                // Try to determine image type from data
                if (analysisData.character && typeof analysisData.character === 'object') {
                    analysisData.image_type = 'character';
                } else if (analysisData.scene_type || analysisData.setting) {
                    analysisData.image_type = 'scene';
                } else {
                    // Default to character if we can't determine
                    analysisData.image_type = 'character';
                }
            }
            
            console.log('Saving analysis to database:', {
                image_url: data.imageUrl,
                analysis: analysisData
            });
                
            const response = await api.post('/save_analysis', {
                image_url: data.imageUrl,
                analysis: analysisData
            });

            if (!response) {
                throw new Error('No response received from server');
            }

            if (response.error) {
                throw new Error(response.error);
            }

            dom.showToast('Success', 'Analysis saved successfully');
            return true;
        } catch (error) {
            console.error('Save to database error:', error);
            dom.showToast('Error', error.message, true);
            return false;
        } finally {
            dom.removeLoadingOverlay(loadingPercent);
        }
    }
};