
/**
 * UI Utilities Module
 * Handles UI interactions like overlays, notifications and toasts
 */
export default {
    /**
     * Creates a loading overlay with a spinner and percentage
     * @param {string} message - Message to display in the overlay
     * @returns {HTMLElement} - The percentage element for updating
     */
    createLoadingOverlay(message = 'Loading...') {
        console.log('Creating loading overlay with message:', message);
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <div class="loading-message">${message}</div>
                <div class="loading-percentage">0%</div>
            </div>
        `;
        document.body.appendChild(overlay);
        overlay.style.display = 'flex';
        console.log('Loading overlay created');
        return overlay.querySelector('.loading-percentage');
    },

    /**
     * Updates the loading percentage display
     * @param {HTMLElement} element - The percentage element
     * @param {number} percent - Percentage to display
     */
    updateLoadingPercent(element, percent) {
        if (element) {
            console.log('Updating loading percent:', percent);
            element.textContent = `${Math.round(percent)}%`;
        } else {
            console.error('Loading percentage element not found');
        }
    },

    /**
     * Removes a loading overlay from the DOM
     * @param {HTMLElement} overlay - The percentage element within the overlay
     */
    removeLoadingOverlay(overlay) {
        console.log('Removing loading overlay');
        if (overlay && overlay.closest('.loading-overlay')) {
            overlay.closest('.loading-overlay').remove();
            console.log('Loading overlay removed');
        } else {
            console.error('Loading overlay not found for removal');
        }
    },

    /**
     * Shows a toast notification
     * @param {string} title - Toast title
     * @param {string} message - Toast message content
     */
    showToast(title, message) {
        const toastEl = document.getElementById('notificationToast');
        if (toastEl) {
            const toast = new bootstrap.Toast(toastEl);
            document.getElementById('toastTitle').textContent = title;
            document.getElementById('toastMessage').textContent = message;
            toast.show();
        }
    },

    /**
     * Alias for showToast for compatibility with older code
     * @param {string} title - Notification title
     * @param {string} message - Notification message content
     */
    showNotification(title, message) {
        this.showToast(title, message);
    }
};
