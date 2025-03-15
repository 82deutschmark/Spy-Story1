// Main JavaScript file
import { EventHandlers } from './modules/EventHandlers.js';

// Wait for both DOM and FLASK_CONFIG to be ready
async function initializeApplication() {
    if (!window.FLASK_CONFIG) {
        console.error('FLASK_CONFIG not found. Make sure it is properly initialized in the HTML template.');
        return;
    }

    console.log("Initializing application with config:", window.FLASK_CONFIG);

    try {
        // Initialize EventHandlers
        console.log("Initializing EventHandlers");
        EventHandlers.initialize();

        // Initialize CharacterManager
        console.log("Loading CharacterManager");
        const characterManagerModule = await import('./modules/CharacterManager.js');
        const CharacterManager = characterManagerModule.default || characterManagerModule.CharacterManager;
        
        if (CharacterManager) {
            const manager = new CharacterManager();
            await manager.initialize();
            console.log("CharacterManager initialized");
        }

        // Initialize Notebook if elements exist
        const notebookElements = document.querySelectorAll('.notebook-tab, .notebook-content');
        if (notebookElements.length > 0) {
            console.log("Loading NotebookManager");
            const notebookModule = await import('./modules/NotebookManager.js');
            await notebookModule.default.initialize();
            console.log("NotebookManager initialized");
        }

        // Initialize PaymentManager
        try {
            const paymentModule = await import('./modules/PaymentManager.js');
            if (paymentModule.default) {
                await paymentModule.default.initialize();
                console.log("PaymentManager initialized");
            }
        } catch (err) {
            console.warn("PaymentManager not loaded:", err.message);
        }

        // Initialize UserProgressManager
        try {
            const progressModule = await import('./modules/UserProgressManager.js');
            if (progressModule.default) {
                await progressModule.default.initialize();
                console.log("UserProgressManager initialized");
            }
        } catch (err) {
            console.warn("UserProgressManager not loaded:", err.message);
        }

        console.log("Application initialization complete");
    } catch (error) {
        console.error('Error during application initialization:', error);
        // You might want to show a user-friendly error message here
    }
}

// Start initialization when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApplication);

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