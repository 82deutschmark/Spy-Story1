/**
 * Main application entry point
 */

// Track module loading state
const moduleState = {
    eventHandlersLoaded: false,
    characterManagerLoaded: false,
    paymentManagerLoaded: false,
    uiUtilsLoaded: false
};

// Import modules
import EventHandlers from './modules/EventHandlers.js';
import { CharacterManager } from './modules/CharacterManager.js';
import PaymentManager from './modules/PaymentManager.js';
import UIUtils from './modules/UIUtils.js';
import UserProgressManager from './modules/UserProgressManager.js';

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded - initializing application');
    initializeApplication();
    // Check if we're on a storyboard page and save the story ID
    const storyIdParam = new URLSearchParams(window.location.search).get('story_id');
    if (storyIdParam) {
        localStorage.setItem('lastStoryId', storyIdParam);
    }

    // Also initialize character highlighting if on storyboard page
    if (document.querySelector('.story-content')) {
        CharacterManager.highlightCharactersInStory();
    }
    initializeCharacterMentions();
    setupGlobalListeners();
});

// Main initialization function
function initializeApplication() {
    try {
        // Initialize EventHandlers
        if (EventHandlers && typeof EventHandlers.initialize === 'function') {
            console.log('EventHandlers module loaded');
            EventHandlers.initialize();
            moduleState.eventHandlersLoaded = true;
        } else {
            console.error('EventHandlers module not properly loaded or missing initialize method');
        }

        // Initialize CharacterManager
        if (CharacterManager && typeof CharacterManager.initialize === 'function') {
            console.log('CharacterManager module loaded');
            CharacterManager.initialize();
            moduleState.characterManagerLoaded = true;
        } else {
            console.error('CharacterManager not properly loaded or missing initialize method');
        }

        // Initialize PaymentManager
        if (PaymentManager && typeof PaymentManager.initialize === 'function') {
            console.log('PaymentManager module loaded');
            PaymentManager.initialize();
            moduleState.paymentManagerLoaded = true;
        } else {
            console.error('PaymentManager not properly loaded or missing initialize method');
        }

        // Initialize UIUtils
        if (UIUtils && typeof UIUtils.initialize === 'function') {
            console.log('UIUtils module loaded');
            UIUtils.initialize();
            moduleState.uiUtilsLoaded = true;
        } else {
            console.error('UIUtils not properly loaded or missing initialize method');
        }

        // Initialize UserProgressManager
        if (UserProgressManager && typeof UserProgressManager.initialize === 'function') {
            console.log('UserProgressManager module loaded');
            UserProgressManager.initialize();
        } else {
            console.error('UserProgressManager not properly loaded or missing initialize method');
        }

        // Check if all critical modules loaded
        validateModuleLoading();

    } catch (error) {
        console.error('Error initializing application:', error);
    }
}

// Validate all modules loaded correctly
function validateModuleLoading() {
    if (!moduleState.eventHandlersLoaded) {
        console.warn('WARNING: EventHandlers module failed to initialize properly');
    }

    if (!moduleState.characterManagerLoaded) {
        console.warn('WARNING: CharacterManager module failed to initialize properly');
    }

    const criticalModulesLoaded = moduleState.eventHandlersLoaded && 
                                 moduleState.characterManagerLoaded;

    if (criticalModulesLoaded) {
        console.log('All critical modules initialized successfully');
    } else {
        console.error('Some critical modules failed to initialize');
    }
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

// Setup global event listeners that aren't in EventHandlers
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