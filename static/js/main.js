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
    console.log('DOM loaded, initializing application modules...');

    // Initialize modules
    window.UIUtils = new UIUtils();
    window.currencyManager = new CurrencyManager();
    window.characterManager = new CharacterManager(); // Added CharacterManager initialization
    window.paymentManager = new PaymentManager();
    window.storyManager = new StoryManager();
    window.userProgress = new UserProgress();
    window.missionManager = new MissionManager();
    
    // Initialize event handlers for the index page
    if (document.querySelector('.character-select-card')) {
        console.log('Character selection page detected, setting up character interactions');
        window.characterManager.setupCharacterSelectListeners();
        window.characterManager.setupRerollButtonListeners();
    }

    // For debugging
    console.log('PayPal SDK loaded:', typeof paypal !== 'undefined');
    console.log('PayPal button container exists:', !!document.getElementById('paypal-button-container'));

    // Initialize PayPal buttons if SDK is loaded
    console.log('Initializing PayPal integration...');
    window.paymentManager.initializePayPalButtons();

    // Set up event handlers for currency trading
    setupCurrencyTradeForm();
});