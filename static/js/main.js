
/**
 * Main JavaScript entry point for the application
 * Initializes all modules and sets up event handlers
 */
import UserProgressManager from './modules/UserProgressManager.js';
// Import other modules as needed

// Initialize modules when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded, initializing modules...');
    
    // Initialize User Progress Manager
    const userProgressManager = new UserProgressManager();
    await userProgressManager.initialize();
    
    // Make userProgressManager available globally for debugging
    window.userProgressManager = userProgressManager;
    
    // Initialize other modules if needed
    // ...
    
    // Set up page-specific initializations
    initPageSpecificFeatures();
    
    console.log('Modules loaded successfully');
});

/**
 * Initialize page-specific features based on current page
 */
function initPageSpecificFeatures() {
    // Initialize storyboard-specific features
    if (document.querySelector('.storyboard-body')) {
        initStoryboardFeatures();
    }
    
    // Initialize choice buttons
    initChoiceButtons();
}

/**
 * Initialize storyboard-specific features
 */
function initStoryboardFeatures() {
    // Initialize notebook toggle
    const notebookBtn = document.getElementById('toggleNotebookBtn');
    const closeBtn = document.getElementById('closeNotebookBtn');
    const sidebar = document.getElementById('notebookSidebar');
    
    if (notebookBtn && closeBtn && sidebar) {
        notebookBtn.addEventListener('click', () => {
            sidebar.classList.add('open');
        });
        
        closeBtn.addEventListener('click', () => {
            sidebar.classList.remove('open');
        });
    }
    
    // Initialize currency trading if available
    initCurrencyTrading();
}

/**
 * Initialize choice buttons
 */
function initChoiceButtons() {
    // Handle choice form submissions
    const choiceForms = document.querySelectorAll('.choice-form');
    
    choiceForms.forEach(form => {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(form);
            const customChoice = formData.get('custom_choice');
            
            // Check if this is a custom choice that requires diamonds
            if (customChoice && form.classList.contains('custom-choice-form')) {
                // Check if user has enough diamonds
                if (!window.userProgressManager.canAfford({'💎': 100})) {
                    showNotification('Insufficient diamonds', 'You need 100 💎 to make a custom choice.');
                    return;
                }
            }
            
            // Proceed with form submission
            try {
                const response = await fetch(form.action, {
                    method: 'POST',
                    body: formData
                });
                
                if (!response.ok) {
                    throw new Error('Failed to process choice');
                }
                
                const data = await response.json();
                
                if (data.redirect) {
                    window.location.href = data.redirect;
                }
            } catch (error) {
                console.error('Error processing choice:', error);
                showNotification('Error', 'Failed to process your choice. Please try again.');
            }
        });
    });
}

/**
 * Initialize currency trading
 */
function initCurrencyTrading() {
    const acceptTradeBtn = document.querySelector('.accept-trade-btn');
    
    if (acceptTradeBtn) {
        acceptTradeBtn.addEventListener('click', async () => {
            const fromCurrency = acceptTradeBtn.dataset.from;
            const toCurrency = acceptTradeBtn.dataset.to;
            const rate = acceptTradeBtn.dataset.rate;
            
            // Show trade modal
            const tradeModal = new bootstrap.Modal(document.getElementById('tradeModal'));
            
            // Pre-fill modal with trade details
            const fromSelect = document.getElementById('fromCurrency');
            const toSelect = document.getElementById('toCurrency');
            
            if (fromSelect) fromSelect.value = fromCurrency;
            if (toSelect) toSelect.value = toCurrency;
            
            tradeModal.show();
        });
    }
    
    // Handle trade form submission
    const tradeForm = document.getElementById('tradeForm');
    
    if (tradeForm) {
        tradeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const fromCurrency = document.getElementById('fromCurrency').value;
            const toCurrency = document.getElementById('toCurrency').value;
            const amount = parseInt(document.getElementById('tradeAmount').value, 10);
            
            if (isNaN(amount) || amount <= 0) {
                showNotification('Invalid Amount', 'Please enter a valid amount to trade.');
                return;
            }
            
            try {
                const response = await fetch('/api/trade_currency', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        from_currency: fromCurrency,
                        to_currency: toCurrency,
                        amount: amount
                    })
                });
                
                if (!response.ok) {
                    throw new Error('Failed to process trade');
                }
                
                const data = await response.json();
                
                if (data.success) {
                    // Update user progress with new balances
                    if (window.userProgressManager) {
                        window.userProgressManager.updateUserData({
                            currency_balances: data.new_balances
                        });
                        window.userProgressManager.updateUIElements();
                    }
                    
                    showNotification('Trade Successful', 'Your currency trade was successful!');
                    
                    // Close the modal
                    const tradeModal = bootstrap.Modal.getInstance(document.getElementById('tradeModal'));
                    if (tradeModal) {
                        tradeModal.hide();
                    }
                } else {
                    showNotification('Trade Failed', data.error || 'Failed to process your trade request.');
                }
            } catch (error) {
                console.error('Error processing trade:', error);
                showNotification('Error', 'Failed to process your trade. Please try again.');
            }
        });
    }
}

/**
 * Show a notification toast
 * @param {string} title - The notification title
 * @param {string} message - The notification message
 */
function showNotification(title, message) {
    const toastTitle = document.getElementById('toastTitle');
    const toastMessage = document.getElementById('toastMessage');
    const toast = document.getElementById('notificationToast');
    
    if (toastTitle && toastMessage && toast) {
        toastTitle.textContent = title;
        toastMessage.textContent = message;
        
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
    }
}
