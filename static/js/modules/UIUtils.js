/**
 * UI Utilities Module
 * Handles UI interactions like overlays, notifications and toasts
 */
export const UIUtils = {
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
        overlay.className = 'loading-overlay';
        
        const content = document.createElement('div');
        content.className = 'loading-content';
        
        const spinner = document.createElement('div');
        spinner.className = 'spinner-border text-light';
        spinner.setAttribute('role', 'status');
        
        const messageElement = document.createElement('div');
        messageElement.className = 'loading-message';
        messageElement.textContent = message;
        
        const progressContainer = document.createElement('div');
        progressContainer.className = 'progress mt-3';
        progressContainer.style.width = '200px';
        
        const progressBar = document.createElement('div');
        progressBar.className = 'progress-bar';
        progressBar.setAttribute('role', 'progressbar');
        progressBar.style.width = '0%';
        
        progressContainer.appendChild(progressBar);
        content.appendChild(spinner);
        content.appendChild(messageElement);
        content.appendChild(progressContainer);
        overlay.appendChild(content);
        
        // Add to document
        document.body.appendChild(overlay);
        return progressBar;
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
        const toast = document.getElementById('notificationToast');
        const toastTitle = document.getElementById('toastTitle');
        const toastMessage = document.getElementById('toastMessage');
        
        if (toast && toastTitle && toastMessage) {
            toastTitle.textContent = title;
            toastMessage.textContent = message;
            
            const bsToast = new bootstrap.Toast(toast);
            bsToast.show();
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

export default UIUtils;