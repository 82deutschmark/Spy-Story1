// Main JavaScript file
import { EventHandlers } from './modules/EventHandlers.js';

document.addEventListener('DOMContentLoaded', async function() {
    console.log("DOM fully loaded - initializing application");

    try {
        // Import and initialize EventHandlers first
        console.log("EventHandlers module loaded");
        
        EventHandlers.initialize();
        console.log("Event handlers initialized");

        // Import and initialize CharacterManager after EventHandlers
        const characterManagerModule = await import('./modules/CharacterManager.js');
        console.log("CharacterManager module loaded");
        
        if (characterManagerModule.CharacterManager) {
            const characterManager = new characterManagerModule.CharacterManager();
            characterManager.initialize();
        } else if (characterManagerModule.default) {
            characterManagerModule.default.initialize();
        }
        console.log("Character manager initialized");

        // Initialize notebook if on story page
        const notebookElements = document.querySelectorAll('.notebook-tab, .notebook-content');
        if (notebookElements.length > 0) {
            const notebookModule = await import('./modules/NotebookManager.js');
            notebookModule.default.initialize();
            console.log("Notebook manager initialized");
        } else {
            console.log("Notebook elements not found, skipping initialization");
        }
    } catch (error) {
        console.error('Error initializing application:', error);
    }
});

// Setup payment processing if PayPal is available
import('./modules/PaymentManager.js')
    .then(module => {
        // PaymentManager will initialize itself if the PayPal script is loaded
    })
    .catch(err => console.error("Error loading PaymentManager module:", err));

// Load user progress manager
import('./modules/UserProgressManager.js')
    .then(module => {
        // UserProgressManager will initialize itself
    })
    .catch(err => console.error("Error loading UserProgressManager module:", err));

// Load UI utilities
import('./modules/UIUtils.js')
    .then(module => {
        // UI Utils will be available for other modules
    })
    .catch(err => console.error("Error loading UIUtils module:", err));


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
    if (document.querySelector('.story-content')) {
        import('./modules/CharacterManager.js')
            .then(module => {
                const characterManager = module.CharacterManager ? new module.CharacterManager() : module.default;
                characterManager.highlightCharactersInStory();
            })
            .catch(err => console.error("Error loading CharacterManager module in DOMContentLoaded:", err));
    }
    initializeCharacterMentions();
});

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