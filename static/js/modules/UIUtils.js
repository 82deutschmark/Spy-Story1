
/**
 * UIUtils.js - UI utility functions using standardized approach
 */
import DOMUtils from './DOMUtils.js';
import LoadingManager from './LoadingManager.js';
import EventManager from './EventManager.js';

const UIUtils = {
  /**
   * Initialize UI utilities
   */
  init() {
    // Initialize toast container if it doesn't exist
    this.initToastContainer();
    console.log('UIUtils initialized');
  },

  /**
   * Create a toast container if it doesn't exist
   */
  initToastContainer() {
    if (!document.getElementById('toast-container')) {
      const toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
      document.body.appendChild(toastContainer);
    }
  },

  /**
   * Show a toast notification
   * @param {string} title - Toast title
   * @param {string} message - Toast message
   * @param {string} type - Toast type (success, warning, error, info)
   */
  showToast(title, message, type = 'success') {
    // Initialize toast container if needed
    this.initToastContainer();
    
    // Get toast container
    const toastContainer = DOMUtils.getElement('#toast-container');
    
    // Create toast element
    const toastEl = document.createElement('div');
    toastEl.className = 'toast';
    toastEl.setAttribute('role', 'alert');
    toastEl.setAttribute('aria-live', 'assertive');
    toastEl.setAttribute('aria-atomic', 'true');
    
    // Set toast background color based on type
    let bgClass = 'bg-success';
    let iconClass = 'fa-check-circle';
    
    switch (type.toLowerCase()) {
      case 'warning':
        bgClass = 'bg-warning';
        iconClass = 'fa-exclamation-triangle';
        break;
      case 'error':
        bgClass = 'bg-danger';
        iconClass = 'fa-times-circle';
        break;
      case 'info':
        bgClass = 'bg-info';
        iconClass = 'fa-info-circle';
        break;
    }
    
    // Create toast content
    toastEl.innerHTML = `
      <div class="toast-header ${bgClass} text-white">
        <i class="fas ${iconClass} me-2"></i>
        <strong class="me-auto">${title}</strong>
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
      <div class="toast-body">${message}</div>
    `;
    
    // Add toast to container
    toastContainer.appendChild(toastEl);
    
    // Initialize and show toast
    const toast = new bootstrap.Toast(toastEl, { autohide: true, delay: 5000 });
    toast.show();
    
    // Remove toast after it's hidden
    toastEl.addEventListener('hidden.bs.toast', () => {
      toastEl.remove();
    });
  },
  
  /**
   * Show a loading overlay
   * @param {string} message - Loading message
   * @returns {Object} Loading context
   */
  createLoadingOverlay(message = 'Loading...') {
    return LoadingManager.showLoading(message);
  },
  
  /**
   * Update loading overlay percentage
   * @param {Object} loadingContext - Loading context
   * @param {number} percent - Percentage (0-100)
   */
  updateLoadingPercent(loadingContext, percent) {
    LoadingManager.updatePercent(loadingContext, percent);
  },
  
  /**
   * Remove loading overlay
   * @param {Object} loadingContext - Loading context
   * @param {Function} callback - Optional callback after removal
   */
  removeLoadingOverlay(loadingContext, callback) {
    LoadingManager.hideLoading(loadingContext, callback);
  },
  
  /**
   * Show button loading state
   * @param {Element|string} button - Button element or selector
   * @param {string} loadingText - Text to display while loading
   * @returns {Function} Function to restore button
   */
  showButtonLoading(button, loadingText = 'Loading...') {
    // If button is a selector, get the element
    const buttonEl = typeof button === 'string' ? DOMUtils.getElement(button) : button;
    return LoadingManager.showButtonLoading(buttonEl, loadingText);
  },
  
  /**
   * Disable a form
   * @param {Element|string} form - Form element or selector
   */
  disableForm(form) {
    const formEl = typeof form === 'string' ? DOMUtils.getElement(form) : form;
    if (!formEl) return;
    
    const inputs = DOMUtils.getElements('input, textarea, select, button', formEl);
    inputs.forEach(input => {
      input.disabled = true;
    });
  },
  
  /**
   * Enable a form
   * @param {Element|string} form - Form element or selector
   */
  enableForm(form) {
    const formEl = typeof form === 'string' ? DOMUtils.getElement(form) : form;
    if (!formEl) return;
    
    const inputs = DOMUtils.getElements('input, textarea, select, button', formEl);
    inputs.forEach(input => {
      input.disabled = false;
    });
  },
  
  /**
   * Trigger an event through the EventManager
   * @param {string} eventName - Name of the event
   * @param {any} data - Event data
   */
  triggerEvent(eventName, data = {}) {
    EventManager.publish(eventName, data);
  },
  
  /**
   * Subscribe to an event
   * @param {string} eventName - Name of the event
   * @param {Function} handler - Event handler
   * @returns {Object} Subscription object
   */
  onEvent(eventName, handler) {
    return EventManager.subscribe(eventName, handler);
  }
};

// Initialize on DOM load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => UIUtils.init());
} else {
  UIUtils.init();
}

// Export the module
export default UIUtils;
