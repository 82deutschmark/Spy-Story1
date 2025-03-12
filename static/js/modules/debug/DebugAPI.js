/**
 * DebugAPI.js - API utilities for the debug interface
 */

class DebugAPI {
    static async get(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`API Error (${response.status}): ${errorText}`);
                throw new Error(`API Error: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error("API Request failed:", error);
            throw error;
        }
    }

    static async analyzeImage(imageUrl) {
        try {
            const formData = new FormData();
            formData.append('image_url', imageUrl);

            const response = await fetch('/debug/generate', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`API Error (${response.status}): ${errorText}`);
                throw new Error(`API Error: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Image analysis error:', error);
            //DebugUtils.showToast('Analysis Error', error.message, true); //Preserving original toast, assuming DebugUtils exists.
            throw error;
        }
    }

    static async post(url, data) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`API Error (${response.status}): ${errorText}`);
                throw new Error(`API Error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error("API Request failed:", error);
            throw error;
        }
    }

    static async delete(url, data = null) {
        try {
            const options = {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                }
            };

            if (data) {
                options.body = JSON.stringify(data);
            }

            const response = await fetch(url, options);

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`API Error (${response.status}): ${errorText}`);
                throw new Error(`API Error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error("API Request failed:", error);
            throw error;
        }
    }
}

export default DebugAPI;