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

// Application Configuration
const appConfig = {
    staticUrl: '/static/',
    apiBaseUrl: '/api',
    debug: true  // Enable verbose logging
};

// Expose configuration globally
window.appConfig = appConfig;

// Enhanced logging function
function appLog(message, level = 'info') {
    if (appConfig.debug) {
        const levels = {
            'info': console.log,
            'warn': console.warn,
            'error': console.error
        };
        (levels[level] || console.log)(`[APP] ${message}`);
    }
}

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
import MissionManager from './modules/MissionManager.js';
import NotebookManager from './modules/NotebookManager.js';

// Wait for DOM content and modules to load
document.addEventListener('DOMContentLoaded', async () => {
    appLog('DOM Content Loaded, initializing application...');
    await initializeApplication();
});

async function initializeApplication() {
    try {
        appLog('Initializing Application Modules');

        // Centralized module initialization with error handling
        const modules = [
            { name: 'LoadingManager', module: LoadingManager, initMethod: 'initialize' },
            // Commented out to prevent conflicts with form submission handling in ChoiceHandler and StoryFormHandler
            // { name: 'FormHandler', module: FormHandler, initMethod: 'initialize' },
            { name: 'ErrorHandler', module: ErrorHandler, initMethod: 'initialize' },
            { name: 'ChoiceHandler', module: ChoiceHandler, initMethod: 'initialize' },
            { name: 'StoryFormHandler', module: StoryFormHandler, initMethod: 'initialize' },
            { name: 'CharacterSelector', module: CharacterSelector, initMethod: 'initialize' },
            { name: 'CharacterMentions', module: CharacterMentions, initMethod: 'initialize' },
            { name: 'NotebookManager', module: NotebookManager, initMethod: 'initialize' },            
            { name: 'MissionManager', module: MissionManager, initMethod: 'initialize' },
            { name: 'UserProgressManager', module: UserProgressManager, initMethod: 'initialize' }
        ];

        for (const { name, module, initMethod } of modules) {
            try {
                appLog(`Initializing ${name}`);
                
                // Try multiple initialization methods
                if (typeof module === 'function' && module.prototype[initMethod]) {
                    // Class-based initialization
                    const instance = new module();
                    if (typeof instance[initMethod] === 'function') {
                        await instance[initMethod]();
                    }
                } else if (typeof module[initMethod] === 'function') {
                    // Static method or module-level initialization
                    await module[initMethod]();
                }

                appLog(`${name} initialized successfully`);
            } catch (moduleError) {
                appLog(`${name} initialization failed: ${moduleError.message}`, 'error');
                // Continue initialization even if a module fails
            }
        }

        // Check for FLASK_CONFIG
        if (!window.FLASK_CONFIG) {
            appLog('FLASK_CONFIG not found. Using default configuration.');
            window.FLASK_CONFIG = {
                staticUrl: '/static/',
                apiBaseUrl: '/api'
            };
        }

        appLog("Initializing application with config:", window.FLASK_CONFIG);

        // Fallback initialization for core systems
        const loadingManager = new LoadingManager();
        if (typeof loadingManager.initialize === 'function') loadingManager.initialize();
        appLog("LoadingManager initialized");

        const errorHandler = new ErrorHandler();
        if (typeof errorHandler.initialize === 'function') errorHandler.initialize();
        appLog("ErrorHandler initialized");

        const storyFormHandler = new StoryFormHandler();
        if (typeof storyFormHandler.initialize === 'function') storyFormHandler.initialize();
        appLog("StoryFormHandler initialized");

        // Initialize character mentions last (after all content is loaded)
        if (document.querySelector('.story-content')) {
            const characterMentions = new CharacterMentions();
            if (typeof characterMentions.initialize === 'function') {
                characterMentions.initialize();
                appLog("CharacterMentions initialized");
            }
        }

        // Setup global event listeners
        setupGlobalListeners();

        // Store story ID if present
        const storyIdParam = new URLSearchParams(window.location.search).get('story_id');
        if (storyIdParam) {
            localStorage.setItem('lastStoryId', storyIdParam);
        }

        appLog('Application initialization complete');
    } catch (error) {
        appLog(`Critical initialization error: ${error.message}`, 'error');
        // Optionally show a user-friendly error notification
    }
}

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
    
    appLog('Rendered narrative:', narrative);
    appLog('Rendered choices:', choices);
}