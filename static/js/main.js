/**
 * Main entry point for the application
 * Imports all modules and initializes the application
 */
import UIUtils from './modules/UIUtils.js';
import CharacterManager from './modules/CharacterManager.js';
import EventHandlers from './modules/EventHandlers.js';
import PaymentManager from './modules/PaymentManager.js';
import NotebookManager from './modules/NotebookManager.js';
import UserProgressManager from './modules/UserProgressManager.js';

// Make modules available globally
window.UIUtils = UIUtils;
window.CharacterManager = CharacterManager;
window.EventHandlers = EventHandlers;
window.PaymentManager = PaymentManager;
window.NotebookManager = NotebookManager;
window.UserProgressManager = UserProgressManager;

// Initialize all modules when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing modules...');

    // Set flag to indicate modules are being imported by main.js
    window.isModuleImported = true;

    try {
        // Initialize UI utilities first (as other modules may depend on it)
        if (UIUtils) {
            // UIUtils typically has no initialization method
        }

        // Initialize character manager
        if (CharacterManager && typeof CharacterManager.initialize === 'function') {
            CharacterManager.initialize();
        }

        // Initialize event handlers
        if (EventHandlers && typeof EventHandlers.initialize === 'function') {
            EventHandlers.initialize();
        }

        // Initialize payment manager
        if (PaymentManager && typeof PaymentManager.initialize === 'function') {
            PaymentManager.initialize();
        }

        // Initialize notebook manager if present in the DOM
        if (NotebookManager) {
            try {
                const notebookElement = document.querySelector('.notebook-container');
                if (notebookElement) {
                    if (typeof NotebookManager.initialize === 'function') {
                        NotebookManager.initialize();
                    } else if (typeof NotebookManager.init === 'function') {
                        NotebookManager.init();
                    }
                } else {
                    console.log('Notebook elements not found in the DOM, skipping initialization');
                }
            } catch (error) {
                console.error('Error initializing Notebook manager:', error);
            }
        }

        // Initialize user progress manager
        if (UserProgressManager && typeof UserProgressManager.initialize === 'function') {
            UserProgressManager.initialize();
        }

        console.log('Modules loaded successfully');
    } catch (error) {
        console.error('Error initializing modules:', error);
    }
});


// Initialize character mentions in story text
function initializeCharacterMentions() {
    const storyContent = document.querySelector('.story-content');
    if (!storyContent) return;

    // Get all character mentions
    const characterMentions = document.querySelectorAll('.character-mention');

    // Add click event to each mention
    characterMentions.forEach(mention => {
        mention.addEventListener('click', function() {
            const characterId = this.dataset.character;
            const targetPortrait = document.querySelector(`.character-portrait-mini[data-character-name="${characterId}"]`);

            // Remove highlight from all portraits
            document.querySelectorAll('.character-mini-img').forEach(img => {
                img.classList.remove('character-mini-highlight');
            });

            // Add highlight to this portrait
            if (targetPortrait) {
                const portraitImg = targetPortrait.querySelector('.character-mini-img');
                portraitImg.classList.add('character-mini-highlight');

                // Scroll to the portrait if needed
                targetPortrait.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

                // Remove highlight after 3 seconds
                setTimeout(() => {
                    portraitImg.classList.remove('character-mini-highlight');
                }, 3000);
            }
        });
    });
}

// Document this issue in the changelog
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on a storyboard page and save the story ID
    const storyIdParam = new URLSearchParams(window.location.search).get('story_id');
    if (storyIdParam) {
        localStorage.setItem('lastStoryId', storyIdParam);
    }

    // Also initialize character highlighting if on storyboard page
    if (document.querySelector('.story-content') && CharacterManager) {
        CharacterManager.highlightCharactersInStory();
    }
    initializeCharacterMentions();
});

// Export for possible import in other modules
export default {
    UIUtils,
    CharacterManager,
    EventHandlers,
    PaymentManager,
    NotebookManager,
    UserProgressManager
};