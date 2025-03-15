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

// Set flag to indicate we're importing modules
window.isModuleImported = true;

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded - initializing application');

    // Initialize modules
    if (window.EventHandlers && typeof window.EventHandlers.initialize === 'function') {
        try {
            console.log('Initializing EventHandlers module');
            window.EventHandlers.initialize();
        } catch (error) {
            console.error('Error initializing EventHandlers:', error);
        }
    }

    if (window.CharacterManager && typeof window.CharacterManager.initialize === 'function') {
        try {
            console.log('Initializing CharacterManager module');
            window.CharacterManager.initialize();
        } catch (error) {
            console.error('Error initializing CharacterManager:', error);
        }
    }

    if (window.PaymentManager && typeof window.PaymentManager.initialize === 'function') {
        try {
            console.log('Initializing PaymentManager module');
            // PaymentManager is initialized inside EventHandlers
            // window.PaymentManager.initialize();
        } catch (error) {
            console.error('Error initializing PaymentManager:', error);
        }
    }

    if (window.UserProgressManager && typeof window.UserProgressManager.initialize === 'function') {
        try {
            console.log('Initializing UserProgressManager module');
            window.UserProgressManager.initialize();
        } catch (error) {
            console.error('Error initializing UserProgressManager:', error);
        }
    }

    if (window.NotebookManager && typeof window.NotebookManager.initialize === 'function') {
        try {
            console.log('Initializing NotebookManager module');
            window.NotebookManager.initialize();
        } catch (error) {
            console.error('Error initializing NotebookManager:', error);
        }
    }

    // Setup any global event listeners that aren't in EventHandlers
    setupGlobalListeners();
});

/**
 * Setup global event listeners
 */
function setupGlobalListeners() {
    // Back to top button
    const backToTopBtn = document.getElementById('back-to-top');
    if (backToTopBtn) {
        window.onscroll = function() {
            if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
                backToTopBtn.style.display = 'block';
            } else {
                backToTopBtn.style.display = 'none';
            }
        };

        backToTopBtn.addEventListener('click', function() {
            document.body.scrollTop = 0; // For Safari
            document.documentElement.scrollTop = 0; // For Chrome, Firefox, IE and Opera
        });
    }

    // Other global listeners can be added here
}

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