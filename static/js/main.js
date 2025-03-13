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
import NotebookManager from './modules/NotebookManager.js';
import UserProgressManager from './modules/UserProgressManager.js';


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
    
    // Let the class initialization handle itself in their respective module files
    // This ensures modules are loaded consistently whether imported in main.js or loaded via script tags
});

// NOTE: The following features are described in the thinking section but not fully implemented in the provided changes:
// - "Continue Story" button in storyboard.html
// - "Continue Story" button in index.html
// - continueStory method in NotebookManager.js
// - Updated UserProgressManager.js to handle last story ID and button display
// - Updated main.js to handle story ID storage when a story is viewed.