
/**
 * UIUtils.js - UI-related utility functions
 */
import DOMUtils from './DOMUtils.js';
import LoadingManager from './LoadingManager.js';
import EventManager from './EventManager.js';

class UIUtils {
    constructor() {
        this.toastContainer = null;
        this.activeToasts = new Set();
    }
    
    /**
     * Initialize the UI utilities
     */
    init() {
        this.createToastContainer();
    }
    
    /**
     * Create a container for toast notifications
     */
    createToastContainer() {
        // Check if container already exists
        if (this.toastContainer) return;
        
        this.toastContainer = DOMUtils.createElement('div', {
            className: 'toast-container position-fixed bottom-0 end-0 p-3',
            style: 'z-index: 1100;'
        });
        
        document.body.appendChild(this.toastContainer);
    }
    
    /**
     * Show a toast notification
     * @param {string} title The title of the toast
     * @param {string} message The message to display
     * @param {string} type The type of toast (success, error, info, warning)
     * @param {number} duration How long to show the toast in ms
     */
    showToast(title, message, type = 'success', duration = 3000) {
        if (!this.toastContainer) {
            this.createToastContainer();
        }
        
        // Map type to Bootstrap color class
        const typeMap = {
            'success': 'text-bg-success',
            'error': 'text-bg-danger',
            'warning': 'text-bg-warning',
            'info': 'text-bg-info'
        };
        
        const bgClass = typeMap[type] || 'text-bg-primary';
        const toastId = `toast-${Date.now()}-${Math.round(Math.random() * 1000)}`;
        
        // Create toast element
        const toast = DOMUtils.createElement('div', {
            className: `toast ${bgClass}`,
            id: toastId,
            role: 'alert',
            'aria-live': 'assertive',
            'aria-atomic': 'true'
        });
        
        toast.innerHTML = `
            <div class="toast-header">
                <strong class="me-auto">${title}</strong>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        `;
        
        // Add to DOM
        this.toastContainer.appendChild(toast);
        
        // Initialize Bootstrap toast
        const bsToast = new bootstrap.Toast(toast, {
            autohide: true,
            delay: duration
        });
        
        // Track active toasts
        this.activeToasts.add(toastId);
        
        // Show toast
        bsToast.show();
        
        // Clean up when hidden
        toast.addEventListener('hidden.bs.toast', () => {
            if (this.toastContainer.contains(toast)) {
                this.toastContainer.removeChild(toast);
            }
            this.activeToasts.delete(toastId);
        });
        
        return toastId;
    }
    
    /**
     * Hide a toast by ID
     * @param {string} toastId The ID of the toast to hide
     */
    hideToast(toastId) {
        const toast = DOMUtils.getElement(`#${toastId}`);
        if (toast) {
            const bsToast = bootstrap.Toast.getInstance(toast);
            if (bsToast) {
                bsToast.hide();
            }
        }
    }
    
    /**
     * Create a loading overlay
     * @param {string} message Loading message
     * @param {string|Element} target Target element (optional)
     * @returns {Object} Loading context
     */
    createLoadingOverlay(message, target) {
        return LoadingManager.createLoadingOverlay(message, target);
    }
    
    /**
     * Update the loading message
     * @param {Object} context Loading context
     * @param {string} message New message
     */
    updateLoadingMessage(context, message) {
        if (context && context.id) {
            LoadingManager.updateLoadingMessage(context.id, message);
        }
    }
    
    /**
     * Update loading percentage
     * @param {Object} context Loading context
     * @param {number} percent Percentage (0-100)
     */
    updateLoadingPercent(context, percent) {
        if (context && context.id) {
            LoadingManager.updateLoadingPercent(context.id, percent);
        }
    }
    
    /**
     * Remove a loading overlay
     * @param {Object} context Loading context
     * @param {Function} callback Optional callback
     */
    removeLoadingOverlay(context, callback) {
        if (context && context.id) {
            LoadingManager.removeLoadingOverlay(context.id, callback);
        }
    }
    
    /**
     * Show loading state on a button
     * @param {Element|string} button Button element or selector
     * @param {string} loadingText Text to show while loading
     * @returns {Function} Function to restore button
     */
    showButtonLoading(button, loadingText) {
        return LoadingManager.showButtonLoading(button, loadingText);
    }
    
    /**
     * Highlight character names in text
     * @param {string} text The text to process
     * @param {Object} characters Map of character names to data
     * @returns {string} HTML with highlighted character names
     */
    highlightCharacterNames(text, characters) {
        if (!text || !characters) return text;
        
        const names = Object.keys(characters).sort((a, b) => b.length - a.length);
        if (names.length === 0) return text;
        
        let processedText = text;
        names.forEach(name => {
            const characterData = characters[name];
            if (!characterData) return;
            
            const regex = new RegExp(`\\b${name}\\b`, 'g');
            processedText = processedText.replace(regex, match => {
                return `<span class="character-highlight" data-character-id="${characterData.id || ''}" data-character-name="${name}">${match}</span>`;
            });
        });
        
        return processedText;
    }
    
    /**
     * Trigger a custom event
     * @param {string} eventName Event name
     * @param {Object} data Event data
     */
    triggerEvent(eventName, data) {
        EventManager.emit(eventName, data);
        EventManager.triggerDOMEvent(eventName, data);
    }
}

// Create a global instance
const uiUtils = new UIUtils();

// Initialize on DOM load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => uiUtils.init());
} else {
    uiUtils.init();
}

// Export to global scope for now
window.UIUtils = uiUtils;
export default uiUtils;
