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
 * - EventHandlers: Core event management and form handling
 * - UIUtils: UI interaction utilities
 * - initializeCharacterMentions: Character highlighting in story text
 * 
 * Initialization Order:
 * -------------------
 * 1. FLASK_CONFIG validation and setup
 * 2. EventHandlers initialization
 * 3. Character mentions setup (if on story page)
 * 4. Global event listeners
 * 5. Story ID management
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
 * 3. Any new global features must be initialized AFTER EventHandlers
 * 4. Keep the DOMContentLoaded event handler clean and organized
 */

// Main JavaScript file
import EventHandlers from '/static/js/modules/EventHandlers.js';
import { UIUtils } from '/static/js/modules/UIUtils.js';

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

// Initialize character mentions in story text
function initializeCharacterMentions() {
    try {
        const storyContent = document.querySelector('.story-content');
        if (!storyContent) {
            console.log("No story content found for character mentions");
            return;
        }

        // Get all character names from the mini-portraits
        const characterPortraits = document.querySelectorAll('.character-portrait-mini');
        const characterNames = Array.from(characterPortraits).map(portrait => {
            return {
                name: portrait.querySelector('.character-mini-name').textContent.trim(),
                image: portrait.querySelector('img').src,
                element: portrait
            };
        });

        // Sort names by length (longest first) to avoid partial matches
        characterNames.sort((a, b) => b.name.length - a.name.length);

        // Get the story text
        let storyText = storyContent.innerHTML;

        // Replace character names with highlighted spans
        characterNames.forEach(character => {
            const regex = new RegExp(`\\b${character.name}\\b`, 'gi');
            storyText = storyText.replace(regex, match => {
                return `<span class="character-mention" data-character="${character.name.toLowerCase().replace(/\s/g, '-')}">${match}<span class="character-tooltip"><img src="${character.image}" alt="${match}"><div>${match}</div></span></span>`;
            });
        });

        // Update the story content
        storyContent.innerHTML = storyText;

        // Add click event to highlight corresponding mini-portrait
        document.querySelectorAll('.character-mention').forEach(mention => {
            mention.addEventListener('click', function() {
                const characterId = this.dataset.character;
                const targetPortrait = document.querySelector(`.character-portrait-mini[data-character-name="${characterId}"]`);

                document.querySelectorAll('.character-mini-img').forEach(img => {
                    img.classList.remove('character-mini-highlight');
                });

                if (targetPortrait) {
                    const portraitImg = targetPortrait.querySelector('.character-mini-img');
                    portraitImg.classList.add('character-mini-highlight');
                    targetPortrait.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    setTimeout(() => {
                        portraitImg.classList.remove('character-mini-highlight');
                    }, 3000);
                }
            });
        });

        console.log(`Initialized ${characterNames.length} character mentions`);
    } catch (error) {
        console.error("Error initializing character mentions:", error);
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

        // Initialize EventHandlers first
        await EventHandlers.initialize();
        console.log("EventHandlers initialized");

        // Initialize character highlighting if on story page
        if (document.querySelector('.story-content')) {
            initializeCharacterMentions();
        }

        // Setup global event listeners
        setupGlobalListeners();

        // Store story ID if present
        const storyIdParam = new URLSearchParams(window.location.search).get('story_id');
        if (storyIdParam) {
            localStorage.setItem('lastStoryId', storyIdParam);
        }

        console.log("Application initialization complete");
    } catch (error) {
        console.error('Critical error during application initialization:', error);
        UIUtils.showToast('Error', 'An error occurred while loading the application. Please refresh the page or contact support if the problem persists.');
    }
}