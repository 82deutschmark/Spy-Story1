/**
 * API utility functions
 */
import { dom } from './dom.js';

export const api = {
    /**
     * Make a GET request
     * @param {string} url - URL to fetch
     * @returns {Promise<Object>} - Response data
     */
    async get(url) {
        try {
            const response = await fetch(url);
            return await response.json();
        } catch (error) {
            console.error('API GET error:', error);
            dom.showToast('Error', 'Failed to fetch data from server');
            throw error;
        }
    },

    /**
     * Make a POST request
     * @param {string} url - URL to post to
     * @param {Object} data - Data to send
     * @returns {Promise<Object>} - Response data
     */
    async post(url, data) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(data)
            });
            return await response.json();
        } catch (error) {
            console.error('API POST error:', error);
            dom.showToast('Error', 'Failed to send data to server');
            throw error;
        }
    },

    /**
     * Submit a form with FormData
     * @param {string} url - URL to post to
     * @param {FormData} formData - Form data to send
     * @returns {Promise<Object>} - Response data
     */
    async submitForm(url, formData) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            return await response.json();
        } catch (error) {
            console.error('Form submission error:', error);
            dom.showToast('Error', 'Failed to submit form');
            throw error;
        }
    }
};