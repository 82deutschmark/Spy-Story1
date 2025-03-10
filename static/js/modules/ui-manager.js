
/**
 * UI Manager Module
 * Handles all UI-related operations, animations, and loading states
 */
const UI = (function() {
    // Track loading overlays
    let loadingOverlays = [];
    
    /**
     * Show a toast notification
     * @param {string} title - Title of the toast
     * @param {string} message - Message to display
     * @param {string} type - Type of toast (success, error, info)
     */
    function showToast(title, message, type = 'info') {
        // Use Bootstrap toast if available
        if (typeof bootstrap !== 'undefined' && bootstrap.Toast) {
            const toastEl = document.createElement('div');
            toastEl.className = `toast align-items-center text-white bg-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'primary'} border-0`;
            toastEl.setAttribute('role', 'alert');
            toastEl.setAttribute('aria-live', 'assertive');
            toastEl.setAttribute('aria-atomic', 'true');
            
            toastEl.innerHTML = `
                <div class="d-flex">
                    <div class="toast-body">
                        <strong>${title}</strong>: ${message}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
            `;
            
            document.body.appendChild(toastEl);
            const toast = new bootstrap.Toast(toastEl);
            toast.show();
            
            // Remove from DOM after hiding
            toastEl.addEventListener('hidden.bs.toast', () => {
                document.body.removeChild(toastEl);
            });
        } else {
            // Fallback to alert for environments without Bootstrap
            alert(`${title}: ${message}`);
        }
    }
    
    /**
     * Add a loading overlay to the page
     * @param {string} message - Message to display during loading
     * @returns {number} - Identifier for the overlay
     */
    function addLoadingOverlay(message = 'Loading...') {
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-message">${message}</div>
        `;
        
        document.body.appendChild(overlay);
        
        // Add to tracking array and return index
        loadingOverlays.push(overlay);
        return loadingOverlays.length - 1;
    }
    
    /**
     * Remove a loading overlay
     * @param {number} id - Overlay identifier to remove
     */
    function removeLoadingOverlay(id) {
        if (id >= 0 && id < loadingOverlays.length) {
            const overlay = loadingOverlays[id];
            if (overlay && overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
                loadingOverlays[id] = null;
            }
        }
    }
    
    /**
     * Handle animation of story content
     * @param {HTMLElement} container - Container to animate content in
     * @param {string} content - Content HTML to display
     */
    function animateStoryContent(container, content) {
        if (!container) return;
        
        // Apply fade-out effect
        container.classList.add('fade-out');
        
        // After fade out, update content and fade back in
        setTimeout(() => {
            container.innerHTML = content;
            container.classList.remove('fade-out');
            container.classList.add('fade-in');
            
            // Remove the fade-in class after animation completes
            setTimeout(() => {
                container.classList.remove('fade-in');
            }, 500);
        }, 300);
    }
    
    // Return public API
    return {
        showToast,
        addLoadingOverlay,
        removeLoadingOverlay,
        animateStoryContent
    };
})();

// Export the module
window.UI = UI;
