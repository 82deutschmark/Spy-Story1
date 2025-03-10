// This file has been deprecated as currency management is now handled server-side
// Keeping an empty file temporarily to prevent any import errors
// TODO: Remove this file and update any remaining imports
/**
 * Currency management
 */
import { dom } from './utils/dom.js';

export const currency = {
    balances: {},
    initialized: false,
    
    /**
     * Initialize currency with balances
     * @param {Object} balances - Initial currency balances
     */
    initialize(balances) {
        this.balances = balances || {};
        this.initialized = true;
        this.updateUI();
        console.log('Currency initialized with balances:', this.balances);
        
        // Set up event listeners
        this.initEventListeners();
    },
    
    /**
     * Set up currency-related event listeners
     */
    initEventListeners() {
        // Trade form
        const tradeForm = document.getElementById('tradeForm');
        if (tradeForm) {
            tradeForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.processTrade();
            });
        }
        
        // Currency trade offers
        document.querySelectorAll('.accept-trade-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const fromCurrency = e.target.dataset.from;
                const toCurrency = e.target.dataset.to;
                const rate = parseFloat(e.target.dataset.rate);
                const amount = e.target.dataset.amount ? parseFloat(e.target.dataset.amount) : 100;
                this.acceptTradeOffer(fromCurrency, toCurrency, rate, amount);
            });
        });
    },
    
    /**
     * Update currency UI elements
     */
    updateUI() {
        if (!this.initialized) return;
        
        // Update currency amounts in header
        Object.entries(this.balances).forEach(([currency, amount]) => {
            const amountElement = document.getElementById(`${currency.replace('💎', 'diamond-').replace('💷', 'pound-').replace('💶', 'euro-').replace('💴', 'yen-').replace('💵', 'dollar-')}amount`);
            if (amountElement) {
                amountElement.textContent = amount;
            }
        });
        
        // Update currency requirement indicators
        document.querySelectorAll('.currency-req-item').forEach(item => {
            const currencyText = item.textContent.trim();
            const currency = currencyText.charAt(0);
            const amount = parseInt(currencyText.substring(1));
            
            if ((this.balances[currency] || 0) < amount) {
                item.classList.add('currency-req-insufficient');
            } else {
                item.classList.remove('currency-req-insufficient');
            }
        });
        
        // Update choice buttons based on affordability
        document.querySelectorAll('.choice-btn').forEach(button => {
            if (button.dataset.currencyReq) {
                const requirements = JSON.parse(button.dataset.currencyReq);
                const canAfford = this.canAfford(requirements);
                button.disabled = !canAfford;
                button.classList.toggle('insufficient-funds', !canAfford);
            }
        });
    },
    
    /**
     * Check if user can afford currency requirements
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
    },
    
    /**
     * Process a currency trade
     */
    async processTrade() {
        const fromCurrency = document.getElementById('fromCurrency').value;
        const toCurrency = document.getElementById('toCurrency').value;
        const amount = parseInt(document.getElementById('tradeAmount').value);
        
        if (!fromCurrency || !toCurrency || isNaN(amount) || amount <= 0) {
            dom.showToast('Error', 'Please enter valid trade details', true);
            return;
        }
        
        const loadingPercent = dom.addLoadingOverlay('Processing trade...');
        
        try {
            const response = await fetch('/api/currency/trade', {
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
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.balances = data.new_balances;
                this.updateUI();
                dom.showToast('Success', data.message);
                
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('tradeModal'));
                if (modal) {
                    modal.hide();
                }
                
                // Reset form
                document.getElementById('tradeAmount').value = '';
            } else {
                dom.showToast('Error', data.error || 'Failed to trade currencies', true);
            }
        } catch (error) {
            console.error('Error trading currencies:', error);
            dom.showToast('Error', 'Failed to trade currencies', true);
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
        const loadingPercent = dom.addLoadingOverlay('Accepting trade offer...');
        
        try {
            const response = await fetch('/api/currency/trade', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({
                    from_currency: fromCurrency,
                    to_currency: toCurrency,
                    amount: amount,
                    trade_type: 'offer'
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.balances = data.new_balances;
                this.updateUI();
                dom.showToast('Success', 'Trade offer accepted!');
            } else {
                dom.showToast('Error', data.error || 'Failed to accept trade offer.', true);
            }
        } catch (error) {
            console.error('Error accepting trade offer:', error);
            dom.showToast('Error', 'Failed to accept trade offer.', true);
        } finally {
            dom.removeLoadingOverlay(loadingPercent);
        }
    }
};
