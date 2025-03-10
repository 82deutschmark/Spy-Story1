/**
 * API utilities for making requests to the server
 */

export const api = {
    /**
     * Make a GET request to the server
     * @param {string} url - The endpoint URL
     * @returns {Promise} - The response promise
     */
    get: async (url) => {
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('GET request failed:', error);
            throw error;
        }
    },

    /**
     * Make a POST request with JSON data
     * @param {string} url - The endpoint URL
     * @param {Object} data - The data to send
     * @returns {Promise} - The response promise
     */
    post: async (url, data = {}) => {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('POST request failed:', error);
            throw error;
        }
    },

    /**
     * Make a POST request with FormData
     * @param {string} url - The endpoint URL
     * @param {FormData} formData - The form data to send
     * @returns {Promise} - The response promise
     */
    postForm: async (url, formData) => {
        try {
            if (!(formData instanceof FormData)) {
                throw new Error('Invalid FormData object');
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('POST form request failed:', error);
            throw error;
        }
    },

    /**
     * Make a DELETE request to the server
     * @param {string} url - The endpoint URL
     * @returns {Promise} - The response promise
     */
    delete: async (url) => {
        try {
            const response = await fetch(url, {
                method: 'DELETE',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('DELETE request failed:', error);
            throw error;
        }
    }
};
/**
 * API utility functions
 */
import { dom } from './dom.js';

export const api = {
    /**
     * Send a POST request with form data
     * @param {string} url - URL to send request to
     * @param {FormData} formData - Form data to send
     * @param {string} loadingMessage - Message to display during loading
     * @returns {Promise} - Promise resolving to response data
     */
    async postForm(url, formData, loadingMessage = 'Processing...') {
        const loadingPercent = dom.addLoadingOverlay(loadingMessage);
        
        let progress = 0;
        const progressInterval = setInterval(() => {
            if (progress < 90) {
                progress += 5;
                dom.updateLoadingPercent(loadingPercent, progress);
            }
        }, 500);
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            
            const data = await response.json();
            
            clearInterval(progressInterval);
            dom.updateLoadingPercent(loadingPercent, 100);
            
            // Wait a moment to show 100% before removing overlay
            setTimeout(() => {
                dom.removeLoadingOverlay(loadingPercent);
            }, 300);
            
            return data;
        } catch (error) {
            clearInterval(progressInterval);
            dom.removeLoadingOverlay(loadingPercent);
            throw error;
        }
    }
};
