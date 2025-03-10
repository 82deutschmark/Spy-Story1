
/**
 * DOMUtils.js - Utilities for DOM manipulation
 */
class DOMUtils {
    /**
     * Get a single element by various selector methods
     * @param {string} selector CSS selector or ID (with or without #)
     * @param {Element|Document} context The parent context (defaults to document)
     * @returns {Element|null} The found element or null
     */
    static getElement(selector, context = document) {
        if (!selector) return null;
        
        // If the selector starts with #, it's an ID
        if (selector.startsWith('#')) {
            return context.getElementById(selector.substring(1));
        }
        
        // Try querySelector
        return context.querySelector(selector);
    }
    
    /**
     * Get multiple elements by selector
     * @param {string} selector CSS selector
     * @param {Element|Document} context The parent context (defaults to document)
     * @returns {NodeList} The found elements
     */
    static getElements(selector, context = document) {
        return context.querySelectorAll(selector);
    }
    
    /**
     * Create a new element with optional attributes and content
     * @param {string} tag The HTML tag to create
     * @param {Object} attributes Optional attributes to set
     * @param {string|Node} content Optional content to add
     * @returns {Element} The created element
     */
    static createElement(tag, attributes = {}, content = null) {
        const element = document.createElement(tag);
        
        // Set attributes
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'dataset') {
                Object.entries(value).forEach(([dataKey, dataValue]) => {
                    element.dataset[dataKey] = dataValue;
                });
            } else {
                element.setAttribute(key, value);
            }
        });
        
        // Add content
        if (content) {
            if (typeof content === 'string') {
                element.innerHTML = content;
            } else {
                element.appendChild(content);
            }
        }
        
        return element;
    }
    
    /**
     * Add event listener with delegation
     * @param {Element|string} parent The parent element or selector
     * @param {string} eventType The event type to listen for
     * @param {string} childSelector The selector for child elements to trigger on
     * @param {Function} callback The event handler
     */
    static addDelegatedEventListener(parent, eventType, childSelector, callback) {
        const parentElement = typeof parent === 'string' ? this.getElement(parent) : parent;
        if (!parentElement) return;
        
        parentElement.addEventListener(eventType, (event) => {
            const targetElement = event.target.closest(childSelector);
            if (targetElement && parentElement.contains(targetElement)) {
                callback(event, targetElement);
            }
        });
    }
    
    /**
     * Set or get data attributes
     * @param {Element|string} element The element or selector
     * @param {string} key The data attribute key (without data-)
     * @param {string} value The value to set (omit to get)
     * @returns {string|null|undefined} The value if getting
     */
    static dataAttr(element, key, value) {
        const el = typeof element === 'string' ? this.getElement(element) : element;
        if (!el) return null;
        
        if (value === undefined) {
            return el.dataset[key];
        } else {
            el.dataset[key] = value;
        }
    }
}

// Export to global scope for now
window.DOMUtils = DOMUtils;
export default DOMUtils;
