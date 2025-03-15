/**
 * Main entry point for the application
 * Imports all modules and initializes the application
 */
import UIUtils from './modules/UIUtils.js';
import CurrencyManager from './modules/CurrencyManager.js';
import UserProgress from './modules/UserProgress.js';
import CharacterManager from './modules/CharacterManager.js';
import StoryManager from './modules/StoryManager.js';
import MissionManager from './modules/MissionManager.js';
import PaymentManager from './modules/PaymentManager.js';
import EventHandlers from './modules/EventHandlers.js';

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM loaded, initializing modules...");
    loadModules();

    // Also initialize the core modules that need to be available right away
    EventHandlers.initialize();
    CharacterManager.initialize();
    PaymentManager.initialize();
});

// Make core modules available globally for debugging
window.App = {
    UI: UIUtils,
    Currency: CurrencyManager,
    Progress: UserProgress,
    Character: CharacterManager,
    Story: StoryManager,
    Mission: MissionManager,
    Payment: PaymentManager,
    Events: EventHandlers
};

// Import modules - using dynamic import to ensure they load properly
async function loadModules() {
    try {
        // Load NotebookManager if the module exists
        try {
            const NotebookManagerModule = await import('./modules/NotebookManager.js');
            // Check if default export exists
            if (NotebookManagerModule.default) {
                const NotebookManager = NotebookManagerModule.default;

                if (document.querySelector('.notebook-accordion') || document.querySelector('.notebook-container')) {
                    const notebookManager = new NotebookManager();
                    notebookManager.initialize();
                    window.notebookManagerInstance = notebookManager;
                } else {
                    console.log("Notebook elements not found in the DOM, skipping initialization");
                }
            } else {
                console.log("NotebookManager module loaded but doesn't have a default export");
            }
        } catch (notebookError) {
            console.log("NotebookManager module not available or error:", notebookError.message);
        }

        // Load UserProgressManager
        try {
            const UserProgressManagerModule = await import('./modules/UserProgressManager.js');
            const UserProgressManager = UserProgressManagerModule.default;

            const userProgressManager = new UserProgressManager();
            userProgressManager.initialize();
            window.userProgressManagerInstance = userProgressManager;
        } catch (progressError) {
            console.error("Error initializing UserProgressManager:", progressError);
        }

        console.log("Modules loaded successfully");
    } catch (error) {
        console.error("Error loading modules:", error);
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

// NOTE: The following features are described in the thinking section but not fully implemented in the provided changes:
// - "Continue Story" button in storyboard.html
// - "Continue Story" button in index.html
// - continueStory method in NotebookManager.js
// - Updated UserProgressManager.js to handle last story ID and button display
// - Updated main.js to handle story ID storage when a story is viewed.