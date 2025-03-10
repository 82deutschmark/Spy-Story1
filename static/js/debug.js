/**
 * Debug.js - Main debug interface for SpyTails
 * Using ES6 modules for organization
 */
import DebugUtils from './modules/debug/DebugUtils.js';
import DebugAPI from './modules/debug/DebugAPI.js';
import DebugUI from './modules/debug/DebugUI.js';
import FormHandler from './modules/debug/FormHandler.js';
import DataHandler from './modules/debug/DataHandler.js';
import ModalHandler from './modules/debug/ModalHandler.js';
import ImageHandler from './modules/debug/ImageHandler.js';
import EventHandler from './modules/debug/EventHandler.js';

// Main Debug Application - bootstrap module
const DebugApp = (function() {
    // Initialize application modules
    function initializeApp() {
        // Create module instances with dependency injection
        const dataHandler = new DataHandler(DebugUI);
        const formHandler = new FormHandler(DebugUI, dataHandler);

        // Initialize modules with dependencies
        DebugUI.initialize(formHandler, dataHandler);
        ModalHandler.initialize();
        ImageHandler.initialize();
        EventHandler.initialize();

        // Initialize modules that depend on others
        dataHandler.initialize();

        console.log('Debug application initialized');
    }

    // Public interface
    return {
        initialize() {
            // Wait for DOM to be fully loaded before initializing
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', initializeApp);
            } else {
                // DOM already loaded, initialize immediately
                initializeApp();
            }
        },
        // Expose modules for debugging
        Utils: DebugUtils,
        API: DebugAPI,
        UI: DebugUI
    };
})();

// Initialize the application
DebugApp.initialize();

// Export for external use
window.Debug = DebugApp;