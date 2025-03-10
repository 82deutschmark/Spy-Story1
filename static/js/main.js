// Handle currency trade form submission
$(document).on('submit', '#tradeForm', function(e) {
    e.preventDefault();

    const fromCurrency = $('#fromCurrency').val();
    const toCurrency = $('#toCurrency').val();
    const amount = $('#tradeAmount').val();

    // Validation
    if (fromCurrency === toCurrency) {
        showNotification('Cannot convert to the same currency type', 'error');
        return;
    }

    if (!amount || amount <= 0) {
        showNotification('Please enter a valid amount', 'error');
        return;
    }

    // Disable submit button during processing
    const submitButton = $(this).find('button[type="submit"]');
    submitButton.prop('disabled', true).html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...');

    // Send trade request
    $.ajax({
        url: '/api/currency/trade',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            from_currency: fromCurrency,
            to_currency: toCurrency,
            amount: parseInt(amount)
        }),
        success: function(response) {
            console.log("Trade successful, new balances:", response.new_balances);

            // Update currency display
            updateCurrencyDisplay(response.new_balances);

            // Show success message
            showNotification(response.message, 'success');

            // Reset form
            $('#tradeAmount').val('');

            // Close modal
            $('#currencyModal').modal('hide');
        },
        error: function(xhr) {
            let message = 'Error processing trade';
            if (xhr.responseJSON && xhr.responseJSON.error) {
                message = xhr.responseJSON.error;
            }
            showNotification(message, 'error');
            console.error("Trade error:", xhr.responseJSON);
        },
        complete: function() {
            // Re-enable submit button
            submitButton.prop('disabled', false).text('Trade');
        }
    });
});

// Function to update currency display in UI
function updateCurrencyDisplay(balances) {
    if (!balances) return;

    // Update all currency displays
    Object.keys(balances).forEach(currency => {
        const amount = balances[currency];
        $(`.currency-${currency}`).text(amount);
        $(`.currency-amount[data-currency="${currency}"]`).text(amount);
    });

    // If elements with class currency-balance exist
    $('.currency-balance').each(function() {
        const currency = $(this).data('currency');
        if (currency && balances[currency] !== undefined) {
            $(this).text(balances[currency]);
        }
    });
}