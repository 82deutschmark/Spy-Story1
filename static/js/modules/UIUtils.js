/**
 * UIUtils.js - UI Utility Functions Module
 * ======================================
 * 
 * !!! IMPORTANT - READ BEFORE MODIFYING !!!
 * This module provides core UI functionality used throughout the application.
 * Many components depend on these utilities for consistent UI behavior.
 * 
 * Key Features:
 * ------------
 * - Loading overlays and animations
 * - Toast notifications
 * - Loading percentage displays
 * - General UI notifications
 * 
 * Integration Points:
 * -----------------
 * - DOM Elements: Creates and manages overlay elements
 * - Bootstrap: Uses Bootstrap toast components
 * - CSS Dependencies: Requires loading-related CSS classes
 * 
 * Usage Guidelines:
 * ---------------
 * 1. ALWAYS clean up UI elements after use (especially overlays)
 * 2. Maintain consistent styling with existing UI components
 * 3. Keep toast messages concise and user-friendly
 * 4. Ensure proper error state handling in UI feedback
 * 
 * Common Usage Patterns:
 * -------------------
 * 1. Loading States:
 *    ```js
 *    const loadingEl = UIUtils.createLoadingOverlay('Loading...');
 *    try {
 *      // async operation
 *    } finally {
 *      UIUtils.removeLoadingOverlay(loadingEl);
 *    }
 *    ```
 * 
 * 2. Notifications:
 *    ```js
 *    UIUtils.showToast('Success', 'Operation completed');
 *    ```
 */

/**
 * UI Utilities Module
 * Handles UI interactions like overlays, notifications and toasts
 */
export const UIUtils = {
    /**
     * Creates a loading overlay on the page
     * @param {string} message - Optional message to display
     * @return {HTMLElement} - The loading percentage element
     */
    createLoadingOverlay(message = 'Loading...') {
        // Remove any existing overlay first
        this.removeLoadingOverlay();

        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <div class="loading-percentage">0%</div>
                <div class="loading-message">${message}</div>
            </div>
        `;
        document.body.appendChild(overlay);
        overlay.style.display = 'flex';
        return overlay.querySelector('.loading-percentage');
    },

    /**
     * Updates the loading percentage
     * @param {HTMLElement} element - The loading percentage element
     * @param {number} percent - The percentage to display
     */
    updateLoadingPercent(element, percent) {
        if (element) {
            element.textContent = `${Math.round(percent)}%`;
        }
    },

    /**
     * Removes the loading overlay
     * @param {HTMLElement} element - Any element within the overlay
     */
    removeLoadingOverlay(element) {
        const overlay = element ? element.closest('.loading-overlay') : document.querySelector('.loading-overlay');
        if (overlay) {
            overlay.remove();
        }
    },

    /**
     * Shows a toast notification
     * @param {string} title - Toast title
     * @param {string} message - Toast message
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

// Export a default instance
export default UIUtils;