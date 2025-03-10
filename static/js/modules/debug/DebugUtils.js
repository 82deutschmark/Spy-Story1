/**
 * Debug utilities for SpyTails
 */
const DebugUtils = {
    /**
     * Log API calls with optional detailed data
     */
    logApiCall: function(endpoint, method, data, response) {
        console.log(`API Call: ${method} ${endpoint}`);
        if (data) console.log('Request data:', data);
        if (response) console.log('Response:', response);
    },

    /**
     * Monitor currency transactions
     */
    monitorCurrencyTransaction: function(fromCurrency, toCurrency, amount, newBalances) {
        console.log(`Currency transaction monitored: ${amount} ${fromCurrency} -> ${toCurrency}`);
        console.log('New balances:', newBalances);

        // Force an immediate UI update with the new balances
        if (window.CurrencyManager && typeof window.CurrencyManager.updateCurrencyDisplays === 'function') {
            console.log('Forcing currency display update with new balances');
            window.CurrencyManager.updateCurrencyDisplays(newBalances);
        } else {
            console.warn('CurrencyManager not available to update displays');
        }

        // Double-check after a short delay to ensure UI reflects the correct values
        setTimeout(() => {
            // Check if UI has been updated correctly
            const fromElements = document.querySelectorAll(`.currency-${fromCurrency}, .currency[data-currency="${fromCurrency}"]`);
            const toElements = document.querySelectorAll(`.currency-${toCurrency}, .currency[data-currency="${toCurrency}"]`);

            // Check "from" currency displays
            fromElements.forEach(el => {
                const displayedAmount = parseInt(el.textContent.trim());
                const expectedAmount = newBalances[fromCurrency];

                if (displayedAmount !== expectedAmount) {
                    console.error(`Source currency display mismatch: ${el.className} shows ${displayedAmount} instead of ${expectedAmount}`);
                    // Try to fix it
                    el.textContent = expectedAmount;
                }
            });

            // Check "to" currency displays
            toElements.forEach(el => {
                const displayedAmount = parseInt(el.textContent.trim());
                const expectedAmount = newBalances[toCurrency];

                if (displayedAmount !== expectedAmount) {
                    console.error(`Target currency display mismatch: ${el.className} shows ${displayedAmount} instead of ${expectedAmount}`);
                    // Try to fix it
                    el.textContent = expectedAmount;
                }
            });
        }, 1000);
    },

    /**
     * Check API response status
     */
    validateApiResponse: function(response) {
        if (!response.success) {
            console.error('API Error:', response.error || 'Unknown error');
            return false;
        }
        return true;
    }
};

export default DebugUtils;