/**
 * Payment processing module (PayPal integration)
 */
import { api } from './utils/api.js';
import { dom } from './utils/dom.js';
import { currency } from './currency.js';

export const payment = {
    /**
     * Initialize PayPal buttons for diamond purchases
     * @param {string} clientId - PayPal client ID
     * @param {number} amount - Purchase amount
     */
    initializePurchase: async (clientId, amount) => {
        if (!window.paypal) {
            dom.showToast('Error', 'PayPal SDK not loaded', true);
            return;
        }

        try {
            const buttons = paypal.Buttons({
                createOrder: (data, actions) => {
                    return actions.order.create({
                        purchase_units: [{
                            amount: {
                                value: amount.toString()
                            }
                        }]
                    });
                },
                onApprove: async (data, actions) => {
                    const loadingPercent = dom.createLoadingOverlay('Processing purchase...');

                    try {
                        const result = await api.post('/process_purchase', {
                            order_id: data.orderID,
                            amount: amount
                        });

                        if (result.success) {
                            currency.updateDisplays(result.new_balances);
                            dom.showToast('Success', `Successfully purchased diamonds!`);
                            
                            // Close modal if it exists
                            const modal = bootstrap.Modal.getInstance(document.getElementById('purchaseModal'));
                            if (modal) {
                                modal.hide();
                            }
                        } else {
                            throw new Error(result.error || 'Failed to process purchase');
                        }
                    } catch (error) {
                        dom.showToast('Error', error.message || 'Failed to process purchase', true);
                    } finally {
                        dom.removeLoadingOverlay(loadingPercent);
                    }
                },
                onError: (err) => {
                    console.error('PayPal Error:', err);
                    dom.showToast('Error', 'Payment system error. Please try again later.', true);
                }
            });

            await buttons.render('#paypal-button-container');
            console.log('PayPal buttons rendered successfully');
        } catch (error) {
            console.error('Error setting up PayPal buttons:', error);
            dom.showToast('Error', 'Failed to set up payment system', true);
        }
    }
};
