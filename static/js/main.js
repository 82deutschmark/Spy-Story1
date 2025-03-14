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

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM loaded, initializing modules...");
    loadModules();
});


// Make core modules available globally for debugging
window.App = {
    UI: UIUtils,
    Currency: CurrencyManager,
    Progress: UserProgress,
    Character: CharacterManager,
    Story: StoryManager,
    Mission: MissionManager,
    Payment: PaymentManager
};

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on a storyboard page and save the story ID
    const storyIdParam = new URLSearchParams(window.location.search).get('story_id');
    if (storyIdParam) {
        localStorage.setItem('lastStoryId', storyIdParam);
    }

    EventHandlers.initialize();

    // Initialize character mentions in story text
    initializeCharacterMentions();

    // Initialize character highlighting if on storyboard page
    if (document.querySelector('.story-content') && typeof CharacterManager !== 'undefined') {
        CharacterManager.highlightCharactersInStory();
    }

    // Let the class initialization handle itself in their respective module files
    // This ensures modules are loaded consistently whether imported in main.js or loaded via script tags
});

// Handle character mentions in story text
function initializeCharacterMentions() {
    // Find all character mentions in the story text
    const characterMentions = document.querySelectorAll('.character-mention');
    const characterThumbnails = document.querySelectorAll('.character-thumbnail');

    if (characterMentions.length > 0) {
        characterMentions.forEach(mention => {
            // Create tooltip element for the character
            const tooltipEl = document.createElement('div');
            tooltipEl.className = 'character-tooltip';

            // Get character name from the mention
            const characterName = mention.getAttribute('data-character-name');

            // Find matching thumbnail
            const matchingThumbnail = Array.from(characterThumbnails).find(thumb => 
                thumb.getAttribute('data-character-name') === characterName
            );

            if (matchingThumbnail) {
                const thumbnailImg = matchingThumbnail.querySelector('img').cloneNode(true);
                tooltipEl.appendChild(thumbnailImg);
                tooltipEl.insertAdjacentHTML('beforeend', characterName);
                mention.appendChild(tooltipEl);

                // Highlight matching thumbnail when hovering over mention
                mention.addEventListener('mouseenter', () => {
                    matchingThumbnail.classList.add('highlight');
                });
                mention.addEventListener('mouseleave', () => {
                    matchingThumbnail.classList.remove('highlight');
                });
            }
        });
    }
}

// NOTE: The following features are described in the thinking section but not fully implemented in the provided changes:
// - "Continue Story" button in storyboard.html
// - "Continue Story" button in index.html
// - continueStory method in NotebookManager.js
// - Updated UserProgressManager.js to handle last story ID and button display
// - Updated main.js to handle story ID storage when a story is viewed.