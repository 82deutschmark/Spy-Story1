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
    window.UIUtils = UIUtils;  // UIUtils is already an object, not a constructor
    window.currencyManager = new CurrencyManager();
    window.characterManager = new CharacterManager(); // Added CharacterManager initialization
    console.log('Character manager initialized: ', window.characterManager);
    window.paymentManager = new PaymentManager();
    window.storyManager = new StoryManager();
    window.userProgress = new UserProgress();
    window.missionManager = new MissionManager();

    // Initialize event handlers for the index page
    if (document.querySelector('.character-select-card')) {
        console.log('Character selection page detected, setting up character interactions');

        // Check for reroll buttons
        const rerollButtons = document.querySelectorAll('.reroll-btn');
        console.log(`Found ${rerollButtons.length} reroll buttons`);

        // Add a small delay to ensure DOM is fully rendered
        setTimeout(() => {
            if (window.characterManager) {
                console.log('Setting up character select listeners');
                window.characterManager.setupCharacterSelectListeners();
                console.log('Setting up reroll button listeners');
                window.characterManager.setupRerollButtonListeners();
                console.log('Character interactions initialized');
            } else {
                console.error('Character manager not initialized');
            }
        }, 300);
    }

    // Initialize character highlighting if on storyboard page
    const storyContent = document.querySelector('.story-content');
    if (storyContent) {
        console.log('Story content detected, initializing character highlighting');
        // Get character data from the character gallery
        const characterData = [];
        document.querySelectorAll('.character-mini-name').forEach(nameEl => {
            const portraitEl = nameEl.closest('.character-portrait-mini');
            if (portraitEl) {
                const imgEl = portraitEl.querySelector('img');
                if (imgEl) {
                    const charName = nameEl.textContent.trim();
                    // Find traits if available
                    const mainCharInfo = document.querySelector('.character-traits-list');
                    let traits = [];
                    if (mainCharInfo && portraitEl.dataset.characterName === document.querySelector('.character-info-box h3').textContent.trim().toLowerCase().replace(/\s+/g, '-')) {
                        traits = Array.from(mainCharInfo.querySelectorAll('.trait-badge')).map(badge => badge.textContent.trim());
                    }

                    characterData.push({
                        name: charName,
                        image_url: imgEl.src,
                        traits: traits
                    });
                }
            }
        });

        // Initialize character highlighting
        if (characterData.length > 0) {
            console.log(`Found ${characterData.length} characters for highlighting`);
            window.storyManager.highlightCharacters(storyContent, characterData);
        }
    }


    // For debugging
    console.log('PayPal SDK loaded:', typeof paypal !== 'undefined');
    console.log('PayPal button container exists:', !!document.getElementById('paypal-button-container'));

    // Initialize PayPal buttons if SDK is loaded
    console.log('Initializing PayPal integration...');
    window.paymentManager.initializePayPalButtons();

    // Set up event handlers for currency trading
    setupCurrencyTradeForm();

    // Set up story generation form submission
    const storyForm = document.getElementById('storyForm');
    if (storyForm) {
        storyForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            // Find the submit button and update its UI
            const submitButton = storyForm.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Generating...';
            }

            // Add loading class to body
            document.body.classList.add('loading-in-progress');
            window.storyManager.generateStory(formData);
        });
    }

    //Handle trade modal events
    setupTradeEvents();

    // Initialize mission manager if on storyboard
    if (document.querySelector('.story-container')) {
        const missionManager = new MissionManager();
        highlightCharactersInText();

        // Setup currency trade offer button
        setupCurrencyTradeOfferEvents();
    }
});

// Setup currency trade offer events
function setupCurrencyTradeOfferEvents() {
    const acceptTradeBtn = document.getElementById('acceptTradeOffer');
    if (acceptTradeBtn) {
        acceptTradeBtn.addEventListener('click', function() {
            const fromCurrency = this.dataset.fromCurrency;
            const toCurrency = this.dataset.toCurrency;
            const rate = this.dataset.rate;
            const amount = parseInt(this.dataset.amount || '1', 10);

            if (!fromCurrency || !toCurrency) {
                UIUtils.showToast('Error', 'Invalid trade parameters');
                return;
            }

            // Disable button and show loading state
            this.disabled = true;
            const originalText = this.innerHTML;
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

            // Execute the trade
            currencyManager.tradeCurrency(fromCurrency, toCurrency, amount)
                .then(response => {
                    UIUtils.showToast('Success', `Trade completed: ${amount} ${fromCurrency} for ${rate} ${toCurrency}`);

                    // Hide the trade offer section
                    const tradeOfferSection = document.querySelector('.currency-trade-offer');
                    if (tradeOfferSection) {
                        tradeOfferSection.style.display = 'none';
                    }
                })
                .catch(error => {
                    UIUtils.showToast('Error', error || 'Trade failed. You may not have enough currency.');
                })
                .finally(() => {
                    // Restore button state
                    this.disabled = false;
                    this.innerHTML = originalText;
                });
        });
    }
}