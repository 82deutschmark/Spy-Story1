/**
 * API utility functions
 */
import { dom } from './dom.js';

export const api = {
    /**
     * Make a GET request
     * @param {string} url - Request URL
     * @returns {Promise<any>} - Response data
     */
    async get(url) {
        try {
            const response = await fetch(url);
            return await response.json();
        } catch (error) {
            console.error('API GET error:', error);
            throw error;
        }
    },

    /**
     * Make a POST request
     * @param {string} url - Request URL
     * @param {object} data - Request data
     * @returns {Promise<any>} - Response data
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
            throw error;
        }
    },

    /**
     * Submit a form with FormData
     * @param {string} url - Request URL
     * @param {FormData} formData - Form data
     * @returns {Promise<any>} - Response data
     */
    async submitForm(url, formData) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                body: formData
            });
            return await response.json();
        } catch (error) {
            console.error('API form submit error:', error);
            throw error;
        }
    }
};