/**
 * Currency management module
 */
import { api } from './utils/api.js';
import { dom } from './utils/dom.js';

export const currency = {
    /**
     * Update all currency displays in the UI
     * @param {Object} balances - The currency balances
     */
    updateDisplays: (balances) => {
        if (!balances) return;

        Object.entries(balances).forEach(([currency, balance]) => {
            const displays = document.querySelectorAll(`.currency-item[data-currency="${currency}"] .currency-amount`);
            displays.forEach(display => {
                display.textContent = balance;
            });

            // Update currency requirement indicators
            document.querySelectorAll('.currency-req-item').forEach(reqItem => {
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
     * Process a currency trade
     * @param {string} fromCurrency - The currency to trade from
     * @param {string} toCurrency - The currency to trade to
     * @param {number} amount - The amount to trade
     * @returns {Promise} - The trade result
     */
    processTrade: async (fromCurrency, toCurrency, amount) => {
        const loadingPercent = dom.createLoadingOverlay('Processing trade...');
        try {
            const data = await api.post('/trade_currency', {
                from_currency: fromCurrency,
                to_currency: toCurrency,
                amount: amount
            });

            if (data.success) {
                currency.updateDisplays(data.new_balances);
                dom.showToast('Success', data.message);
                return true;
            } else {
                throw new Error(data.error || 'Failed to trade currencies');
            }
        } catch (error) {
            dom.showToast('Error', error.message || 'Failed to trade currencies', true);
            return false;
        } finally {
            dom.removeLoadingOverlay(loadingPercent);
        }
    }
};
