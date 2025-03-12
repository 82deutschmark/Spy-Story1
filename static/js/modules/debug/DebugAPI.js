
/**
 * DebugAPI.js - API utils for the debug interface
 */
const DebugAPI = {
    /**
     * Make a GET request to the API
     * @param {string} url The URL to fetch
     * @returns {Promise<Object>} The response data
     */
    get(url) {
        return fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log("API GET success:", url);
                return data;
            })
            .catch(error => {
                console.error("API GET error:", error);
                return { success: false, error: error.message };
            });
    },

    /**
     * Make a POST request to the API
     * @param {string} url The URL to fetch
     * @param {Object} data The data to send
     * @returns {Promise<Object>} The response data
     */
    post(url, data) {
        return fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log("API POST success:", url);
                return data;
            })
            .catch(error => {
                console.error("API POST error:", error);
                return { success: false, error: error.message };
            });
    },

    /**
     * Make a PUT request to the API
     * @param {string} url The URL to fetch
     * @param {Object} data The data to send
     * @returns {Promise<Object>} The response data
     */
    put(url, data) {
        return fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log("API PUT success:", url);
                return data;
            })
            .catch(error => {
                console.error("API PUT error:", error);
                return { success: false, error: error.message };
            });
    },

    /**
     * Make a DELETE request to the API
     * @param {string} url The URL to fetch
     * @returns {Promise<Object>} The response data
     */
    delete(url) {
        return fetch(url, {
            method: 'DELETE',
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log("API DELETE success:", url);
                return data;
            })
            .catch(error => {
                console.error("API DELETE error:", error);
                return { success: false, error: error.message };
            });
    }
};

// Export the API
export default DebugAPI;
