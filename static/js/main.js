// Main JavaScript file
document.addEventListener('DOMContentLoaded', async function() {
    console.log("DOM fully loaded - initializing application");

    try {
        // Load UI utilities first since other modules might need it
        console.log("Loading UI utilities...");
        const UIUtils = await import('./modules/UIUtils.js');
        console.log("UI utilities loaded");

        // Import and initialize EventHandlers
        console.log("Loading EventHandlers...");
        const { default: EventHandlers } = await import('./modules/EventHandlers.js');
        console.log("EventHandlers module loaded");
        
        if (EventHandlers && typeof EventHandlers.initialize === 'function') {
            EventHandlers.initialize();
            console.log("Event handlers initialized successfully");
        } else {
            console.error("EventHandlers module loaded but initialize method not found");
        }

        // Load and initialize UserProgressManager
        console.log("Loading UserProgressManager...");
        const { default: UserProgressManager } = await import('./modules/UserProgressManager.js');
        if (UserProgressManager) {
            const userProgressManager = new UserProgressManager();
            userProgressManager.initialize();
            // Make it globally available for other modules
            window.userProgressManager = userProgressManager;
            console.log("User progress manager initialized");
        } else {
            console.error("UserProgressManager module loaded but class not found");
        }

        // Import and initialize CharacterManager
        console.log("Loading CharacterManager...");
        const characterManagerModule = await import('./modules/CharacterManager.js');
        console.log("CharacterManager module loaded");
        
        if (characterManagerModule.CharacterManager) {
            const characterManager = new characterManagerModule.CharacterManager();
            characterManager.initialize();
            console.log("Character manager initialized with class");
        } else if (characterManagerModule.default) {
            characterManagerModule.default.initialize();
            console.log("Character manager initialized with default export");
        }

        // Initialize notebook if on story page
        const notebookElements = document.querySelectorAll('.notebook-tab, .notebook-content');
        if (notebookElements.length > 0) {
            console.log("Loading NotebookManager...");
            const notebookModule = await import('./modules/NotebookManager.js');
            notebookModule.default.initialize();
            console.log("Notebook manager initialized");
        } else {
            console.log("Notebook elements not found, skipping initialization");
        }

        // Load PaymentManager if needed
        if (document.querySelector('[data-payment-required]')) {
            console.log("Loading PaymentManager...");
            const paymentModule = await import('./modules/PaymentManager.js');
            if (paymentModule.default && typeof paymentModule.default.initialize === 'function') {
                paymentModule.default.initialize();
                console.log("Payment manager initialized");
            }
        }

        // Initialize character mentions in story text if on story page
        if (document.querySelector('.story-content')) {
            initializeCharacterMentions();
            console.log("Character mentions initialized");
        }

        console.log("All modules initialized successfully");

    } catch (error) {
        console.error('Error initializing application:', error);
    }
});

// Keep the character mentions function
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

// Setup global event listeners
document.addEventListener('DOMContentLoaded', function() {
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
});