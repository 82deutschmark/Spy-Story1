/**
 * Payment Manager Module
 * Handles PayPal integration and diamond purchases
 */
import UIUtils from './UIUtils.js';
import CurrencyManager from './CurrencyManager.js';

export default {
    // Default values for diamond packages
    selectedAmount: 100,
    selectedPrice: 1,

    /**
     * Initializes PayPal buttons and event handlers
     */
    initializePayPal() {
        console.log('Initializing PayPal integration...');
        const container = document.getElementById('paypal-button-container');

        if (!container) {
            console.error('PayPal button container not found');
            return;
        }

        // Dynamically load PayPal SDK
        const script = document.createElement('script');
        script.src = `https://www.paypal.com/sdk/js?client-id=${paypalClientId}&currency=USD`;
        script.async = true;

        script.onload = () => {
            console.log("PayPal SDK loaded successfully");
            this.renderPayPalButtons();
        };

        script.onerror = () => {
            console.error("Failed to load PayPal SDK");
            UIUtils.showToast('Error', 'Payment system not available. Please try again later.');
        };

        document.body.appendChild(script);
        return;


        // Handle diamond package selection
        document.querySelectorAll('.diamond-package').forEach(button => {
            button.addEventListener('click', () => {
                this.selectedAmount = parseInt(button.dataset.amount);
                this.selectedPrice = parseInt(button.dataset.price);
                console.log(`Selected package: ${this.selectedAmount} diamonds for $${this.selectedPrice}`);

                // Update active state
                document.querySelectorAll('.diamond-package').forEach(btn => {
                    btn.classList.remove('active');
                });
                button.classList.add('active');

                // Re-render PayPal buttons
                this.renderPayPalButtons();
            });
        });

        this.renderPayPalButtons();
    },

    /**
     * Renders PayPal checkout buttons
     */
    renderPayPalButtons() {
        console.log('Rendering PayPal buttons...');
        const container = document.getElementById('paypal-button-container');
        if (!container) return;

        container.innerHTML = ''; // Clear existing buttons

        try {
            paypal.Buttons({
                createOrder: (data, actions) => {
                    console.log(`Creating order for ${this.selectedAmount} diamonds at $${this.selectedPrice}`);
                    return actions.order.create({
                        purchase_units: [{
                            amount: {
                                value: this.selectedPrice.toString(),
                                currency_code: 'USD'
                            },
                            description: `Purchase ${this.selectedAmount} diamonds 💎`
                        }]
                    });
                },
                onApprove: (data, actions) => {
                    console.log('Payment approved, capturing funds...');
                    return actions.order.capture().then(() => {
                        // Show loading state
                        const loadingPercent = UIUtils.createLoadingOverlay('Processing payment...');
                        UIUtils.updateLoadingPercent(loadingPercent, 50);

                        // Handle successful payment
                        return fetch('/api/purchase/diamonds/success', {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/json'
                            }
                        })
                            .then(response => response.json())
                            .then(data => {
                                UIUtils.updateLoadingPercent(loadingPercent, 100);
                                if (data.success) {
                                    // Update all currency displays with new balance
                                    CurrencyManager.updateCurrencyDisplays(data.new_balances);
                                    UIUtils.showToast('Success', `Successfully purchased ${this.selectedAmount} diamonds!`);

                                    // Close modal
                                    const modal = bootstrap.Modal.getInstance(document.getElementById('purchaseModal'));
                                    if (modal) {
                                        modal.hide();
                                    }
                                } else {
                                    UIUtils.showToast('Error', data.error || 'Failed to process purchase');
                                }
                                UIUtils.removeLoadingOverlay(loadingPercent);
                            })
                            .catch(error => {
                                console.error('Error processing purchase:', error);
                                UIUtils.showToast('Error', 'Failed to process purchase');
                                UIUtils.removeLoadingOverlay(loadingPercent);
                            });
                    });
                },
                onError: function(err) {
                    console.error('PayPal button error:', err);
                    UIUtils.showToast('Error', 'Payment system error. Please try again later.');
                }
            }).render('#paypal-button-container')
                .then(() => {
                    console.log('PayPal buttons rendered successfully');
                })
                .catch(err => {
                    console.error('Error rendering PayPal buttons:', err);
                    UIUtils.showToast('Error', 'Failed to initialize payment system');
                });
        } catch (error) {
            console.error('Error setting up PayPal buttons:', error);
            UIUtils.showToast('Error', 'Failed to set up payment system');
        }
    }
};