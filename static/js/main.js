/**
 * main.js - Application Entry Point
 * ================================
 * 
 * !!! IMPORTANT - READ BEFORE MODIFYING !!!
 * This is the primary entry point for the entire application.
 * It orchestrates the initialization of all core modules.
 * 
 * Key Dependencies:
 * ----------------
 * - FormHandler: Form submission and validation (not used on storyboard)
 * - UIUtils: UI interaction utilities
 * - CharacterMentions: Character highlighting in story text
 * - CharacterSelector: Character selection and management
 * 
 * Initialization Order:
 * -------------------
 * 1. FLASK_CONFIG validation and setup
 * 2. CharacterSelector initialization (if on character selection page)
 * 3. FormHandler initialization (if not on storyboard)
 * 4. Character mentions setup (if on story page)
 * 5. Global event listeners
 * 6. Story ID management
 * 
 * Integration Points:
 * -----------------
 * - DOM Elements: Requires '.story-content' for character mentions
 * - URL Parameters: Handles 'story_id' parameter
 * - Local Storage: Manages 'lastStoryId' and configuration
 * 
 * Usage Guidelines:
 * ---------------
 * 1. NEVER modify the initialization order
 * 2. ALWAYS maintain the FLASK_CONFIG structure
 * 3. Any new global features must be initialized AFTER core modules
 * 4. Keep the DOMContentLoaded event handler clean and organized
 */

// Read server base URL from window.FLASK_CONFIG (set in index.html); fallback to '/static/'
const SERVER_BASE_URL = (window.FLASK_CONFIG && window.FLASK_CONFIG.staticUrl) || '/static/';

// Updated import paths to be relative
import ChoiceHandler from './modules/ChoiceHandler.js';
import CharacterSelector from './modules/CharacterSelector.js';
import CharacterMentions from './modules/CharacterMentions.js';
import LoadingManager from './modules/LoadingManager.js';
import ErrorHandler from './modules/ErrorHandler.js';
import { UIUtils } from './modules/UIUtils.js';
import StoryFormHandler from './modules/StoryFormHandler.js';
import UserProgressManager from './modules/UserProgressManager.js';
import UserProgress from './modules/UserProgress.js';

// Wait for DOM content and modules to load
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log("DOM Content Loaded, initializing application...");
        await initializeApplication();
    } catch (error) {
        console.error("Error during initialization:", error);
        UIUtils.showToast('Error', 'Failed to initialize application. Please refresh the page.');
    }
});

document.addEventListener('DOMContentLoaded', function(){
    fetch('/api/user/progress')
       .then(response => response.json())
       .then(data => {
           const missionsDisplay = document.getElementById('active-missions-display');
           const currencyDisplay = document.getElementById('currency-display');
           const notesDisplay = document.getElementById('notebook-notes');

           if (missionsDisplay) {
               missionsDisplay.textContent = data.active_missions.length;
           }
           
           if (currencyDisplay) {
               const currencyText = Object.entries(data.currency || {})
                   .map(([symbol, amount]) => `${symbol}: ${amount}`)
                   .join(' | ');
               currencyDisplay.textContent = currencyText;
           }
           
           if (notesDisplay) {
               notesDisplay.textContent = data.notes || 'No notes yet';
           }
       })
       .catch(err => {
           console.error('Error fetching user progress:', err);
           // Optionally show a user-friendly error message
           const displays = ['active-missions-display', 'currency-display', 'notebook-notes'];
           displays.forEach(id => {
               const element = document.getElementById(id);
               if (element) {
                   element.textContent = 'Error loading data';
               }
           });
       });
});

// Setup global event listeners
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
}

// Main initialization
async function initializeApplication() {
    try {
        // Check for FLASK_CONFIG
        if (!window.FLASK_CONFIG) {
            console.warn('FLASK_CONFIG not found. Using default configuration.');
            window.FLASK_CONFIG = {
                staticUrl: '/static/',
                apiBaseUrl: '/api'
            };
        }

        console.log("Initializing application with config:", window.FLASK_CONFIG);

        // Core system initialization
        const loadingManager = new LoadingManager();
        loadingManager.initialize();
        console.log("LoadingManager initialized");

        const errorHandler = new ErrorHandler();
        errorHandler.initialize();
        console.log("ErrorHandler initialized");

        // User state initialization
        const userProgressManager = new UserProgressManager();
        userProgressManager.initialize();
        console.log("UserProgressManager initialized");

        // Initialize UserProgress system
        if (window.userProgressData) {
            UserProgress.updateUserProgress(
                window.userProgressData.level,
                window.userProgressData.experience
            );
        }
        console.log("UserProgress initialized");

        // Form handling initialization - UPDATED
        const storyFormHandler = new StoryFormHandler();
        storyFormHandler.initialize();
        console.log("StoryFormHandler initialized");

        // Story handling initialization
        if (document.querySelector('.storyboard-body')) {
            const choiceHandler = new ChoiceHandler();
            choiceHandler.initialize();
            console.log("ChoiceHandler initialized");
        }

        // Setup global event listeners
        setupGlobalListeners();

        // Store story ID if present
        const storyIdParam = new URLSearchParams(window.location.search).get('story_id');
        if (storyIdParam) {
            localStorage.setItem('lastStoryId', storyIdParam);
        }

        // Initialize character mentions last (after all content is loaded)
        if (document.querySelector('.story-content')) {
            const characterMentions = new CharacterMentions();
            characterMentions.initialize();
            console.log("CharacterMentions initialized");
        }

        console.log("Application initialization complete");
    } catch (error) {
        console.error('Critical error during application initialization:', error);
        UIUtils.showToast('Error', 'An error occurred while loading the application. Please refresh the page or contact support if the problem persists.');
    }
}

function renderStory(responseData) {
    // Ensure we are using the top-level narrative text and choices
    // If narrative_text isn’t found, look inside 'stories' as fallback
    let narrative = responseData.narrative_text || (responseData.stories && responseData.stories.narrative_text) || "";
    let choices = responseData.choices || (responseData.stories && responseData.stories.choices) || [];

    // Update the story content container (which expects HTML with <br/> tags)
    const storyContentDiv = document.querySelector('.story-content');
    if(storyContentDiv) {
        storyContentDiv.innerHTML = narrative; // narrative_text should already contain <br/> tags
    }

    // Update choices UI
    const choicesContainer = document.querySelector('.choices-container');
    if (choicesContainer) {
        choicesContainer.innerHTML = ""; // clear previous choices
        choices.forEach(choice => {
            let btn = document.createElement('button');
            btn.className = "choice-btn";
            btn.innerText = choice.text || "Option";
            // attach additional data attributes if needed:
            btn.dataset.choiceId = choice.choice_id || choice.id;
            choicesContainer.appendChild(btn);
        });
    }
    
    console.log('Rendered narrative:', narrative);
    console.log('Rendered choices:', choices);
}