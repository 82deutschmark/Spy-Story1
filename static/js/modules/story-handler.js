
/**
 * Story Handler Module
 * Manages story progression, choices, and narrative flow
 */
const StoryHandler = (function() {
    // Internal state
    let currentStoryId = null;
    
    /**
     * Initialize story handler with current story ID
     * @param {string} storyId - Current story ID
     */
    function initialize(storyId) {
        currentStoryId = storyId;
        setupEventListeners();
    }
    
    /**
     * Set up event listeners for story choices
     */
    function setupEventListeners() {
        // Listen for choice form submissions
        document.querySelectorAll('.choice-form').forEach(form => {
            form.addEventListener('submit', handleChoiceSubmission);
        });
        
        // Listen for trade offer buttons
        document.querySelectorAll('.accept-trade-btn').forEach(btn => {
            btn.addEventListener('click', handleTradeOfferClick);
        });
    }
    
    /**
     * Handle a trade offer button click
     * @param {Event} e - Click event
     */
    function handleTradeOfferClick(e) {
        const fromCurrency = e.target.dataset.from;
        const toCurrency = e.target.dataset.to;
        const rate = parseFloat(e.target.dataset.rate);
        const amount = e.target.dataset.amount ? parseFloat(e.target.dataset.amount) : 100;

        CurrencyHandler.acceptTradeOffer(fromCurrency, toCurrency, rate, amount);
    }
    
    /**
     * Handle a choice form submission
     * @param {Event} e - Submit event
     */
    async function handleChoiceSubmission(e) {
        e.preventDefault();
        const form = e.target;
        
        try {
            // Check if this is a custom choice
            const isCustom = form.querySelector('.custom-choice-input') !== null;
            
            // If it's a regular choice, check currency requirements
            if (!isCustom) {
                const choiceButton = form.querySelector('button');
                const currencyReqs = choiceButton.dataset.currencyReq ? 
                    JSON.parse(choiceButton.dataset.currencyReq) : null;
                
                if (currencyReqs && !CurrencyHandler.canPlayerAfford(currencyReqs)) {
                    UI.showToast('Error', 'Insufficient funds for this choice');
                    return;
                }
            }
            
            // Show loading overlay
            const loadingPercent = UI.addLoadingOverlay('Processing your choice...');
            
            // Prepare form data
            const formData = new FormData(form);
            
            // Prepare the request body based on choice type
            let requestBody = {};
            if (isCustom) {
                const customChoice = formData.get('custom_choice');
                
                // Validate custom choice
                if (!customChoice || customChoice.trim() === '') {
                    UI.showToast('Error', 'Please enter a custom choice');
                    UI.removeLoadingOverlay(loadingPercent);
                    return;
                }
                
                requestBody = {
                    custom_choice: customChoice
                };
            } else {
                const choiceButton = form.querySelector('button[data-choice-id]');
                if (!choiceButton) {
                    UI.showToast('Error', 'Could not find choice ID');
                    UI.removeLoadingOverlay(loadingPercent);
                    return;
                }
                
                requestBody = {
                    choice_id: choiceButton.dataset.choiceId
                };
            }
            
            // Make the request
            const response = await fetch('/make_choice', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(requestBody)
            });
            
            // Process the response
            const data = await response.json();
            
            if (data.success) {
                // Update balances
                if (data.new_balances) {
                    CurrencyHandler.updateBalances(data.new_balances);
                }
                
                // Update story content
                if (data.html) {
                    const storyContainer = document.getElementById('storyContainer');
                    if (storyContainer) {
                        UI.animateStoryContent(storyContainer, data.html);
                        
                        // Re-initialize event listeners for new content
                        setTimeout(() => {
                            setupEventListeners();
                        }, 500);
                    }
                } else if (data.redirect_url) {
                    // Handle redirection
                    window.location.href = data.redirect_url;
                }
            } else {
                UI.showToast('Error', data.error || 'Failed to process choice');
            }
            
            UI.removeLoadingOverlay(loadingPercent);
        } catch (error) {
            console.error('Error processing choice:', error);
            UI.showToast('Error', 'An unexpected error occurred');
            UI.removeLoadingOverlay(loadingPercent);
        }
    }
    
    // Return public API
    return {
        initialize,
        setupEventListeners
    };
})();

// Export the module
window.StoryHandler = StoryHandler;
