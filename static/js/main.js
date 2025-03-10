/**
 * Main application entry point
 */
import { events } from './events.js';
import { dom } from './utils/dom.js';
import { currency } from './currency.js';

// Initialize main features when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize all event handlers
    events.init();

    // Show loading overlay for initial page load
    const loadingPercent = dom.createLoadingOverlay('Loading application...');
    try {
        // Update any existing currency displays
        const currencyDisplays = document.querySelectorAll('.currency-display');
        if (currencyDisplays.length > 0) {
            currency.updateDisplays(window.initialBalances || {});
        }

        dom.removeLoadingOverlay(loadingPercent);
    } catch (error) {
        console.error('Error during initialization:', error);
        dom.showToast('Error', 'Failed to initialize application');
        dom.removeLoadingOverlay(loadingPercent);
    }
});

// Handle debug mode and character highlighting
document.addEventListener('DOMContentLoaded', () => {
    // Edit mode switch functionality
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