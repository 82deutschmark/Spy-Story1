/**
 * DebugAPI.js - API communication for the debug interface
 */
import DebugUtils from './DebugUtils.js';

export default {
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

    async analyzeImage(imageUrl) {
        try {
            const formData = new FormData();
            formData.append('image_url', imageUrl);
            
            const response = await fetch('/debug/generate', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('Image analysis error:', error);
            DebugUtils.showToast('Analysis Error', error.message, true);
            throw error;
        }
    },

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