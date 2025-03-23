/**
 * ErrorHandler.js - Error Handling Utility
 * ======================================
 * 
 * This module provides a centralized way to handle and display errors across
 * the application. It supports both toast notifications and inline error messages.
 * 
 * Key Features:
 * ------------
 * - Toast notifications for temporary errors
 * - Inline error messages for form validation
 * - Error logging for debugging
 * - Consistent error display across the app
 * 
 * Integration Points:
 * -----------------
 * - Forms: Displays validation errors
 * - API: Shows error messages from server responses
 * - UI: Provides user feedback for errors
 * 
 * Usage:
 * -----
 * 1. Initialize with ErrorHandler.initialize()
 * 2. Use showError() for toast notifications
 * 3. Use showFormError() for form validation errors
 * 4. Use clearErrors() to clear error displays
 */

class ErrorHandler {
    constructor() {
        this.toastContainer = null;
        this.errorElements = new Map();
    }

    /**
     * Initialize the error handler
     * Sets up toast container and event listeners
     */
    initialize() {
        // Create toast container if it doesn't exist
        this.toastContainer = document.getElementById('toastContainer');
        if (!this.toastContainer) {
            this.toastContainer = document.createElement('div');
            this.toastContainer.id = 'toastContainer';
            this.toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
            document.body.appendChild(this.toastContainer);
        }

        // Listen for custom error events
        document.addEventListener('showError', (event) => {
            this.showError(event.detail.message, event.detail.type);
        });
    }

    /**
     * Show a toast notification error
     * @param {string} message - The error message to display
     * @param {string} type - The type of error (default: 'error')
     */
    showError(message, type = 'error') {
        const toast = document.createElement('div');
        toast.className = `toast align-items-center border-0`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');

        // Set background and text color based on type
        const bgColor = type === 'error' ? 'bg-danger' : 'bg-success';
        const textColor = 'text-black';

        toast.innerHTML = `
            <div class="d-flex ${bgColor} ${textColor} p-3 rounded">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;

        this.toastContainer.appendChild(toast);
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();

        // Remove toast after it's hidden
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    }

    /**
     * Show an inline form error message
     * @param {string} formId - The ID of the form
     * @param {string} message - The error message to display
     */
    showFormError(formId, message) {
        let errorElement = this.errorElements.get(formId);
        
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.className = 'alert alert-danger mt-3';
            errorElement.style.display = 'none';
            
            const form = document.getElementById(formId);
            if (form) {
                form.insertBefore(errorElement, form.firstChild);
                this.errorElements.set(formId, errorElement);
            }
        }

        errorElement.textContent = message;
        errorElement.style.display = 'block';
        window.scrollTo(0, 0);
    }

    /**
     * Show a field-specific error message
     * @param {string} fieldId - The ID of the form field
     * @param {string} message - The error message to display
     */
    showFieldError(fieldId, message) {
        const field = document.getElementById(fieldId);
        if (!field) return;

        // Remove any existing error message
        const existingError = field.nextElementSibling;
        if (existingError && existingError.classList.contains('invalid-feedback')) {
            existingError.remove();
        }

        // Add new error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'invalid-feedback';
        errorDiv.textContent = message;
        field.parentNode.insertBefore(errorDiv, field.nextSibling);
        field.classList.add('is-invalid');
    }

    /**
     * Clear all error messages for a form
     * @param {string} formId - The ID of the form
     */
    clearFormErrors(formId) {
        const errorElement = this.errorElements.get(formId);
        if (errorElement) {
            errorElement.style.display = 'none';
            errorElement.textContent = '';
        }

        // Clear field-specific errors
        const form = document.getElementById(formId);
        if (form) {
            form.querySelectorAll('.is-invalid').forEach(field => {
                field.classList.remove('is-invalid');
                const errorDiv = field.nextElementSibling;
                if (errorDiv && errorDiv.classList.contains('invalid-feedback')) {
                    errorDiv.remove();
                }
            });
        }
    }

    /**
     * Clear all error messages
     */
    clearAllErrors() {
        // Clear all form errors
        this.errorElements.forEach((_, formId) => {
            this.clearFormErrors(formId);
        });

        // Clear all toasts
        this.toastContainer.innerHTML = '';
    }

    /**
     * Log an error for debugging
     * @param {Error} error - The error object
     * @param {string} context - Additional context about the error
     */
    logError(error, context = '') {
        console.error(`Error${context ? ` in ${context}` : ''}:`, error);
        // Could add error reporting service integration here
    }
}

// Export the ErrorHandler class
export default ErrorHandler; 