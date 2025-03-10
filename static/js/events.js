/**
 * Event handlers and initialization module
 */
import { story } from './story.js';
import { currency } from './currency.js';
import { payment } from './payment.js';
import { dom } from './utils/dom.js';

export const events = {
    /**
     * Initialize all event listeners
     */
    init: () => {
        document.addEventListener('DOMContentLoaded', () => {
            // Story generation form
            const generateStoryForm = document.getElementById('generateStoryForm');
            if (generateStoryForm) {
                generateStoryForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const btn = e.target.querySelector('button[type="submit"]');
                    if (btn) btn.disabled = true;
                    await story.generate(new FormData(e.target));
                    if (btn) btn.disabled = false;
                });
            }

            // Story choice forms
            document.querySelectorAll('.choice-form').forEach(form => {
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const btn = e.target.querySelector('button[type="submit"]');
                    if (btn && !btn.disabled) {
                        btn.disabled = true;
                        const currencyReq = btn.dataset.currencyReq ? 
                            JSON.parse(btn.dataset.currencyReq) : null;
                        await story.makeChoice(new FormData(e.target), currencyReq);
                        btn.disabled = false;
                    }
                });
            });

            // Currency trade form
            const tradeForm = document.getElementById('tradeForm');
            if (tradeForm) {
                tradeForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const fromCurrency = document.getElementById('fromCurrency').value;
                    const toCurrency = document.getElementById('toCurrency').value;
                    const amount = parseInt(document.getElementById('tradeAmount').value);

                    if (!amount || isNaN(amount) || amount <= 0) {
                        dom.showToast('Error', 'Please enter a valid amount', true);
                        return;
                    }

                    await currency.processTrade(fromCurrency, toCurrency, amount);
                });
            }

            // Diamond purchase initialization
            const purchaseModal = document.getElementById('purchaseModal');
            if (purchaseModal) {
                purchaseModal.addEventListener('show.bs.modal', (event) => {
                    const button = event.relatedTarget;
                    const amount = button.getAttribute('data-amount');
                    const clientId = document.getElementById('paypalClientId').value;
                    
                    if (amount && clientId) {
                        payment.initializePurchase(clientId, parseFloat(amount));
                    }
                });
            }
        });
    }
};

// Initialize events when script loads
events.init();
