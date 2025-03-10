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
     * Remove the loading overlay from the document
     * @param {HTMLElement} [percentageElement] - Optional element to update to 100% before removing
     */
    removeLoadingOverlay(percentageElement) {
        // If percentage element is provided, set it to 100% first
        if (percentageElement) {
            percentageElement.textContent = '100%';
        }

        // Remove all loading overlays after a short delay
        setTimeout(() => {
            const overlays = document.querySelectorAll('.loading-overlay');
            overlays.forEach(overlay => {
                overlay.remove();
            });
        }, 500);
    },

    /**
     * Shows a toast notification
     * @param {string} title - The title of the toast
     * @param {string} message - The message to display
     */
    static showToast(title, message) {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            const newToastContainer = document.createElement('div');
            newToastContainer.id = 'toast-container';
            newToastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
            document.body.appendChild(newToastContainer);
        }

        const toastId = 'toast-' + Date.now();
        const toastHTML = `
            <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="toast-header">
                    <strong class="me-auto">${title}</strong>
                    <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
                <div class="toast-body">
                    ${message}
                </div>
            </div>
        `;

        const toastContainerEl = document.getElementById('toast-container');
        toastContainerEl.insertAdjacentHTML('beforeend', toastHTML);

        const toastEl = document.getElementById(toastId);
        const toast = new bootstrap.Toast(toastEl, { animation: true, autohide: true, delay: 5000 });
        toast.show();
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