/**
 * Main JavaScript Application Entry Point
 * Imports all modules and initializes the application
 */
import UIUtils from './modules/UIUtils.js';
import * as CharacterManagerModule from './modules/CharacterManager.js';
import * as EventHandlersModule from './modules/EventHandlers.js';
import * as PaymentManagerModule from './modules/PaymentManager.js';
import NotebookManager from './modules/NotebookManager.js';
import UserProgressManager from './modules/UserProgressManager.js';

// Extract named exports for easier reference
const CharacterManager = CharacterManagerModule.CharacterManager;
const EventHandlers = EventHandlersModule.EventHandlers;
const PaymentManager = PaymentManagerModule.PaymentManager;

// Make modules available globally for debugging and legacy compatibility
window.CharacterManager = CharacterManager;
window.EventHandlers = EventHandlers;
window.PaymentManager = PaymentManager;
window.UIUtils = UIUtils;
window.NotebookManager = NotebookManager;
window.UserProgressManager = UserProgressManager;

// Initialize application when DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded - initializing application');

    // Initialize modules in order of dependency
    console.log('Initializing EventHandlers module');
    if (EventHandlers && typeof EventHandlers.initialize === 'function') {
        EventHandlers.initialize();
    } else {
        console.error('EventHandlers module or initialize method not found');
    }

    console.log('Initializing CharacterManager module');
    if (CharacterManager && typeof CharacterManager.initialize === 'function') {
        CharacterManager.initialize();
    } else {
        console.error('CharacterManager module or initialize method not found');
    }

    console.log('Initializing PaymentManager module');
    if (PaymentManager && typeof PaymentManager.initialize === 'function') {
        PaymentManager.initialize();
    } else {
        console.error('PaymentManager module or initialize method not found');
    }

    if (NotebookManager && typeof NotebookManager.initialize === 'function') {
        NotebookManager.initialize();
    }

    if (UserProgressManager && typeof UserProgressManager.initialize === 'function') {
        UserProgressManager.initialize();
    }
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

//This export is not needed anymore, as we are using named exports and global variables
//export default {
//    UIUtils,
//    CharacterManager,
//    EventHandlers,
//    PaymentManager,
//    NotebookManager,
//    UserProgressManager
//};