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
 * - Toast notifications
 * - General UI notifications
 * 
 * Integration Points:
 * -----------------
 * - DOM Elements: Creates and manages notification elements
 * - Bootstrap: Uses Bootstrap toast components
 * - CSS Dependencies: Requires notification-related CSS classes
 * 
 * Usage Guidelines:
 * ---------------
 * 1. Maintain consistent styling with existing UI components
 * 2. Keep toast messages concise and user-friendly
 * 3. Ensure proper error state handling in UI feedback
 * 
 * Common Usage Patterns:
 * -------------------
 * 1. Notifications:
 *    ```js
 *    UIUtils.showToast('Success', 'Operation completed');
 *    ```
 */

/**
 * UI Utilities Module
 * Handles UI interactions like notifications and toasts
 */
export const UIUtils = {
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

export function extractStoryData(responseData) {
    const narrative = responseData.narrative_text || (responseData.stories && responseData.stories.narrative_text) || "";
    const choices = responseData.choices || (responseData.stories && responseData.stories.choices) || [];
    return { narrative, choices };
}