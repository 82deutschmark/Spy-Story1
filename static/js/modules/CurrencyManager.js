
/**
 * Currency Manager Module
 * Handles currency display and trading functionality
 */
import UIUtils from './UIUtils.js';

export default {
    /**
     * Updates all currency displays in the UI
     * @param {Object} balances - Object containing currency balances
     */
    updateCurrencyDisplays(balances) {
        if (!balances) return;

        Object.entries(balances).forEach(([currency, balance]) => {
            const displays = document.querySelectorAll(`.currency-item .currency-amount`);
            displays.forEach(display => {
                const currencySymbol = display.previousElementSibling;
                if (currencySymbol && currencySymbol.textContent === currency) {
                    display.textContent = balance;
                }
            });

            // Update currency requirement indicators
            document.querySelectorAll(`.currency-req-item`).forEach(reqItem => {
                if (reqItem.textContent.includes(currency)) {
                    const required = parseInt(reqItem.textContent.replace(currency, ''));
                    if (required > balance) {
                        reqItem.classList.add('currency-req-insufficient');
                    } else {
                        reqItem.classList.remove('currency-req-insufficient');
                    }
                }
            });
        });
    },

    /**
     * Processes a currency trade request
     * @param {string} fromCurrency - Source currency
     * @param {string} toCurrency - Target currency
     * @param {number} amount - Amount to trade
     * @returns {Promise} - Promise resolving to trade result
     */
    processTradeRequest(fromCurrency, toCurrency, amount) {
        if (fromCurrency === toCurrency) {
            UIUtils.showToast('Error', 'Please select different currencies to trade');
            return Promise.reject('Same currency');
        }

        if (isNaN(amount) || amount <= 0) {
            UIUtils.showToast('Error', 'Please enter a valid amount');
            return Promise.reject('Invalid amount');
        }

        // Show loading state
        const loadingPercent = UIUtils.createLoadingOverlay('Processing trade...');
        UIUtils.updateLoadingPercent(loadingPercent, 50);

        return fetch('/api/currency/trade', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from_currency: fromCurrency,
                to_currency: toCurrency,
                amount: amount
            })
        })
            .then(response => response.json())
            .then(data => {
                UIUtils.updateLoadingPercent(loadingPercent, 100);
                if (data.success) {
                    // Update all currency displays
                    this.updateCurrencyDisplays(data.new_balances);
                    UIUtils.showToast('Success', data.message);
                    return data;
                } else {
                    throw new Error(data.error || 'Failed to trade currencies');
                }
            })
            .catch(error => {
                console.error('Error trading currencies:', error);
                UIUtils.showToast('Error', error.message || 'Failed to trade currencies');
                throw error;
            })
            .finally(() => {
                UIUtils.removeLoadingOverlay(loadingPercent);
            });
    }
};
