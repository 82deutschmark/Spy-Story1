
/**
 * Payment Manager Module
 * Handles in-game currency, transactions, and payments
 */
export const PaymentManager = {
    /**
     * Initialize payment manager
     */
    initialize() {
        console.log('Payment manager initialized');
        this.setupPaymentButtons();
        this.updateCurrencyDisplays();
    },

    /**
     * Setup payment buttons
     */
    setupPaymentButtons() {
        const buyButtons = document.querySelectorAll('.buy-currency-btn');
        if (!buyButtons.length) return;
        
        console.log('Setting up payment buttons');
        
        buyButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const currencyType = button.dataset.currency;
                const amount = button.dataset.amount;
                const cost = button.dataset.cost;
                
                if (!currencyType || !amount) return;
                
                this.processPurchase(currencyType, amount, cost);
            });
        });
    },

    /**
     * Process a currency purchase
     */
    processPurchase(currencyType, amount, cost) {
        console.log(`Processing purchase: ${amount} ${currencyType} for $${cost}`);
        
        // Show confirmation modal if available
        if (window.UIUtils && typeof window.UIUtils.showConfirmationModal === 'function') {
            window.UIUtils.showConfirmationModal(
                'Confirm Purchase',
                `Are you sure you want to purchase ${amount} ${currencyType} for $${cost}?`,
                () => this.executePurchase(currencyType, amount)
            );
        } else {
            // Fallback to basic confirmation
            if (confirm(`Are you sure you want to purchase ${amount} ${currencyType} for $${cost}?`)) {
                this.executePurchase(currencyType, amount);
            }
        }
    },

    /**
     * Execute the actual purchase transaction
     */
    executePurchase(currencyType, amount) {
        // Here we would normally integrate with a payment provider
        // For now, we'll simulate a successful purchase
        
        fetch('/api/purchase_currency', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({
                currency_type: currencyType,
                amount: amount
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Update UI
                this.updateCurrencyDisplays();
                
                // Show success notification
                if (window.UIUtils && typeof window.UIUtils.showToast === 'function') {
                    window.UIUtils.showToast('Purchase Successful', `You've received ${amount} ${currencyType}!`);
                }
            } else {
                console.error('Purchase failed:', data.error);
                
                // Show error notification
                if (window.UIUtils && typeof window.UIUtils.showToast === 'function') {
                    window.UIUtils.showToast('Purchase Failed', data.error || 'Transaction could not be completed.', 'error');
                }
            }
        })
        .catch(error => {
            console.error('Error processing purchase:', error);
            
            // Show error notification
            if (window.UIUtils && typeof window.UIUtils.showToast === 'function') {
                window.UIUtils.showToast('Purchase Failed', 'An error occurred. Please try again later.', 'error');
            }
        });
    },

    /**
     * Update all currency displays in the UI
     */
    updateCurrencyDisplays() {
        fetch('/api/get_currencies')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const currencies = data.currencies;
                    
                    // Update each currency display
                    Object.keys(currencies).forEach(currencyType => {
                        const displays = document.querySelectorAll(`.currency-${currencyType}`);
                        displays.forEach(display => {
                            display.textContent = currencies[currencyType];
                        });
                    });
                }
            })
            .catch(error => {
                console.error('Error updating currency displays:', error);
            });
    }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PaymentManager;
}

// For browser use, attach to window object
if (typeof window !== 'undefined') {
    // Only assign to window if not already defined
    if (!window.PaymentManager) {
        window.PaymentManager = PaymentManager;
    }
}
