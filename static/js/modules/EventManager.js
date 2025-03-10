
/**
 * EventManager.js - Centralized event management system
 * Implements a pub/sub pattern for application-wide events
 */
const EventManager = {
  // Event registry
  _events: {},
  
  /**
   * Subscribe to an event
   * @param {string} eventName - Name of the event
   * @param {Function} handler - Event handler function
   * @returns {Object} Subscription object with unsubscribe method
   */
  subscribe(eventName, handler) {
    if (!this._events[eventName]) {
      this._events[eventName] = [];
    }
    
    this._events[eventName].push(handler);
    
    // Return subscription object
    return {
      unsubscribe: () => this.unsubscribe(eventName, handler)
    };
  },
  
  /**
   * Unsubscribe from an event
   * @param {string} eventName - Name of the event
   * @param {Function} handler - Event handler function to remove
   */
  unsubscribe(eventName, handler) {
    if (!this._events[eventName]) return;
    
    this._events[eventName] = this._events[eventName].filter(h => h !== handler);
    
    // Clean up empty event arrays
    if (this._events[eventName].length === 0) {
      delete this._events[eventName];
    }
  },
  
  /**
   * Publish an event
   * @param {string} eventName - Name of the event
   * @param {any} data - Data to pass to event handlers
   */
  publish(eventName, data = {}) {
    if (!this._events[eventName]) return;
    
    // Add timestamp and event name to the data
    const eventData = {
      ...data,
      eventName,
      timestamp: new Date()
    };
    
    // Call all handlers
    this._events[eventName].forEach(handler => {
      try {
        handler(eventData);
      } catch (error) {
        console.error(`Error in event handler for ${eventName}:`, error);
      }
    });
  },
  
  /**
   * Publish an event after a delay
   * @param {string} eventName - Name of the event
   * @param {any} data - Data to pass to event handlers
   * @param {number} delay - Delay in milliseconds
   * @returns {number} Timeout ID for cancellation
   */
  publishLater(eventName, data = {}, delay = 0) {
    return setTimeout(() => {
      this.publish(eventName, data);
    }, delay);
  },
  
  /**
   * Clear all subscribers for an event
   * @param {string} eventName - Name of the event
   */
  clear(eventName) {
    if (eventName) {
      delete this._events[eventName];
    } else {
      this._events = {};
    }
  }
};

// Export the module
export default EventManager;
