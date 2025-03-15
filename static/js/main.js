// Main JavaScript file
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM fully loaded - initializing application");

    // Import modules
    import('./modules/EventHandlers.js')
        .then(module => {
            console.log("Initializing EventHandlers module");
            module.default.initialize();
            console.log("Event handlers initialized");
        })
        .catch(err => console.error("Error loading EventHandlers module:", err));

    // Setup character selection
    const characterCards = document.querySelectorAll('.character-card');
    console.log("Setting up character selection buttons:", characterCards.length);

    // Setup reroll buttons
    const rerollButtons = document.querySelectorAll('.reroll-btn');
    console.log("Setting up reroll buttons:", rerollButtons.length);

    // Initialize character manager
    import('./modules/CharacterManager.js')
        .then(module => {
            console.log("Initializing CharacterManager module");
            const characterManager = module.CharacterManager ? new module.CharacterManager() : module.default;
            characterManager.initialize();
        })
        .catch(err => console.error("Error loading CharacterManager module:", err));

    // Initialize notebook if on the story page
    import('./modules/NotebookManager.js')
        .then(module => {
            const notebookElements = document.querySelectorAll('.notebook-tab, .notebook-content');
            if (notebookElements.length > 0) {
                module.default.initialize();
            } else {
                console.log("Notebook elements not found in the DOM, skipping initialization");
            }
        })
        .catch(err => console.error("Error loading NotebookManager module:", err));
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