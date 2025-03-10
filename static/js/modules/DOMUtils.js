
/**
 * DOMUtils.js - Standardized DOM manipulation utilities
 */
const DOMUtils = {
  /**
   * Get a single element using a selector
   * @param {string} selector - CSS selector
   * @param {Element} parent - Optional parent element to search within
   * @returns {Element|null} The found element or null
   */
  getElement(selector, parent = document) {
    return parent.querySelector(selector);
  },

  /**
   * Get multiple elements using a selector
   * @param {string} selector - CSS selector
   * @param {Element} parent - Optional parent element to search within
   * @returns {NodeList} List of matching elements
   */
  getElements(selector, parent = document) {
    return parent.querySelectorAll(selector);
  },

  /**
   * Find closest parent element matching selector
   * @param {Element} element - Starting element
   * @param {string} selector - CSS selector
   * @returns {Element|null} The found parent or null
   */
  getClosestParent(element, selector) {
    return element.closest(selector);
  },

  /**
   * Get element by data attribute value
   * @param {string} attribute - Data attribute name (without 'data-')
   * @param {string} value - Value to match
   * @returns {Element|null} The found element or null
   */
  getElementByData(attribute, value) {
    return document.querySelector(`[data-${attribute}="${value}"]`);
  },

  /**
   * Add event listener with delegation
   * @param {Element} container - Container element
   * @param {string} eventType - Event type (e.g., 'click')
   * @param {string} selector - CSS selector for target elements
   * @param {Function} handler - Event handler function
   */
  addDelegatedEventListener(container, eventType, selector, handler) {
    if (!container) return;
    
    container.addEventListener(eventType, function(e) {
      const target = e.target.closest(selector);
      if (target) {
        handler.call(target, e);
      }
    });
  }
};

// Export the module
export default DOMUtils;
