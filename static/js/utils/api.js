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
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    /**
     * Make a POST request to the server
     * @param {string} url - The endpoint URL
     * @param {Object} data - The data to send
     * @returns {Promise} - The response promise
     */
    post: async (url, data = {}) => {
        console.log('Making POST request to:', url, 'with data:', data);
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(data)
            });
            const jsonResponse = await response.json();
            console.log('Received response:', jsonResponse);
            return jsonResponse;
        } catch (error) {
            console.error('API Error:', error);
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
        console.log('Making POST form request to:', url);
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: formData
            });
            const jsonResponse = await response.json();
            console.log('Received form response:', jsonResponse);
            return jsonResponse;
        } catch (error) {
            console.error('API Error:', error);
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
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }
};