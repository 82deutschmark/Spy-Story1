/**
 * Currency management module
 */
import { api } from './utils/api.js';
import { dom } from './utils/dom.js';

class CurrencyManager {
    constructor() {
        this.balances = {};
        this.transactionHistory = [];
        this.initialized = false;
    }

    /**
     * Initialize currency manager with current balances
     * @param {Object} balances - Current currency balances
     */
    initialize(balances) {
        this.balances = balances || {};
        this.initialized = true;
        this.updateDisplays();
        console.log('Currency manager initialized with balances:', this.balances);
    }

    /**
     * Update all currency displays in the UI
     */
    updateDisplays() {
        if (!this.initialized) return;

        Object.entries(this.balances).forEach(([currency, balance]) => {
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
    }

    /**
     * Check if user can afford given requirements
     * @param {Object} requirements - Currency requirements
     * @returns {boolean} - Whether user can afford
     */
    canAfford(requirements) {
        if (!requirements) return true;

        for (const [currency, amount] of Object.entries(requirements)) {
            if ((this.balances[currency] || 0) < amount) {
                return false;
            }
        }
        return true;
    }

    /**
     * Process a currency trade
     * @param {string} fromCurrency - Currency to trade from
     * @param {string} toCurrency - Currency to trade to
     * @param {number} amount - Amount to trade
     * @returns {Promise<boolean>} - Success status
     */
    async processTrade(fromCurrency, toCurrency, amount) {
        const loadingPercent = dom.createLoadingOverlay('Processing trade...');
        try {
            const response = await api.post('/api/currency/trade', {
                from_currency: fromCurrency,
                to_currency: toCurrency,
                amount: amount
            });

            if (response.success) {
                this.balances = response.new_balances;
                this.updateDisplays();
                dom.showToast('Success', response.message);
                return true;
            } else {
                throw new Error(response.error || 'Failed to trade currencies');
            }
        } catch (error) {
            dom.showToast('Error', error.message || 'Failed to trade currencies');
            return false;
        } finally {
            dom.removeLoadingOverlay(loadingPercent);
        }
    }

    /**
     * Get balance for a specific currency
     * @param {string} currency - Currency symbol
     * @returns {number} - Current balance
     */
    getBalance(currency) {
        return this.balances[currency] || 0;
    }
}

// Create and export singleton instance
const currencyManager = new CurrencyManager();
export { currencyManager as currency };