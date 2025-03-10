
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

    // Fetch current balances from the server
    fetchCurrentBalances() {
        fetch('/api/user/balances')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    this.currentBalances = data.balances || {};
                    this.updateCurrencyDisplay(this.currentBalances);
                    console.log('Initial balances loaded:', this.currentBalances);
                }
            })
            .catch(error => {
                console.error('Error fetching initial balances:', error);
            });
    }

    // Update all currency displays with new balances
    updateCurrencyDisplay(balances) {
        if (!balances) {
            console.error('No balances provided to updateCurrencyDisplay');
            return;
        }

        console.log('Updating currency displays with:', balances);
        
        // Update each currency display element
        Object.keys(balances).forEach(currency => {
            const amount = balances[currency];
            
            // Find all elements that display this currency
            const elements = document.querySelectorAll(`.currency-amount[data-currency="${currency}"]`);
            if (elements.length === 0) {
                console.log(`No display elements found for currency ${currency}`);
                return;
            }
            
            elements.forEach(element => {
                element.textContent = amount;
            });
        });

        console.log('Updated currency UI with new balances:', balances);
        
        // Update our stored balances
        this.currentBalances = {...balances};
    }

    // Trade one currency for another
    tradeCurrency(fromCurrency, toCurrency, amount) {
        return new Promise((resolve, reject) => {
            if (!fromCurrency || !toCurrency || !amount) {
                reject('Missing required parameters for currency trade');
                return;
            }
            
            // Send trade request to server
            fetch('/api/currency/trade', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    from_currency: fromCurrency,
                    to_currency: toCurrency,
                    amount: amount
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Update display with new balances
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
                console.error('Error making trade:', error);
                reject(error);
            });
        });
    }

    // Get current balances
    getBalances() {
        return this.currentBalances;
    }
}

export default CurrencyManager;
