/**
 * Main entry point for the application
 * Imports all modules and initializes the application
 */
import DOMUtils from './modules/DOMUtils.js';
import EventManager from './modules/EventManager.js';
import LoadingManager from './modules/LoadingManager.js';
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
    DOM: DOMUtils,
    Events: EventManager,
    Loading: LoadingManager,
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

    // Initialize utility modules
    window.DOMUtils = DOMUtils;
    window.EventManager = EventManager;
    window.LoadingManager = LoadingManager;
    window.UIUtils = UIUtils;
    window.currencyManager = new CurrencyManager();
    window.characterManager = new CharacterManager();
    console.log('Character manager initialized: ', window.characterManager);
    window.paymentManager = new PaymentManager();
    window.storyManager = new StoryManager();
    window.userProgress = new UserProgress();
    window.missionManager = new MissionManager();


    // Initialize UI components
    initializeUI();

    // Set up global event listeners
    initializeEventListeners();

    // Initialize page-specific functionality
    initializePageSpecificFunctions();

    // Subscribe to global events for debugging
    EventManager.subscribe('*', (eventData) => {
        console.debug(`Event triggered: ${eventData.eventName}`, eventData);
    });


    // For debugging
    console.log('PayPal SDK loaded:', typeof paypal !== 'undefined');
    console.log('PayPal button container exists:', !!document.getElementById('paypal-button-container'));

    // Initialize PayPal buttons if SDK is loaded
    console.log('Initializing PayPal integration...');
    window.paymentManager.initializePayPalButtons();

    // Set up event handlers for currency trading
    setupCurrencyTradeForm();


});

// Initialize UI components
function initializeUI() {
    // Initialize Bootstrap tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Initialize Bootstrap popovers
    const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.map(function (popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });
}

// Set up global event listeners
function initializeEventListeners() {
    // Story form submission
    const storyForm = document.getElementById('storyForm');
    if (storyForm) {
        storyForm.addEventListener('submit', function(event) {
            event.preventDefault();

            // Check for selected character
            const selectedImages = document.querySelectorAll('input[name="selected_images[]"]');
            if (selectedImages.length === 0) {
                UIUtils.showToast('Error', 'Please select a character for your story', 'error');
                return;
            }

            // Begin story generation
            window.StoryManager.beginStoryGeneration(storyForm);
        });
    }

    // Story continuation buttons
    const choiceButtons = document.querySelectorAll('.choice-btn');
    choiceButtons.forEach(button => {
        button.addEventListener('click', function(event) {
            event.preventDefault();

            const choiceId = this.dataset.choiceId;
            const storyId = this.dataset.storyId;

            if (choiceId && storyId) {
                window.StoryManager.continueStory(choiceId, storyId);
            }
        });
    });

    // Handle character highlighting in story text
    if (window.CharacterManager && document.getElementById('story-text')) {
        window.CharacterManager.getEncounteredCharacters()
            .then(characters => {
                window.StoryManager.highlightCharacters(characters);
            })
            .catch(error => {
                console.error('Error getting characters for highlighting:', error);
            });
    }

    // Trade offer acceptance
    const acceptTradeButton = document.getElementById('acceptTradeBtn');
    if (acceptTradeButton) {
        acceptTradeButton.addEventListener('click', function(event) {
            event.preventDefault();

            const tradeId = this.dataset.tradeId;
            if (!tradeId) {
                console.error('No trade ID found on accept button');
                return;
            }

            // Show loading state
            const restoreButton = UIUtils.showButtonLoading(this, 'Processing...');

            // Process the trade
            fetch('/api/accept_trade', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ trade_id: tradeId })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    UIUtils.showToast('Success', 'Trade offer accepted!');

                    // Update currency display
                    if (window.CurrencyManager) {
                        window.CurrencyManager.updateCurrencyDisplay(data.new_balance);
                    }

                    // Disable the button
                    this.disabled = true;
                    restoreButton('Accepted');
                } else {
                    UIUtils.showToast('Error', data.error || 'Failed to accept trade', 'error');
                    restoreButton('Accept Trade Offer');
                }
            })
            .catch(error => {
                console.error('Error accepting trade:', error);
                UIUtils.showToast('Error', 'Failed to process trade. Please try again.', 'error');
                restoreButton('Accept Trade Offer');
            });
        });
    }
}

// Initialize page-specific functionality
function initializePageSpecificFunctions() {
    // Check if we're on the story page
    if (document.getElementById('story-container')) {
        // Initialize character highlighting
        if (window.CharacterManager && window.StoryManager) {
            window.CharacterManager.getEncounteredCharacters()
                .then(characters => {
                    window.StoryManager.highlightCharacters(characters);
                })
                .catch(error => {
                    console.error('Error getting characters for highlighting:', error);
                });
        }
        //Handle trade modal events
        setupTradeEvents();
        // Setup currency trade offer button
        setupCurrencyTradeOfferEvents();
        highlightCharactersInText();
    }

    // Check if we're on the character selection page
    const characterSelectionArea = document.getElementById('character-selection-area');
    if (characterSelectionArea) {
        console.log('On character selection page, checking for BeginAdventureBtn');

        // Focus on the Begin Adventure button when a character is selected
        window.EventManager.on('character-selection-changed', (data) => {
            const beginButton = document.getElementById('beginAdventureBtn');
            if (beginButton && data.selectedCharacters && data.selectedCharacters.length > 0) {
                beginButton.focus();
                // Scroll to story options
                const storyOptions = document.getElementById('storyOptions');
                if (storyOptions) {
                    storyOptions.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });

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
    // Set up story generation form submission
    const storyForm2 = document.getElementById('storyForm');
    if (storyForm2) {
        storyForm2.addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            // Find the submit button and update its UI
            const submitButton = storyForm2.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Generating...';
            }

            // Add loading class to body
            document.body.classList.add('loading-in-progress');
            window.storyManager.generateStory(formData);
        });
    }
}

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


// Placeholder functions -  Replace with actual implementations from other modules
function setupCurrencyTradeForm() {
    //Implementation to be added from other modules
}

function setupTradeEvents() {
    //Implementation to be added from other modules
}

function highlightCharactersInText() {
    //Implementation to be added from other modules
}