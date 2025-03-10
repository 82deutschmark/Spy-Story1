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
            console.log('Initializing character selection handlers');

            // Character selection
            document.querySelectorAll('.character-select-card').forEach(card => {
                const container = card.closest('.character-container');
                const checkbox = container.querySelector('.character-checkbox');
                const indicator = card.querySelector('.selection-indicator');

                console.log('Setting up card:', card.dataset.id);

                // Initialize selection state
                if (checkbox?.checked) {
                    card.classList.add('selected');
                    indicator.style.display = 'flex';
                    console.log('Card initially selected:', card.dataset.id);
                }

                // Handle click events
                card.addEventListener('click', (e) => {
                    if (e.target.closest('.reroll-btn')) return; // Don't handle if clicking reroll

                    console.log('Card clicked:', card.dataset.id);
                    checkbox.checked = !checkbox.checked;

                    card.classList.toggle('selected', checkbox.checked);
                    indicator.style.display = checkbox.checked ? 'flex' : 'none';

                    console.log('Updated card state:', {
                        id: card.dataset.id,
                        checked: checkbox.checked,
                        selected: card.classList.contains('selected')
                    });
                });
            });

            // Reroll functionality
            document.querySelectorAll('.reroll-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    const characterId = btn.dataset.id;
                    console.log('Reroll clicked for character:', characterId);

                    const loadingPercent = dom.createLoadingOverlay('Rerolling character...');

                    try {
                        const response = await fetch('/api/random_character', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ current_id: characterId })
                        });

                        const data = await response.json();
                        if (data.success) {
                            window.location.reload(); // Refresh to show new character
                        } else {
                            throw new Error(data.error || 'Failed to reroll character');
                        }
                    } catch (error) {
                        console.error('Reroll error:', error);
                        dom.showToast('Error', 'Failed to reroll character');
                    } finally {
                        dom.removeLoadingOverlay(loadingPercent);
                    }
                });
            });

            // Story generation form
            const storyForm = document.getElementById('storyForm');
            if (storyForm) {
                storyForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const selectedCharacters = document.querySelectorAll('.character-checkbox:checked');
                    console.log('Form submitted. Selected characters:', 
                        Array.from(selectedCharacters).map(cb => cb.value)
                    );

                    if (selectedCharacters.length === 0) {
                        dom.showToast('Error', 'Please select at least one character for your story');
                        return;
                    }

                    const btn = e.target.querySelector('button[type="submit"]');
                    if (btn) btn.disabled = true;

                    try {
                        const formData = new FormData(e.target);
                        selectedCharacters.forEach(checkbox => {
                            formData.append('selected_images[]', checkbox.value);
                        });

                        console.log('Form data:', Array.from(formData.entries())
                            .map(([key, value]) => `${key}: ${value}`)
                            .join(', ')
                        );

                        await story.generate(formData);
                    } catch (error) {
                        console.error('Error generating story:', error);
                        dom.showToast('Error', error.message || 'Failed to generate story');
                    } finally {
                        if (btn) btn.disabled = false;
                    }
                });
            }
        });
    }
};

// Initialize events when script loads
events.init();