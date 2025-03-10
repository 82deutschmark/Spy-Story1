/**
 * API utility functions for making requests
 */
import { dom } from './dom.js';

export const api = {
    /**
     * Post form data to an endpoint
     * @param {string} url - API endpoint
     * @param {FormData} formData - Form data to submit
     * @param {string} loadingMessage - Message to show during loading
     * @returns {Promise} - Promise resolving to response data
     */
    async postForm(url, formData, loadingMessage = 'Processing...') {
        // Create loading overlay
        const loadingPercent = dom.createLoadingOverlay(loadingMessage);

        try {
            // Update progress to show activity
            dom.updateLoadingPercent(loadingPercent, 25);

            // Make the POST request
            const response = await fetch(url, {
                method: 'POST',
                body: formData
            });

            dom.updateLoadingPercent(loadingPercent, 75);

            // Parse the response
            const data = await response.json();

            dom.updateLoadingPercent(loadingPercent, 100);

            // Remove the loading overlay
            dom.removeLoadingOverlay(loadingPercent);

            return data;
        } catch (error) {
            // Remove loading overlay on error
            dom.removeLoadingOverlay(loadingPercent);
            throw error;
        }
    },

    /**
     * Make a GET request to an endpoint
     * @param {string} url - API endpoint
     * @param {boolean} showLoading - Whether to show loading overlay
     * @returns {Promise} - Promise resolving to response data
     */
    async get(url, showLoading = false) {
        let loadingPercent = null;

        if (showLoading) {
            loadingPercent = dom.createLoadingOverlay('Loading...');
            dom.updateLoadingPercent(loadingPercent, 25);
        }

        try {
            const response = await fetch(url);

            if (showLoading) {
                dom.updateLoadingPercent(loadingPercent, 75);
            }

            const data = await response.json();

            if (showLoading) {
                dom.updateLoadingPercent(loadingPercent, 100);
                dom.removeLoadingOverlay(loadingPercent);
            }

            return data;
        } catch (error) {
            if (showLoading && loadingPercent) {
                dom.removeLoadingOverlay(loadingPercent);
            }
            throw error;
        }
    }
};