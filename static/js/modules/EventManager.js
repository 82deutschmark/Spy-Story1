
/**
 * EventManager.js - Centralized event management system
 */
class EventManager {
    constructor() {
        this.events = {};
    }
    
    /**
     * Register an event handler
     * @param {string} eventName The name of the event
     * @param {Function} handler The event handler function
     * @param {Object} context Optional context to bind the handler to
     * @returns {Object} Unsubscribe function
     */
    on(eventName, handler, context = null) {
        if (!this.events[eventName]) {
            this.events[eventName] = [];
        }
        
        const boundHandler = context ? handler.bind(context) : handler;
        const subscription = { handler: boundHandler, original: handler };
        this.events[eventName].push(subscription);
        
        // Return unsubscribe function
        return {
            unsubscribe: () => {
                this.off(eventName, handler);
            }
        };
    }
    
    /**
     * Remove an event handler
     * @param {string} eventName The name of the event
     * @param {Function} handler The original event handler function
     */
    off(eventName, handler) {
        if (!this.events[eventName]) return;
        
        this.events[eventName] = this.events[eventName].filter(
            subscription => subscription.original !== handler
        );
        
        if (this.events[eventName].length === 0) {
            delete this.events[eventName];
        }
    }
    
    /**
     * Emit an event
     * @param {string} eventName The name of the event
     * @param {*} data The data to pass to handlers
     */
    emit(eventName, data) {
        if (!this.events[eventName]) return;
        
        this.events[eventName].forEach(subscription => {
            try {
                subscription.handler(data);
            } catch (error) {
                console.error(`Error in event handler for ${eventName}:`, error);
            }
        });
    }
    
    /**
     * Set up a delegated DOM event listener
     * @param {Element|string} element Element or selector for delegation root
     * @param {string} eventType DOM event type (like 'click')
     * @param {string} childSelector Selector for child elements to match
     * @param {Function} handler Event handler
     * @returns {Object} Cleanup function
     */
    delegate(element, eventType, childSelector, handler) {
        const target = typeof element === 'string' ? 
            document.querySelector(element) : element;
        
        if (!target) {
            console.error(`Target element not found for delegation: ${element}`);
            return { remove: () => {} };
        }
        
        const wrappedHandler = event => {
            const matchedElement = event.target.closest(childSelector);
            if (matchedElement && target.contains(matchedElement)) {
                handler(event, matchedElement);
            }
        };
        
        target.addEventListener(eventType, wrappedHandler);
        
        // Return cleanup function
        return {
            remove: () => {
                target.removeEventListener(eventType, wrappedHandler);
            }
        };
    }
    
    /**
     * Helper method to trigger a custom DOM event
     * @param {string} eventName The name of the custom event
     * @param {*} detail The event detail data
     */
    triggerDOMEvent(eventName, detail = {}) {
        const event = new CustomEvent(eventName, { 
            detail,
            bubbles: true,
            cancelable: true
        });
        document.dispatchEvent(event);
    }
}

// Create a global instance
const eventManager = new EventManager();

// Export to global scope for now
window.EventManager = eventManager;
export default eventManager;
