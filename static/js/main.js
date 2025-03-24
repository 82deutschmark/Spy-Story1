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

// Main JavaScript file
import FormHandler from '/static/js/modules/FormHandler.js';
import ChoiceHandler from '/static/js/modules/ChoiceHandler.js';
import CharacterSelector from '/static/js/modules/CharacterSelector.js';
import CharacterMentions from '/static/js/modules/CharacterMentions.js';
import LoadingManager from '/static/js/modules/LoadingManager.js';
import ErrorHandler from '/static/js/modules/ErrorHandler.js';
import { UIUtils } from '/static/js/modules/UIUtils.js';
import StoryFormHandler from '/static/js/modules/StoryFormHandler.js';
import UserProgressManager from '/static/js/modules/UserProgressManager.js';
import UserProgress from '/static/js/modules/UserProgress.js';

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

        // Form handling initialization
        if (!document.querySelector('.storyboard-body')) {
            const formHandler = new FormHandler();
            formHandler.initialize();
            console.log("FormHandler initialized");
        }

        // Story handling initialization
        if (document.querySelector('.storyboard-body')) {
            const choiceHandler = new ChoiceHandler();
            choiceHandler.initialize();
            console.log("ChoiceHandler initialized");
        }

        const storyFormHandler = new StoryFormHandler();
        storyFormHandler.initialize();
        console.log("StoryFormHandler initialized");

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