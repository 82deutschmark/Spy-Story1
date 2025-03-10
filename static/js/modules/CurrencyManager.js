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
    async tradeCurrency(fromCurrency, toCurrency, amount) {
        try {
            const response = await fetch('/api/currency/trade', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from_currency: fromCurrency,
                    to_currency: toCurrency,
                    amount: amount
                })
            });

            const data = await response.json();
            if (data.success) {
                console.log(`Successfully traded ${amount} ${fromCurrency} for ${toCurrency}`);
                // Update UI with new balances
                this.updateCurrencyUI(data.new_balances);
                return data;
            } else {
                throw new Error(data.error || 'Failed to trade currency');
            }
        } catch (error) {
            console.error('Error trading currency:', error);
            throw error;
        }
    }

    // Update the UI with new currency balances
    updateCurrencyUI(balances) {
        if (!balances) return;

        // Update each currency display
        Object.keys(balances).forEach(currency => {
            const amount = balances[currency];
            const elements = document.querySelectorAll(`.currency-amount[data-currency="${currency}"]`);
            elements.forEach(element => {
                element.textContent = amount;
            });

            // Also update any regular currency displays without data attributes
            const currencyElements = document.querySelectorAll('.currency-item');
            currencyElements.forEach(item => {
                const symbol = item.querySelector('.currency-symbol');
                const amountElement = item.querySelector('.currency-amount');
                if (symbol && amountElement && symbol.textContent === currency) {
                    amountElement.textContent = amount;
                }
            });
        });

        console.log('Updated currency UI with new balances:', balances);
    }
}

// Create and export singleton instance
export default new CurrencyManager();