
/**
 * Currency Handler Module
 * Responsible for all currency-related operations and UI updates
 */
const CurrencyHandler = (function() {
    // Internal state
    let balances = {};
    
    /**
     * Initialize currency displays and event listeners
     * @param {Object} initialBalances - Initial currency balances
     */
    function initialize(initialBalances) {
        balances = initialBalances || {};
        updateCurrencyDisplay();
        console.log('Currency handler initialized with balances:', balances);
    }
    
    /**
     * Update UI to reflect current currency balances
     */
    function updateCurrencyDisplay() {
        // Update currency display in header
        const currencyDisplay = document.getElementById('currencyDisplay');
        if (currencyDisplay) {
            let html = '';
            for (const [currency, amount] of Object.entries(balances)) {
                html += `<div class="currency-item">${currency} ${amount}</div>`;
            }
            currencyDisplay.innerHTML = html;
        }
        
        // Update choice buttons based on affordability
        updateChoiceButtonsAffordability();
    }
    
    /**
     * Update choice buttons based on whether player can afford them
     */
    function updateChoiceButtonsAffordability() {
        document.querySelectorAll('.choice-form button').forEach(button => {
            if (button.dataset.currencyReq) {
                const requirements = JSON.parse(button.dataset.currencyReq);
                const canAfford = canPlayerAfford(requirements);
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

            if (balances[currency] < amount) {
                item.classList.add('currency-req-insufficient');
            } else {
                item.classList.remove('currency-req-insufficient');
            }
        });
    }
    
    /**
     * Check if player can afford the given requirements
     * @param {Object} requirements - Currency requirements
     * @returns {boolean} - Whether player can afford
     */
    function canPlayerAfford(requirements) {
        if (!requirements) return true;

        for (const [currency, amount] of Object.entries(requirements)) {
            if ((balances[currency] || 0) < amount) {
                return false;
            }
        }
        return true;
    }
    
    /**
     * Update balances with new values
     * @param {Object} newBalances - Updated balances from server
     */
    function updateBalances(newBalances) {
        balances = newBalances;
        updateCurrencyDisplay();
    }
    
    /**
     * Get current currency balances
     * @returns {Object} - Current balances
     */
    function getBalances() {
        return {...balances};
    }
    
    /**
     * Process a trade offer acceptance
     * @param {string} fromCurrency - Currency being traded from
     * @param {string} toCurrency - Currency being traded to
     * @param {number} rate - Exchange rate
     * @param {number} amount - Amount to trade
     */
    function acceptTradeOffer(fromCurrency, toCurrency, rate, amount) {
        const tradeAmount = amount || 100;
        const loadingPercent = UI.addLoadingOverlay('Accepting trade offer...');

        fetch('/api/currency/trade', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({
                from_currency: fromCurrency,
                to_currency: toCurrency,
                amount: tradeAmount,
                trade_type: 'offer'
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                updateBalances(data.new_balances);
                UI.showToast('Success', 'Trade offer accepted!');
            } else {
                UI.showToast('Error', data.error || 'Failed to accept trade offer.');
            }
            UI.removeLoadingOverlay(loadingPercent);
        })
        .catch(error => {
            console.error('Error accepting trade offer:', error);
            UI.showToast('Error', 'Failed to accept trade offer.');
            UI.removeLoadingOverlay(loadingPercent);
        });
    }
    
    // Return public API
    return {
        initialize,
        updateBalances,
        getBalances,
        canPlayerAfford,
        acceptTradeOffer
    };
})();

// Export the module
window.CurrencyHandler = CurrencyHandler;
