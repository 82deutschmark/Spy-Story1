
/**
 * LoadingManager.js - Unified loading indicator management
 */
const LoadingManager = {
  /**
   * Show a loading overlay with percentage indicator
   * @param {string} message - Loading message to display
   * @param {Element} container - Optional container to append to (defaults to body)
   * @returns {Object} Loading context with overlay and percent elements
   */
  showLoading(message = 'Loading...', container = document.body) {
    // Create the loading overlay
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    
    // Create the loading content
    const content = document.createElement('div');
    content.className = 'loading-content';
    
    // Add spinner icon
    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';
    spinner.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    content.appendChild(spinner);
    
    // Add message
    const messageElement = document.createElement('div');
    messageElement.className = 'loading-message';
    messageElement.textContent = message;
    content.appendChild(messageElement);
    
    // Add percentage indicator
    const percentContainer = document.createElement('div');
    percentContainer.className = 'loading-percent-container';
    
    const percentBar = document.createElement('div');
    percentBar.className = 'loading-percent-bar';
    
    const percentFill = document.createElement('div');
    percentFill.className = 'loading-percent-fill';
    percentFill.style.width = '0%';
    percentBar.appendChild(percentFill);
    
    const percentText = document.createElement('div');
    percentText.className = 'loading-percent-text';
    percentText.textContent = '0%';
    
    percentContainer.appendChild(percentBar);
    percentContainer.appendChild(percentText);
    content.appendChild(percentContainer);
    
    // Add content to overlay
    overlay.appendChild(content);
    
    // Add overlay to container
    container.appendChild(overlay);
    
    // Return context object for manipulation
    return {
      overlay,
      percentFill,
      percentText,
      message: messageElement
    };
  },
  
  /**
   * Update the loading percentage
   * @param {Object} context - Loading context from showLoading
   * @param {number} percent - Percentage complete (0-100)
   */
  updatePercent(context, percent) {
    if (!context || !context.percentFill || !context.percentText) return;
    
    const validPercent = Math.max(0, Math.min(100, Math.round(percent)));
    context.percentFill.style.width = `${validPercent}%`;
    context.percentText.textContent = `${validPercent}%`;
  },
  
  /**
   * Update the loading message
   * @param {Object} context - Loading context from showLoading
   * @param {string} message - New message to display
   */
  updateMessage(context, message) {
    if (!context || !context.message) return;
    context.message.textContent = message;
  },
  
  /**
   * Hide the loading overlay
   * @param {Object} context - Loading context from showLoading
   * @param {Function} callback - Optional callback after removal
   * @param {number} delay - Delay before removing the overlay (ms)
   */
  hideLoading(context, callback = null, delay = 300) {
    if (!context || !context.overlay) return;
    
    // Update to 100% for visual completion
    this.updatePercent(context, 100);
    
    // Fade out and remove after delay
    setTimeout(() => {
      context.overlay.classList.add('fade-out');
      
      setTimeout(() => {
        context.overlay.remove();
        if (callback && typeof callback === 'function') {
          callback();
        }
      }, 300);
    }, delay);
  },
  
  /**
   * Show button loading state
   * @param {Element} button - Button element
   * @param {string} loadingText - Text to show while loading
   * @param {string} iconClass - Optional icon class
   * @returns {Function} Function to restore the button
   */
  showButtonLoading(button, loadingText = 'Loading...', iconClass = 'fas fa-spinner fa-spin') {
    if (!button) return () => {};
    
    // Store original button content and state
    const originalHTML = button.innerHTML;
    const originalDisabled = button.disabled;
    
    // Update button to loading state
    button.disabled = true;
    button.innerHTML = `<i class="${iconClass} me-1"></i> ${loadingText}`;
    
    // Return function to restore button
    return function restoreButton(newText = null) {
      button.disabled = originalDisabled;
      button.innerHTML = newText ? newText : originalHTML;
    };
  }
};

// Add CSS for loading overlay
function addLoadingStyles() {
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    .loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.6);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
      opacity: 1;
      transition: opacity 0.3s ease;
    }
    
    .loading-overlay.fade-out {
      opacity: 0;
    }
    
    .loading-content {
      background-color: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      text-align: center;
      max-width: 80%;
      width: 300px;
    }
    
    .loading-spinner {
      font-size: 24px;
      margin-bottom: 10px;
      color: #0d6efd;
    }
    
    .loading-message {
      margin-bottom: 15px;
      font-weight: 500;
    }
    
    .loading-percent-container {
      margin-top: 15px;
    }
    
    .loading-percent-bar {
      height: 8px;
      background-color: #f0f0f0;
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 5px;
    }
    
    .loading-percent-fill {
      height: 100%;
      background-color: #0d6efd;
      transition: width 0.3s ease;
      width: 0%;
    }
    
    .loading-percent-text {
      font-size: 12px;
      color: #666;
    }
  `;
  document.head.appendChild(styleEl);
}

// Add the styles when the module is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', addLoadingStyles);
} else {
  addLoadingStyles();
}

// Export the module
export default LoadingManager;
