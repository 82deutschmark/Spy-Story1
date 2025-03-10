/**
 * Currency management system
 */
import { dom } from './utils/dom.js';
import { api } from './utils/api.js';

export const currency = {
    balances: {},

    /**
     * Initialize currency system with current balances
     * @param {Object} initialBalances - Initial currency balances
     */
    initialize(initialBalances) {
        this.balances = initialBalances || {};
        this.updateUI();
        console.log('Currency system initialized with balances:', this.balances);

        // Initialize event listeners
        this.initEventListeners();
    },

    /**
     * Initialize event listeners for currency UI elements
     */
    initEventListeners() {
        // Trade form submission
        const tradeForm = document.getElementById('tradeForm');
        if (tradeForm) {
            tradeForm.addEventListener('submit', async (e) => {
                e.preventDefault();

                const fromCurrency = document.getElementById('fromCurrency').value;
                const toCurrency = document.getElementById('toCurrency').value;
                const amount = parseInt(document.getElementById('tradeAmount').value);

                if (!fromCurrency || !toCurrency || isNaN(amount) || amount <= 0) {
                    dom.showToast('Invalid Trade', 'Please enter valid trade details');
                    return;
                }

                try {
                    const data = await api.postForm('/api/currency/trade', new FormData(tradeForm), 'Processing trade...');

                    if (data.success) {
                        this.balances = data.new_balances;
                        this.updateUI();
                        dom.showToast('Trade Complete', data.message || 'Trade completed successfully');

                        // Close modal
                        const modal = bootstrap.Modal.getInstance(document.getElementById('tradeModal'));
                        if (modal) {
                            modal.hide();
                        }
                    } else {
                        dom.showToast('Trade Failed', data.error || 'Failed to complete trade', true);
                    }
                } catch (error) {
                    console.error('Error trading currencies:', error);
                    dom.showToast('Error', 'Failed to process trade', true);
                }
            });
        }

        // Trade offer acceptance
        document.querySelectorAll('.accept-trade-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const fromCurrency = e.target.dataset.from;
                const toCurrency = e.target.dataset.to;
                const rate = parseFloat(e.target.dataset.rate);
                const amount = parseInt(e.target.dataset.amount || '100');

                if (!fromCurrency || !toCurrency || isNaN(rate) || isNaN(amount)) {
                    dom.showToast('Invalid Trade', 'Trade offer details are invalid');
                    return;
                }

                try {
                    const formData = new FormData();
                    formData.append('from_currency', fromCurrency);
                    formData.append('to_currency', toCurrency);
                    formData.append('amount', amount);
                    formData.append('rate', rate);

                    const data = await api.postForm('/api/currency/trade', formData, 'Processing trade offer...');

                    if (data.success) {
                        this.balances = data.new_balances;
                        this.updateUI();
                        dom.showToast('Trade Complete', data.message || 'Trade completed successfully');
                    } else {
                        dom.showToast('Trade Failed', data.error || 'Failed to complete trade', true);
                    }
                } catch (error) {
                    console.error('Error accepting trade offer:', error);
                    dom.showToast('Error', 'Failed to process trade offer', true);
                }
            });
        });
    },

    /**
     * Update currency UI elements with current balances
     */
    updateUI() {
        // Update currency display in the top bar
        Object.entries(this.balances).forEach(([currency, amount]) => {
            const amountEl = document.querySelector(`.currency-item[data-currency="${currency}"] .currency-amount`);
            if (amountEl) {
                amountEl.textContent = amount;
            }
        });

        // Update any choice buttons that might have currency requirements
        document.querySelectorAll('.choice-btn').forEach(button => {
            if (button.dataset.currencyReq) {
                try {
                    const requirements = JSON.parse(button.dataset.currencyReq);
                    const canAfford = this.canAfford(requirements);
                    button.disabled = !canAfford;
                    button.classList.toggle('insufficient-funds', !canAfford);
                } catch (e) {
                    console.error('Error parsing currency requirements:', e);
                }
            }
        });

        // Update currency requirement indicators
        document.querySelectorAll('.currency-req-item').forEach(item => {
            const currencyText = item.textContent.trim();
            const currencySymbol = currencyText.charAt(0);
            const amountText = currencyText.substring(1);
            const amount = parseInt(amountText);

            if (!isNaN(amount) && this.balances[currencySymbol] < amount) {
                item.classList.add('currency-req-insufficient');
            } else {
                item.classList.remove('currency-req-insufficient');
            }
        });
    },

    /**
     * Check if user can afford specified currency requirements
     * @param {Object} requirements - Currency requirements object
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
};