
/**
 * Currency management module
 */
import { dom } from './utils/dom.js';
import { api } from './utils/api.js';

export const currency = {
    balances: {},
    transactionHistory: [],
    
    /**
     * Initialize currency manager with balances
     * @param {Object} balances - Initial currency balances
     */
    initialize(balances) {
        this.balances = balances || {};
        console.log('Currency initialized with balances:', this.balances);
        this.updateUI();
        this.setupEventListeners();
    },
    
    /**
     * Setup event listeners for currency-related functionality
     */
    setupEventListeners() {
        // Trade form
        const tradeForm = document.getElementById('tradeForm');
        if (tradeForm) {
            tradeForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.processTrade();
            });
        }
        
        // Trade offers
        document.querySelectorAll('.accept-trade-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const fromCurrency = btn.dataset.from;
                const toCurrency = btn.dataset.to;
                const rate = parseFloat(btn.dataset.rate);
                const amount = parseInt(btn.dataset.amount || 100);
                this.acceptTradeOffer(fromCurrency, toCurrency, rate, amount);
            });
        });
    },
    
    /**
     * Update UI elements with current balances
     */
    updateUI() {
        // Update currency displays
        document.querySelectorAll('.currency-amount').forEach(el => {
            const currencySymbol = el.previousElementSibling?.textContent;
            if (currencySymbol && this.balances[currencySymbol]) {
                el.textContent = this.balances[currencySymbol];
            }
        });
        
        // Update choice button states based on available currency
        document.querySelectorAll('.choice-btn').forEach(btn => {
            if (btn.dataset.currencyReq) {
                const requirements = JSON.parse(btn.dataset.currencyReq);
                const canAfford = this.canAfford(requirements);
                btn.disabled = !canAfford;
                btn.classList.toggle('insufficient-funds', !canAfford);
            }
        });
    },
    
    /**
     * Process a currency trade
     */
    async processTrade() {
        const fromCurrency = document.getElementById('fromCurrency').value;
        const toCurrency = document.getElementById('toCurrency').value;
        const amount = parseInt(document.getElementById('tradeAmount').value);
        
        if (!fromCurrency || !toCurrency || isNaN(amount) || amount <= 0) {
            dom.showToast('Error', 'Please enter valid trade details');
            return;
        }
        
        const loadingPercent = dom.createLoadingOverlay('Processing trade...');
        
        try {
            const response = await api.post('/api/currency/trade', {
                from_currency: fromCurrency,
                to_currency: toCurrency,
                amount: amount
            });
            
            if (response.success) {
                this.balances = response.new_balances;
                this.updateUI();
                dom.showToast('Success', response.message || 'Trade completed successfully');
                
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('tradeModal'));
                if (modal) modal.hide();
                
                // Reset form
                document.getElementById('tradeAmount').value = '';
            } else {
                dom.showToast('Error', response.error || 'Failed to trade currencies');
            }
        } catch (error) {
            console.error('Error trading currencies:', error);
            dom.showToast('Error', 'Failed to process trade');
        } finally {
            dom.removeLoadingOverlay(loadingPercent);
        }
    },
    
    /**
     * Accept a trade offer
     * @param {string} fromCurrency - Currency to trade from
     * @param {string} toCurrency - Currency to trade to
     * @param {number} rate - Exchange rate
     * @param {number} amount - Amount to trade
     */
    async acceptTradeOffer(fromCurrency, toCurrency, rate, amount) {
        const loadingPercent = dom.createLoadingOverlay('Processing trade offer...');
        
        try {
            const response = await api.post('/api/currency/trade', {
                from_currency: fromCurrency,
                to_currency: toCurrency,
                amount: amount,
                trade_type: 'offer'
            });
            
            if (response.success) {
                this.balances = response.new_balances;
                this.updateUI();
                dom.showToast('Success', 'Trade offer accepted!');
            } else {
                dom.showToast('Error', response.error || 'Failed to accept trade offer');
            }
        } catch (error) {
            console.error('Error accepting trade offer:', error);
            dom.showToast('Error', 'Failed to process trade offer');
        } finally {
            dom.removeLoadingOverlay(loadingPercent);
        }
    },
    
    /**
     * Check if user can afford requirements
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
};
