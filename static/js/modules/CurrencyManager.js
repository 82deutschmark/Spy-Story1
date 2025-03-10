/**
 * Currency Manager Module
 * Handles currency display and trading functionality
 */
class CurrencyManager {
    constructor() {
        // Initialize currency system
        console.log('CurrencyManager initialized');

        // Store current balances
        this.currentBalances = {};

        // Fetch initial balances
        this.fetchCurrentBalances();
    }

    // Fetch current balances from the server or initialize from DOM
    fetchCurrentBalances() {
        // First try to read initial values from DOM
        this.currentBalances = {};
        const currencyAmounts = document.querySelectorAll('.currency-amount');
        
        if (currencyAmounts.length > 0) {
            currencyAmounts.forEach(element => {
                const currency = element.dataset.currency;
                if (currency) {
                    this.currentBalances[currency] = parseInt(element.textContent, 10) || 0;
                }
            });
            console.log('Initial balances loaded from DOM:', this.currentBalances);
            return;
        }

        // Fallback to API call if DOM elements aren't available
        fetch('/api/currency/balances')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    this.currentBalances = data.new_balances || {};
                    this.updateCurrencyDisplay(this.currentBalances);
                    console.log('Initial balances loaded from API:', this.currentBalances);
                }
            })
            .catch(error => {
                console.error('Error fetching initial balances:', error);
            });
    }

    // Update currency display with new balance
    updateCurrencyDisplay(newBalances) {
        console.log('Updating currency display with:', newBalances);
        if (!newBalances) {
            console.warn('No balances provided to updateCurrencyDisplay');
            return;
        }

        const currencyAmounts = document.querySelectorAll('.currency-amount');
        if (currencyAmounts.length === 0) {
            console.warn('No currency display elements found');
        }

        currencyAmounts.forEach(element => {
            const currency = element.dataset.currency;
            if (currency && newBalances[currency] !== undefined) {
                element.textContent = newBalances[currency];
                console.log(`Updated ${currency} display to ${newBalances[currency]}`);
            } else if (currency) {
                console.warn(`Currency ${currency} not found in new balances`);
            }
        });
    }

    // Trade one currency for another
    tradeCurrency(fromCurrency, toCurrency, amount) {
        return new Promise((resolve, reject) => {
            if (!fromCurrency || !toCurrency || !amount) {
                reject('Missing required parameters for currency trade');
                return;
            }

            console.log(`Trading ${amount} ${fromCurrency} for ${toCurrency}`);

            // Show loading indicator
            const loadingToast = UIUtils.showToast('Processing', 'Processing trade...', 0);

            // Send trade request to server
            fetch('/api/currency/trade', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({
                    from_currency: fromCurrency,
                    to_currency: toCurrency,
                    amount: amount
                })
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(data => {
                        throw new Error(data.error || `Server error: ${response.status}`);
                    });
                }
                return response.json();
            })
            .then(data => {
                // Close loading toast
                if (loadingToast) {
                    loadingToast.hide();
                }
                
                if (data.success) {
                    console.log('Trade successful, new balances:', data.new_balances);
                    
                    // Update display with new balances
                    this.currentBalances = data.new_balances;
                    this.updateCurrencyDisplay(data.new_balances);

                    // Notify any listeners
                    document.dispatchEvent(new CustomEvent('currency-updated', {
                        detail: { 
                            balances: data.new_balances,
                            message: data.message
                        }
                    }));

                    resolve(data);
                } else {
                    console.error('Trade failed:', data.error);
                    reject(data.error);
                }
            })
            .catch(error => {
                // Close loading toast
                if (loadingToast) {
                    loadingToast.hide();
                }
                
                console.error('Error making trade:', error);
                reject(error.message || 'Failed to complete trade');
            });
        });
    }

    // Get current balances
    getBalances() {
        return this.currentBalances;
    }
}

export default CurrencyManager;