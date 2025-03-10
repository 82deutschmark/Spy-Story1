/**
 * LoadingManager.js - Unified loading indicator management
 */
class LoadingManager {
    constructor() {
        this.activeLoaders = new Map();
        this.nextLoaderId = 1;
    }

    /**
     * Create a loading overlay
     * @param {string} message The loading message to display
     * @param {string|Element} target Optional target element or selector (defaults to body)
     * @returns {Object} Loading context with ID and methods
     */
    createLoadingOverlay(message = 'Loading...', target = null) {
        const id = `loader-${this.nextLoaderId++}`;
        const targetElement = target ? 
            (typeof target === 'string' ? document.querySelector(target) : target) : 
            document.body;

        // Create overlay container
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.id = id;
        overlay.innerHTML = `
            <div class="loading-content">
                <div class="spinner-border text-light" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <div class="loading-message mt-3">${message}</div>
                <div class="progress mt-3" style="width: 200px; height: 10px;">
                    <div class="progress-bar" role="progressbar" style="width: 0%;" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
                </div>
            </div>
        `;

        // Apply styles
        overlay.style.position = 'absolute';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
        overlay.style.display = 'flex';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.style.zIndex = '1000';

        // Apply relative positioning to target if needed
        if (targetElement !== document.body) {
            const currentPosition = window.getComputedStyle(targetElement).position;
            if (currentPosition === 'static') {
                targetElement.style.position = 'relative';
            }
        }

        // Add overlay to target
        targetElement.appendChild(overlay);

        // Save context
        const context = {
            id,
            overlay,
            targetElement,
            updateMessage: (newMessage) => this.updateLoadingMessage(id, newMessage),
            updateProgress: (percent) => this.updateLoadingPercent(id, percent),
            remove: (callback) => this.removeLoadingOverlay(id, callback)
        };

        this.activeLoaders.set(id, context);
        return context;
    }

    /**
     * Update the loading message
     * @param {string} id The loader ID
     * @param {string} message The new message
     */
    updateLoadingMessage(id, message) {
        const loader = this.activeLoaders.get(id);
        if (!loader) return;

        const messageElement = loader.overlay.querySelector('.loading-message');
        if (messageElement) {
            messageElement.textContent = message;
        }
    }

    /**
     * Update the loading progress percentage
     * @param {string} id The loader ID
     * @param {number} percent The progress percentage (0-100)
     */
    updateLoadingPercent(id, percent) {
        const loader = this.activeLoaders.get(id);
        if (!loader) return;

        const progressBar = loader.overlay.querySelector('.progress-bar');
        if (progressBar) {
            const clampedPercent = Math.min(100, Math.max(0, percent));
            progressBar.style.width = `${clampedPercent}%`;
            progressBar.setAttribute('aria-valuenow', clampedPercent);
        }
    }

    /**
     * Remove a loading overlay
     * @param {string} id The loader ID
     * @param {Function} callback Optional callback after removal
     */
    removeLoadingOverlay(id, callback) {
        const loader = this.activeLoaders.get(id);
        if (!loader) return;

        // Fade out animation
        loader.overlay.style.transition = 'opacity 0.3s ease';
        loader.overlay.style.opacity = '0';

        setTimeout(() => {
            if (loader.overlay.parentNode) {
                loader.overlay.parentNode.removeChild(loader.overlay);
            }
            this.activeLoaders.delete(id);

            if (typeof callback === 'function') {
                callback();
            }
        }, 300);
    }

    /**
     * Show loading state on a button
     * @param {Element|string} button Button element or selector
     * @param {string} loadingText Text to show during loading
     * @returns {Function} Function to restore the button
     */
    showButtonLoading(button, loadingText = 'Loading...') {
        const buttonElement = typeof button === 'string' ? 
            document.querySelector(button) : button;

        if (!buttonElement) return () => {};

        const originalHTML = buttonElement.innerHTML;
        const originalDisabled = buttonElement.disabled;

        buttonElement.innerHTML = `
            <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            <span>${loadingText}</span>
        `;
        buttonElement.disabled = true;

        return (restoreText = originalHTML) => {
            buttonElement.innerHTML = restoreText;
            buttonElement.disabled = originalDisabled;
        };
    }
}

// Create a global instance
const loadingManager = new LoadingManager();

// Export to global scope for now
window.LoadingManager = loadingManager;
export default loadingManager;