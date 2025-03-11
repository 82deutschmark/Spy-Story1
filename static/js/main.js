/**
 * Main entry point for the application
 * Imports all modules and initializes the application
 */
import UIUtils from './modules/UIUtils.js';
import CurrencyManager from './modules/CurrencyManager.js';
import UserProgress from './modules/UserProgress.js';
import CharacterManager from './modules/CharacterManager.js';
import StoryManager from './modules/StoryManager.js';
import MissionManager from './modules/MissionManager.js';
import PaymentManager from './modules/PaymentManager.js';
import EventHandlers from './modules/EventHandlers.js';

// Make core modules available globally for debugging
window.App = {
    UI: UIUtils,
    Currency: CurrencyManager,
    Progress: UserProgress,
    Character: CharacterManager,
    Story: StoryManager,
    Mission: MissionManager,
    Payment: PaymentManager
};

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    EventHandlers.initialize();
});

// Import modules
import CharacterManager from './modules/CharacterManager.js';
import CurrencyManager from './modules/CurrencyManager.js';
import StoryManager from './modules/StoryManager.js';
import UIUtils from './modules/UIUtils.js';
import UserProgress from './modules/UserProgress.js';
import MissionManager from './modules/MissionManager.js';
import PaymentManager from './modules/PaymentManager.js';
import EventHandlers from './modules/EventHandlers.js';

// Create global variable to store module instances
window.appModules = {};

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing application modules...');

    try {
        // Initialize modules
        window.appModules.characterManager = new CharacterManager();
        window.appModules.currencyManager = new CurrencyManager();
        window.appModules.storyManager = new StoryManager();
        window.appModules.uiUtils = new UIUtils();
        window.appModules.userProgress = new UserProgress();
        window.appModules.missionManager = new MissionManager();

        // Initialize PayPal integration if PayPal is available
        console.log('Checking PayPal integration...');
        if (typeof paypal !== 'undefined') {
            try {
                // Get PayPal client ID from meta tag
                const paypalMetaTag = document.querySelector('meta[name="paypal-client-id"]');
                const paypalClientId = paypalMetaTag ? paypalMetaTag.getAttribute('content') : null;

                if (paypalClientId) {
                    window.appModules.paymentManager = new PaymentManager(paypalClientId);
                    console.log('PayPal integration initialized successfully');
                } else {
                    console.warn('PayPal client ID not found in meta tag');
                }
            } catch (paypalError) {
                console.error('Error initializing PayPal integration:', paypalError);
            }
        } else {
            console.log('PayPal SDK not loaded');
        }

        // Initialize event handlers
        window.appModules.eventHandlers = new EventHandlers(
            window.appModules.characterManager,
            window.appModules.currencyManager,
            window.appModules.storyManager,
            window.appModules.uiUtils,
            window.appModules.userProgress,
            window.appModules.missionManager
        );

        console.log('Application modules initialized successfully');
    } catch (error) {
        console.error('Error initializing application modules:', error);
    }
});