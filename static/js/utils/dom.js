/**
 * DOM manipulation utilities
 */

export const dom = {
    /**
     * Create a loading overlay with progress indicator
     * @param {string} message - The loading message to display
     * @returns {HTMLElement} - The loading percentage element
     */
    createLoadingOverlay: (message) => {
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="loading-content">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="loading-message">${message}</p>
                <div class="loading-progress">
                    <div class="progress">
                        <div class="progress-bar" role="progressbar" style="width: 0%"></div>
                    </div>
                    <span class="loading-percent">0%</span>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        return overlay.querySelector('.loading-percent');
    },

    /**
     * Update the loading percentage display
     * @param {HTMLElement} element - The loading percentage element
     * @param {number} percent - The percentage to display
     */
    updateLoadingPercent: (element, percent) => {
        if (!element) return;
        const progress = Math.min(100, Math.max(0, percent));
        element.textContent = `${progress}%`;
        const progressBar = element.closest('.loading-overlay').querySelector('.progress-bar');
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }
    },

    /**
     * Remove a loading overlay
     * @param {HTMLElement} element - Any element within the loading overlay
     */
    removeLoadingOverlay: (element) => {
        if (!element) return;
        const overlay = element.closest('.loading-overlay');
        if (overlay) {
            overlay.remove();
        }
    },

    /**
     * Show a toast notification
     * @param {string} title - The toast title
     * @param {string} message - The toast message
     * @param {boolean} isError - Whether this is an error message
     */
    showToast: (title, message, isError = false) => {
        const toastTitle = document.getElementById('toastTitle');
        const toastMessage = document.getElementById('toastMessage');
        const toast = document.getElementById('notificationToast');

        if (toastTitle && toastMessage && toast) {
            toastTitle.textContent = title;
            toastMessage.textContent = message;

            const toastElement = document.getElementById('notificationToast');
            if (isError) {
                toastElement.classList.add('bg-danger', 'text-white');
            } else {
                toastElement.classList.remove('bg-danger', 'text-white');
            }

            const bsToast = new bootstrap.Toast(toast);
            bsToast.show();
        }
    }
};
