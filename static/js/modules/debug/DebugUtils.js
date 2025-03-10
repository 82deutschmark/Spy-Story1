
/**
 * Debug Utilities Module
 * Common utility functions for the debug interface
 */
export default {
    /**
     * Shows a toast notification
     * @param {string} title - Toast title
     * @param {string} message - Toast message content
     * @param {boolean} isError - Whether to show as error
     */
    showToast(title, message, isError = false) {
        const toastEl = document.getElementById('notificationToast');
        if (toastEl) {
            const toast = new bootstrap.Toast(toastEl);
            document.getElementById('toastTitle').textContent = title;
            document.getElementById('toastMessage').textContent = message;

            if (isError) {
                toastEl.classList.add('bg-danger', 'text-white');
            } else {
                toastEl.classList.remove('bg-danger', 'text-white');
            }

            toast.show();
        }
    },

    /**
     * Deep clone object to avoid reference issues
     * @param {object} obj - Object to clone
     * @returns {object} Cloned object
     */
    deepClone(obj) {
        try {
            return JSON.parse(JSON.stringify(obj));
        } catch (e) {
            console.error('Error cloning object:', e);
            return {};
        }
    },

    /**
     * Log object for debugging
     * @param {string} title - Log title
     * @param {object} data - Data to log
     */
    logDebug(title, data) {
        console.log(`${title}:`, data);
    },

    /**
     * Safely parse JSON
     * @param {string} text - Text to parse
     * @returns {object|null} Parsed object or null
     */
    safeParseJSON(text) {
        try {
            return JSON.parse(text);
        } catch (e) {
            console.error('Error parsing JSON:', e);
            this.showToast('Error', 'Failed to parse JSON: ' + e.message, true);
            return null;
        }
    }
};
