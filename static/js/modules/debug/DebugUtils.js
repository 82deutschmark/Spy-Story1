/**
 * DebugUtils.js - Utility functions for the debug interface
 */
const DebugUtils = {
    showToast(title, message, isError = false) {
        const toast = document.getElementById('notificationToast');
        const toastTitle = document.getElementById('toastTitle');
        const toastMessage = document.getElementById('toastMessage');

        if (!toast || !toastTitle || !toastMessage) {
            console.error('Toast elements not found');
            return;
        }

        // Set toast content
        toastTitle.textContent = title;
        toastMessage.textContent = message;

        // Set toast type (error or success)
        if (isError) {
            toast.classList.add('bg-danger', 'text-white');
        } else {
            toast.classList.remove('bg-danger', 'text-white');
        }

        // Show the toast
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
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
    },
    formatTimestamp(date) {
        return new Date(date).toLocaleString();
    }
};