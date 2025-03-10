
/**
 * Debug API Module
 * Handles API communication for the debug interface
 */
import DebugUtils from './DebugUtils.js';

export default {
    /**
     * Make GET request to endpoint
     * @param {string} url - API endpoint
     * @returns {Promise} - Promise resolving to response data
     */
    async get(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('API GET error:', error);
            DebugUtils.showToast('API Error', error.message, true);
            throw error;
        }
    },

    /**
     * Make POST request to endpoint
     * @param {string} url - API endpoint
     * @param {object} data - Request data
     * @returns {Promise} - Promise resolving to response data
     */
    async post(url, data) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('API POST error:', error);
            DebugUtils.showToast('API Error', error.message, true);
            throw error;
        }
    },

    /**
     * Delete resource
     * @param {string} url - API endpoint
     * @returns {Promise} - Promise resolving to response data
     */
    async delete(url) {
        try {
            const response = await fetch(url, { method: 'DELETE' });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('API DELETE error:', error);
            DebugUtils.showToast('API Error', error.message, true);
            throw error;
        }
    }
};
