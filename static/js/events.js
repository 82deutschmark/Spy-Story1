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
            // Character selection
            document.querySelectorAll('.select-character-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const characterId = e.target.dataset.characterId;
                    const checkbox = document.getElementById(`character${characterId}`);
                    if (checkbox) {
                        checkbox.checked = !checkbox.checked;
                        // Update visual selection
                        const card = e.target.closest('.character-container');
                        const indicator = card.querySelector('.selection-indicator');
                        if (indicator) {
                            indicator.style.display = checkbox.checked ? 'block' : 'none';
                        }
                    }
                });
            });

            // Story generation form
            const storyForm = document.getElementById('storyForm');
            if (storyForm) {
                storyForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const selectedCharacters = document.querySelectorAll('.character-checkbox:checked');

                    if (selectedCharacters.length === 0) {
                        dom.showToast('Error', 'Please select at least one character for your story');
                        return;
                    }

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