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
        
        // Make sure we can access the CurrencyManager from main app
        if (window.CurrencyManager) {
            console.log('CurrencyManager found in global scope');
        } else {
            console.warn('CurrencyManager not found in global scope, creating placeholder');
            // Create a placeholder if it doesn't exist
            window.CurrencyManager = {
                updateCurrencyDisplays: function(balances) {
                    console.log('Debug placeholder CurrencyManager updating displays:', balances);
                    DebugUtils.validateCurrencyDisplays(balances);
                }
            };
        }
        
        // Set up currency transaction monitoring
        monitorCurrencySystem();

        console.log('Debug application initialized');
    }
    
    // Set up currency transaction monitoring
    function monitorCurrencySystem() {
        // Monitor currency update events
        document.addEventListener('currency-updated', (e) => {
            console.log('Currency updated event received:', e.detail);
            // Validate that the UI is correctly updated
            validateCurrencyDisplays(e.detail.balances);
        });
        
        // Patch the fetch API to monitor currency trade calls
        const originalFetch = window.fetch;
        window.fetch = function(url, options) {
            const result = originalFetch.apply(this, arguments);
            
            // Only intercept currency trade API calls
            if (typeof url === 'string' && url.includes('/api/currency/trade')) {
                result.then(response => {
                    const clone = response.clone();
                    clone.json().then(data => {
                        console.log('Currency trade API response:', data);
                        if (data.success && data.new_balances) {
                            DebugUtils.monitorCurrencyTransaction(
                                JSON.parse(options.body).from_currency,
                                JSON.parse(options.body).to_currency,
                                JSON.parse(options.body).amount,
                                data.new_balances
                            );
                        }
                    }).catch(err => {
                        console.error('Error parsing currency trade response', err);
                    });
                });
            }
            
            return result;
        };
    }
    
    // Validate that currency displays match the expected values
    function validateCurrencyDisplays(balances) {
        if (!balances) return;
        
        setTimeout(() => {
            Object.keys(balances).forEach(currency => {
                const expected = balances[currency];
                const elements = document.querySelectorAll(`.currency-${currency}, .currency[data-currency="${currency}"]`);
                
                elements.forEach(el => {
                    const displayed = el.textContent.trim();
                    if (displayed != expected) {
                        console.warn(`Currency display mismatch for ${currency}: Expected ${expected}, displayed ${displayed}`, el);
                    } else {
                        console.log(`Currency display correct for ${currency}: ${displayed}`, el);
                    }
                });
            });
        }, 1000); // Check after a delay to ensure DOM updates have completed
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
        UI: DebugUI,
        // Expose currency validation methods
        validateCurrencyDisplays
    };
})();

// Initialize the application
DebugApp.initialize();

// Export for external use
window.Debug = DebugApp;