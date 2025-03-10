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
     * Show a toast notification
     * @param {string} title - Toast title
     * @param {string} message - Toast message
     * @param {number} delay - Auto-hide delay in ms, 0 for no auto-hide
     * @returns {bootstrap.Toast} - The toast object for programmatic control
     */
    showToast(title, message, delay = 3000) {
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) {
            // Create toast container if it doesn't exist
            const newContainer = document.createElement('div');
            newContainer.id = 'toastContainer';
            newContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
            document.body.appendChild(newContainer);
        }

        const toastId = 'toast-' + Date.now();
        const toastHtml = `
            <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true" 
                ${delay > 0 ? `data-bs-delay="${delay}"` : ''}>
                <div class="toast-header">
                    <strong class="me-auto">${title}</strong>
                    <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
                <div class="toast-body">
                    ${message}
                </div>
            </div>
        `;

        const container = document.getElementById('toastContainer');
        container.insertAdjacentHTML('beforeend', toastHtml);

        const toastElement = document.getElementById(toastId);
        const toast = new bootstrap.Toast(toastElement, {
            autohide: delay > 0
        });
        toast.show();

        // Auto-remove after it's hidden
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });

        return toast;
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