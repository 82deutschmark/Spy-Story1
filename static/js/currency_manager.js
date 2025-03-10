
/**
 * Currency Manager for handling in-game currency and transactions
 */
class CurrencyManager {
    constructor() {
        this.balances = {};
        this.transactionHistory = [];
        this.initialized = false;
        
        // Initialize event listeners
        this.initEventListeners();
    }
    
    /**
     * Initialize currency manager with current balances
     * @param {Object} balances - Current currency balances
     */
    initialize(balances) {
        this.balances = balances || {};
        this.initialized = true;
        this.updateUI();
        console.log('Currency manager initialized with balances:', this.balances);
    }
    
    /**
     * Initialize event listeners for currency-related interactions
     */
    initEventListeners() {
        // Listen for trade form submissions
        document.addEventListener('DOMContentLoaded', () => {
            const tradeForm = document.getElementById('currencyTradeForm');
            if (tradeForm) {
                tradeForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.processTrade();
                });
            }
            
            // Listen for trade offer buttons
            document.querySelectorAll('.accept-trade-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const fromCurrency = e.target.dataset.from;
                    const toCurrency = e.target.dataset.to;
                    const rate = parseFloat(e.target.dataset.rate);
                    
                    this.showTradeModal(fromCurrency, toCurrency, rate);
                });
            });
            
            // Initialize trade modal if it exists
            const tradeModal = document.getElementById('tradeModal');
            if (tradeModal) {
                const fromCurrencySelect = document.getElementById('fromCurrency');
                if (fromCurrencySelect) {
                    fromCurrencySelect.addEventListener('change', () => {
                        this.updateTradeOptions();
                    });
                }
            }
        });
    }
    
    /**
     * Update UI elements with current balances
     */
    updateUI() {
        if (!this.initialized) return;
        
        // Update currency display in header
        const currencyDisplay = document.getElementById('currencyDisplay');
        if (currencyDisplay) {
            let html = '';
            for (const [currency, amount] of Object.entries(this.balances)) {
                html += `<div class="currency-item">${currency} ${amount}</div>`;
            }
            currencyDisplay.innerHTML = html;
        }
        
        // Update any choice buttons that might be disabled due to insufficient funds
        document.querySelectorAll('.choice-form button').forEach(button => {
            if (button.dataset.currencyReq) {
                const requirements = JSON.parse(button.dataset.currencyReq);
                const canAfford = this.canAfford(requirements);
                button.disabled = !canAfford;
                
                // Update styling
                if (canAfford) {
                    button.classList.remove('insufficient-funds');
                } else {
                    button.classList.add('insufficient-funds');
                }
            }
        });
        
        // Update currency requirement displays
        document.querySelectorAll('.currency-req-item').forEach(item => {
            const currencyText = item.textContent.trim();
            const currency = currencyText.charAt(0);
            const amount = parseInt(currencyText.substring(1));
            
            if (this.balances[currency] < amount) {
                item.classList.add('currency-req-insufficient');
            } else {
                item.classList.remove('currency-req-insufficient');
            }
        });
    }
    
    /**
     * Check if user can afford the given requirements
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
     */
    processTrade() {
        const fromCurrency = document.getElementById('fromCurrency').value;
        const toCurrency = document.getElementById('toCurrency').value;
        const amount = parseInt(document.getElementById('tradeAmount').value);
        
        if (!fromCurrency || !toCurrency || isNaN(amount) || amount <= 0) {
            showToast('Error', 'Please enter valid trade details');
            return;
        }
        
        // Show loading overlay
        const loadingPercent = addLoadingOverlay('Processing trade...');
        
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
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Update balances
                this.balances = data.new_balances;
                this.updateUI();
                
                // Show success message
                showToast('Success', data.message);
                
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('tradeModal'));
                if (modal) {
                    modal.hide();
                }
                
                // Reset form
                document.getElementById('tradeAmount').value = '';
            } else {
                showToast('Error', data.error || 'Failed to trade currencies');
            }
            removeLoadingOverlay(loadingPercent);
        })
        .catch(error => {
            console.error('Error trading currencies:', error);
            showToast('Error', 'Failed to trade currencies');
            removeLoadingOverlay(loadingPercent);
        });
    }
    
    /**
     * Show the trade modal with specific currencies pre-selected
     * @param {string} fromCurrency - Currency to trade from
     * @param {string} toCurrency - Currency to trade to
     * @param {number} rate - Exchange rate
     */
    showTradeModal(fromCurrency, toCurrency, rate) {
        const modal = document.getElementById('tradeModal');
        if (!modal) return;
        
        // Set modal values
        const fromSelect = document.getElementById('fromCurrency');
        const toSelect = document.getElementById('toCurrency');
        
        if (fromSelect && fromCurrency) {
            fromSelect.value = fromCurrency;
        }
        
        if (toSelect && toCurrency) {
            toSelect.value = toCurrency;
        }
        
        // Show exchange rate info
        const rateInfo = document.getElementById('exchangeRateInfo');
        if (rateInfo && rate) {
            rateInfo.textContent = `Exchange Rate: 1 ${fromCurrency} = ${rate} ${toCurrency}`;
            rateInfo.style.display = 'block';
        }
        
        // Show modal
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
        
        // Update available options
        this.updateTradeOptions();
    }
    
    /**
     * Update trade options based on selected 'from' currency
     */
    updateTradeOptions() {
        const fromCurrency = document.getElementById('fromCurrency').value;
        const toSelect = document.getElementById('toCurrency');
        
        if (!fromCurrency || !toSelect) return;
        
        // Clear existing options
        toSelect.innerHTML = '';
        
        // Get allowed conversion targets
        const allowedTargets = this.getAllowedConversionTargets(fromCurrency);
        
        // Add new options
        allowedTargets.forEach(currency => {
            const option = document.createElement('option');
            option.value = currency;
            option.textContent = currency;
            toSelect.appendChild(option);
        });
        
        // Update current balance display
        const balanceDisplay = document.getElementById('currentFromBalance');
        if (balanceDisplay) {
            balanceDisplay.textContent = `Current Balance: ${this.balances[fromCurrency] || 0} ${fromCurrency}`;
        }
    }
    
    /**
     * Get allowed conversion targets for a currency
     * @param {string} fromCurrency - Source currency
     * @returns {Array} - Array of allowed target currencies
     */
    getAllowedConversionTargets(fromCurrency) {
        // Define allowed conversions based on game rules
        const conversionRules = {
            "💎": ["💶", "💴"],
            "💶": ["💴", "💵", "💷"],
            "💴": ["💶", "💵", "💷"],
            "💵": ["💶", "💴", "💷"],
            "💷": ["💶", "💴", "💵"]
        };
        
        return conversionRules[fromCurrency] || [];
    }
    
    /**
     * Update balances after a transaction
     * @param {Object} newBalances - Updated balances from server
     */
    updateBalances(newBalances) {
        this.balances = newBalances;
        this.updateUI();
    }
    
    /**
     * Process a choice selection
     * @param {string} choiceId - ID of the selected choice
     * @param {Object} requirements - Currency requirements
     * @param {Function} callback - Callback after processing
     */
    processChoice(choiceId, requirements, callback) {
        // Check if user can afford
        if (!this.canAfford(requirements)) {
            showToast('Error', 'Insufficient funds for this choice');
            return;
        }
        
        // Show loading overlay
        const loadingPercent = addLoadingOverlay('Processing choice...');
        
        // Send choice request to server
        fetch('/make_choice', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({
                choice_id: choiceId
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Update balances
                this.balances = data.new_balances;
                this.updateUI();
                
                // Call callback if provided
                if (callback && typeof callback === 'function') {
                    callback(data);
                }
            } else {
                showToast('Error', data.error || 'Failed to process choice');
            }
            removeLoadingOverlay(loadingPercent);
        })
        .catch(error => {
            console.error('Error processing choice:', error);
            showToast('Error', 'Failed to process choice');
            removeLoadingOverlay(loadingPercent);
        });
    }
    
    /**
     * Process a custom choice
     * @param {string} customText - Custom choice text
     * @param {Function} callback - Callback after processing
     */
    processCustomChoice(customText, callback) {
        // Check if user has enough diamonds
        if ((this.balances['💎'] || 0) < 100) {
            showToast('Error', 'Custom choices require 100 💎');
            return;
        }
        
        // Show loading overlay
        const loadingPercent = addLoadingOverlay('Processing custom choice...');
        
        // Send custom choice request to server
        fetch('/make_choice', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({
                custom_choice: customText
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Update balances
                this.balances = data.new_balances;
                this.updateUI();
                
                // Call callback if provided
                if (callback && typeof callback === 'function') {
                    callback(data);
                }
            } else {
                showToast('Error', data.error || 'Failed to process custom choice');
            }
            removeLoadingOverlay(loadingPercent);
        })
        .catch(error => {
            console.error('Error processing custom choice:', error);
            showToast('Error', 'Failed to process custom choice');
            removeLoadingOverlay(loadingPercent);
        });
    }
}

// Create and export the currency manager instance
const currencyManager = new CurrencyManager();
window.currencyManager = currencyManager;
