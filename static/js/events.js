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
            document.querySelectorAll('.character-select-card').forEach(card => {
                const container = card.closest('.character-container');
                const checkbox = container.querySelector('.character-checkbox');
                const indicator = card.querySelector('.selection-indicator');

                // Initialize selected state if checkbox is checked
                if (checkbox.checked) {
                    card.classList.add('selected');
                    indicator.style.display = 'flex';
                }

                // Handle click events for character selection
                card.addEventListener('click', () => {
                    checkbox.checked = !checkbox.checked;
                    card.classList.toggle('selected', checkbox.checked);
                    indicator.style.display = checkbox.checked ? 'flex' : 'none';
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

                    try {
                        const formData = new FormData(e.target);
                        // Ensure selected characters are properly added to form data
                        selectedCharacters.forEach(checkbox => {
                            formData.append('selected_images[]', checkbox.value);
                        });
                        await story.generate(formData);
                    } catch (error) {
                        console.error('Error generating story:', error);
                        dom.showToast('Error', error.message || 'Failed to generate story');
                    } finally {
                        if (btn) btn.disabled = false;
                    }
                });
            }

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