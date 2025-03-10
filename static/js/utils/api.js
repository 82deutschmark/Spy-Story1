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