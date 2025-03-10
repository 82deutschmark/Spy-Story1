/**
 * Currency Manager Module
 * Handles currency display and trading functionality
 */
import UIUtils from './UIUtils.js';

// CurrencyManager.js - Handles all currency operations
class CurrencyManager {
    constructor() {
        // Initialize currency system
        console.log('CurrencyManager initialized');

        // Store current balances
        this.currentBalances = {};
    }

    // Update all currency displays with new balances
    updateCurrencyDisplays(balances) {
        if (!balances) {
            console.warn('No balances provided to updateCurrencyDisplays');
            return;
        }

        try {
            // Store the new balances
            this.currentBalances = {...balances};

            Object.keys(balances).forEach(currency => {
                // Find all elements that display this currency
                const elements = document.querySelectorAll(`.currency-${currency}, .currency[data-currency="${currency}"]`);
                if (elements.length === 0) {
                    console.log(`No display elements found for currency ${currency}`);
                    return;
                }

                // Update the displayed value in each element
                elements.forEach(el => {
                    el.textContent = balances[currency];
                    console.log(`Updated currency display for ${currency} to ${balances[currency]}`);
                });
            });

            // Dispatch currency-updated event for other modules to listen to
            document.dispatchEvent(new CustomEvent('currency-updated', { 
                detail: { balances }
            }));
        } catch (error) {
            console.error('Error updating currency displays:', error);
        }
    }

    // Get current balances
    getCurrentBalances() {
        return this.currentBalances;
    }

    // Trade currencies
    tradeCurrency(fromCurrency, toCurrency, amount) {
        return new Promise((resolve, reject) => {
            if (!fromCurrency || !toCurrency || !amount) {
                reject('Missing required fields for currency trade');
                return;
            }

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
                    console.log('Trade successful:', data.message);

                    // Update the UI with new balances
                    if (data.new_balances) {
                        this.updateCurrencyDisplays(data.new_balances);
                    }

                    resolve(data);
                } else {
                    console.error('Trade failed:', data.error);
                    reject(data.error);
                }
            })
            .catch(error => {
                console.error('Error during trade:', error);
                reject(error);
            });
        });
    }
}

// Create and export singleton instance
export default new CurrencyManager();