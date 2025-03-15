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

// Import all needed modules
import { CharacterManager } from './modules/CharacterManager.js';
import { StoryManager } from './modules/StoryManager.js';
import { EventHandlers } from './modules/EventHandlers.js';
import { UIUtils } from './modules/UIUtils.js';
import { PaymentManager } from './modules/PaymentManager.js';
import { NotebookManager } from './modules/NotebookManager.js';
import { UserProgressManager } from './modules/UserProgressManager.js';

// Function to handle loading overlay
function showLoading() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.classList.add('active');
    }
}

function hideLoading() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.classList.remove('active');
    }
}

// Function to highlight character mentions in story text
function initCharacterHighlighting() {
    // Find all character mentions in story text
    const storyContent = document.querySelector('.story-content');
    if (!storyContent) return;

    // Get all character portraits
    const characterPortraits = document.querySelectorAll('.character-portrait-mini');
    const characterNames = Array.from(characterPortraits).map(portrait => {
        return {
            id: portrait.dataset.characterName,
            name: portrait.querySelector('.character-mini-name').textContent.trim()
        };
    });

    // Process the content to add character mentions
    let storyText = storyContent.innerHTML;

    // Add character highlighting
    characterNames.forEach(character => {
        const regex = new RegExp(`\\b${character.name}\\b`, 'g');
        storyText = storyText.replace(regex, `<span class="character-mention" data-character="${character.id}">${character.name}</span>`);
    });

    // Update the story content
    storyContent.innerHTML = storyText;

    // Add click event to highlight corresponding mini-portrait
    document.querySelectorAll('.character-mention').forEach(mention => {
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

// When DOM is fully loaded, initialize all components
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded, initializing modules...");

    // Initialize character manager
    CharacterManager.init();

    // Initialize event handlers with loading handlers
    EventHandlers.init({
        showLoading: showLoading,
        hideLoading: hideLoading
    });

    // Initialize notebook if elements exist in the page
    if (document.querySelector('.notebook-container')) {
        NotebookManager.init();
    } else {
        console.log("Notebook elements not found in the DOM, skipping initialization");
    }

    // Initialize user progress
    UserProgressManager.init();

    // Initialize character highlighting
    initCharacterHighlighting();

    // Hide loading when page is ready
    setTimeout(hideLoading, 500);

    console.log("Modules loaded successfully");
});

// Initialize payment system separately
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded, initializing payment system...");

    // Initialize payment manager
    PaymentManager.init();

    console.log("Payment system initialized");
});

// Add form submission handlers to show loading
document.addEventListener('DOMContentLoaded', function() {
    const choiceForms = document.querySelectorAll('.choice-form');

    choiceForms.forEach(form => {
        form.addEventListener('submit', function() {
            showLoading();
        });
    });
});