/**
 * PaymentManager.js - Manages in-game currency and transactions
 */

// Payment Manager object
const PaymentManager = {
    currencies: {
        diamonds: '💎',
        dollars: '💵',
        pounds: '💷',
        euros: '💶',
        yen: '💴'
    },

    initialize() {
        console.log('PaymentManager properly initialized');
        this.loadUserBalance();
        this.setupTransactionListeners();
    },

    loadUserBalance() {
        console.log('Loading user balance');
        fetch('/api/get_currencies')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    this.currencies = data.currencies; // Update internal currency data
                }
            })
            .catch(error => {
                console.error('Error loading user balance:', error);
            });
    },

    setupTransactionListeners() {
        console.log('Setting up transaction listeners');
        const buyButtons = document.querySelectorAll('.buy-currency-btn');
        if (!buyButtons.length) return;

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

    processPurchase(currencyType, amount, cost) {
        console.log(`Processing purchase: ${amount} ${currencyType} for $${cost}`);
        // Show confirmation modal if available.  This section needs more robust error handling.
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
                    // Update UI -  Needs specific implementation to update UI elements with new balances.
                    this.updateBalanceUI();


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

    updateBalanceUI() {
        // Update currency display in UI.  Needs implementation to select and update UI elements.
        Object.keys(this.currencies).forEach(currencyType => {
            const displays = document.querySelectorAll(`.currency-${currencyType}`);
            displays.forEach(display => {
                display.textContent = this.currencies[currencyType] || 0; // Handle potential missing currency data
            });
        });
    }
};

// Export as ES module (default and named export)
export default PaymentManager;
export { PaymentManager };