/**
 * DebugUtils.js - Utility functions for the debug interface
 */
export default {
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

    deepClone(obj) {
        try {
            return JSON.parse(JSON.stringify(obj));
        } catch (e) {
            console.error('Error cloning object:', e);
            return {};
        }
    },

    logDebug(title, data) {
        console.log(`${title}:`, data);
    },

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