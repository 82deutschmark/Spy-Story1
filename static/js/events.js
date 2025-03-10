/**
 * Event handlers and initialization module
 */
import { story } from './story.js';
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
                        await story.makeChoice(new FormData(e.target));
                        btn.disabled = false;
                    }
                });
            });

            // Handle trade form if it exists (backend processing)
            const tradeForm = document.getElementById('tradeForm');
            if (tradeForm) {
                tradeForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const btn = e.target.querySelector('button[type="submit"]');
                    if (btn) btn.disabled = true;

                    const formData = new FormData(e.target);
                    fetch('/api/currency/trade', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            from_currency: formData.get('fromCurrency'),
                            to_currency: formData.get('toCurrency'),
                            amount: parseInt(formData.get('amount'))
                        })
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            window.location.reload(); // Refresh to show updated balances
                        } else {
                            dom.showToast('Error', data.error || 'Trade failed');
                        }
                    })
                    .catch(error => {
                        console.error('Error:', error);
                        dom.showToast('Error', 'Failed to process trade');
                    })
                    .finally(() => {
                        if (btn) btn.disabled = false;
                    });
                });
            }
        });
    }
};

// Initialize events when script loads
events.init();