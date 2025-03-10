
/**
 * Main application entry point
 */
import { currency } from './currency.js';
import { dom } from './utils/dom.js';
import { story } from './story.js';
import { character } from './character.js';

// Initialize main features when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log('DOM loaded, initializing application...');
        
        // Initialize currency manager with initial balances
        const initialBalancesEl = document.getElementById('initialBalances');
        if (initialBalancesEl) {
            try {
                const initialBalances = JSON.parse(initialBalancesEl.value);
                if (typeof currency !== 'undefined' && currency.initialize) {
                    currency.initialize(initialBalances);
                }
            } catch (e) {
                console.error('Error parsing initial balances:', e);
            }
        }
        
        // Initialize character selection if the function exists
        if (typeof character !== 'undefined' && character.initialize) {
            character.initialize();
        }
        
        // Handle story form submission
        const storyForm = document.getElementById('storyForm');
        if (storyForm) {
            storyForm.addEventListener('submit', (e) => {
                e.preventDefault();
                
                // Check if at least one character is selected
                const selectedCharacters = document.querySelectorAll('.character-checkbox:checked');
                if (selectedCharacters.length === 0) {
                    const characterSelectionError = document.getElementById('characterSelectionError');
                    if (characterSelectionError) {
                        characterSelectionError.style.display = 'block';
                        characterSelectionError.textContent = 'Please select a character for your story';
                        window.scrollTo(0, 0);
                    }
                    if (typeof dom !== 'undefined' && dom.showToast) {
                        dom.showToast('Selection Needed', 'Please select a character before continuing');
                    }
                    return;
                }
                
                // Hide error message if shown
                const characterSelectionError = document.getElementById('characterSelectionError');
                if (characterSelectionError) {
                    characterSelectionError.style.display = 'none';
                }
                
                // Make sure hidden inputs are updated with selected characters
                if (typeof character !== 'undefined' && character.updateSelectedImagesInput) {
                    character.updateSelectedImagesInput();
                }
                
                // Generate the story
                if (typeof story !== 'undefined' && story.generate) {
                    story.generate(new FormData(storyForm));
                } else {
                    // Submit form normally if story module is not available
                    storyForm.submit();
                }
            });
        }
        
        // Handle story choice forms
        document.addEventListener('submit', (e) => {
            if (!e.target.classList.contains('choice-form')) return;
            e.preventDefault();

            const btn = e.target.querySelector('button');
            const currencyReq = btn && btn.dataset.currencyReq ? 
                JSON.parse(btn.dataset.currencyReq) : null;

            if (typeof story !== 'undefined' && story.makeChoice) {
                story.makeChoice(new FormData(e.target), currencyReq);
            } else {
                // Submit form normally if story module is not available
                e.target.submit();
            }
        });

        // Initialize character highlighting if the function exists
        if (typeof character !== 'undefined' && character.initializeHighlighting) {
            character.initializeHighlighting();
        }
        
        // Check PayPal loading status
        window.addEventListener('load', () => {
            console.log('Window loaded, checking PayPal status:');
            console.log('PayPal SDK loaded:', typeof paypal !== 'undefined');
            console.log('PayPal button container exists:', !!document.getElementById('paypal-button-container'));
        });

    } catch (error) {
        console.error('Error during initialization:', error);
        if (typeof dom !== 'undefined' && dom.showToast) {
            dom.showToast('Error', 'Failed to initialize application');
        }
    }
});

// Debug mode switch functionality
document.addEventListener('DOMContentLoaded', () => {
    const editModeSwitch = document.getElementById('editModeSwitch');
    const generatedContent = document.getElementById('generatedContent');

    if (editModeSwitch && generatedContent) {
        editModeSwitch.addEventListener('change', function() {
            generatedContent.contentEditable = this.checked;
            generatedContent.classList.toggle('editable', this.checked);
            if (this.checked) {
                generatedContent.focus();
            }
        });
    }
});
