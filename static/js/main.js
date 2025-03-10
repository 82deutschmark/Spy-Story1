
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
        console.log('DOM loaded, checking PayPal integration...');
        
        // Initialize currency manager with initial balances
        const initialBalancesEl = document.getElementById('initialBalances');
        if (initialBalancesEl) {
            const initialBalances = JSON.parse(initialBalancesEl.value);
            currency.initialize(initialBalances);
        }
        
        // Initialize character selection
        character.initialize();
        
        // Handle story form submission
        const storyForm = document.getElementById('storyForm');
        if (storyForm) {
            storyForm.addEventListener('submit', (e) => {
                e.preventDefault();
                story.generate(new FormData(storyForm));
            });
        }
        
        // Handle story choice forms
        document.addEventListener('submit', (e) => {
            if (!e.target.classList.contains('choice-form')) return;
            e.preventDefault();

            const btn = e.target.querySelector('button');
            const currencyReq = btn.dataset.currencyReq ? 
                JSON.parse(btn.dataset.currencyReq) : null;

            story.makeChoice(new FormData(e.target), currencyReq);
        });

        // Initialize character highlighting
        character.initializeHighlighting();
        
        // Initialize PayPal
        console.log('Initializing PayPal integration...');
        console.log('PayPal Client ID available:', !!document.getElementById('paypalClientId'));
        console.log('PayPal SDK loaded:', typeof paypal !== 'undefined');
        console.log('PayPal button container exists:', !!document.getElementById('paypal-button-container'));

    } catch (error) {
        console.error('Error during initialization:', error);
        dom.showToast('Error', 'Failed to initialize application', true);
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
