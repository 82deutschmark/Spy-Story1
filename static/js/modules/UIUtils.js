/**
 * UI Utilities Module
 * Handles UI interactions like overlays, notifications and toasts
 */
export default {
    /**
     * Creates a loading overlay on the page
     * @param {string} message - Optional message to display
     * @return {HTMLElement} - The created overlay element
     */
    createLoadingOverlay(message = 'Loading...') {
        // Remove any existing overlay first
        this.removeLoadingOverlay();

        // Create overlay elements
        const overlay = document.createElement('div');
        overlay.classList.add('loading-overlay');
        overlay.id = 'loadingOverlay';

        const spinner = document.createElement('div');
        spinner.classList.add('loading-spinner');

        const messageElement = document.createElement('div');
        messageElement.classList.add('loading-message');
        messageElement.textContent = message;

        const progressContainer = document.createElement('div');
        progressContainer.classList.add('loading-progress-container');

        const progressBar = document.createElement('div');
        progressBar.classList.add('loading-progress-bar');
        progressBar.id = 'loadingProgressBar';
        progressBar.style.width = '0%';

        progressContainer.appendChild(progressBar);

        // Assemble the overlay
        overlay.appendChild(spinner);
        overlay.appendChild(messageElement);
        overlay.appendChild(progressContainer);

        // Add to document
        document.body.appendChild(overlay);

        return overlay;
    },

    /**
     * Updates the loading percentage display
     * @param {HTMLElement} element - The percentage element
     * @param {number} percent - Percentage to display
     */
    updateLoadingPercent(element, percent) {
        if (element) {
            element.textContent = `${Math.round(percent)}%`;
        }
    },

    /**
     * Updates the loading progress bar
     * @param {number} percent - Progress percentage (0-100)
     */
    updateLoadingPercent(percent) {
        const progressBar = document.getElementById('loadingProgressBar');
        if (progressBar) {
            progressBar.style.width = `${percent}%`;
        }
    },

    /**
     * Removes the loading overlay
     */
    removeLoadingOverlay() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.add('fadeout');
            setTimeout(() => {
                overlay.remove();
            }, 500); // Allow time for animation
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