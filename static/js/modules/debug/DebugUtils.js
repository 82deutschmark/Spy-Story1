
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
        console.log(`Currency Transaction: ${amount} ${fromCurrency} → ${toCurrency}`);
        console.log('New balances:', newBalances);
        
        // Track the DOM update for currencies
        setTimeout(() => {
            const currencyElements = {};
            document.querySelectorAll('.currency').forEach(el => {
                const currency = el.getAttribute('data-currency');
                const displayed = el.textContent;
                if (!currencyElements[currency]) {
                    currencyElements[currency] = [];
                }
                currencyElements[currency].push({
                    element: el,
                    displayed: displayed
                });
            });
            console.log('Currency display elements:', currencyElements);
        }, 500); // Check after a delay to allow for DOM updates
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
