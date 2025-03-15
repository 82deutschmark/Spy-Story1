// Main JavaScript file
import { EventHandlers } from './modules/EventHandlers.js';
import { UIUtils } from './modules/UIUtils.js';

// Loading overlay functions
function createLoadingOverlay(message = 'Generating Story...') {
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
        <div class="loading-content">
            <div class="loading-spinner"></div>
            <div class="loading-percentage">0%</div>
            <div class="loading-message">${message}</div>
        </div>
    `;
    document.body.appendChild(overlay);
    overlay.style.display = 'flex';
    return overlay.querySelector('.loading-percentage');
}

function updateLoadingPercent(element, percent) {
    element.textContent = `${Math.round(percent)}%`;
}

function removeLoadingOverlay(overlay) {
    overlay.closest('.loading-overlay').remove();
}

// Toast notification function
function showToast(title, message) {
    const toastEl = document.getElementById('notificationToast');
    if (toastEl) {
        const toast = new bootstrap.Toast(toastEl);
        document.getElementById('toastTitle').textContent = title;
        document.getElementById('toastMessage').textContent = message;
        toast.show();
    }
}

// Wait for both DOM and FLASK_CONFIG to be ready
async function initializeApplication() {
    try {
        // Check for FLASK_CONFIG
        if (!window.FLASK_CONFIG) {
            throw new Error('FLASK_CONFIG not found. Make sure it is properly initialized in the HTML template.');
        }

        console.log("Initializing application with config:", window.FLASK_CONFIG);

        // Initialize EventHandlers
        if (!EventHandlers) {
            throw new Error('EventHandlers module not found');
        }
        console.log("Initializing EventHandlers");
        await EventHandlers.initialize();

        // Initialize CharacterManager
        try {
            console.log("Loading CharacterManager");
            const { CharacterManager, default: characterManager } = await import('./modules/CharacterManager.js');
            
            if (!characterManager && !CharacterManager) {
                throw new Error('CharacterManager module not found');
            }

            // Use the singleton instance if available, otherwise create a new instance
            const manager = characterManager || new CharacterManager();
            await manager.initialize();
            console.log("CharacterManager initialized");
        } catch (err) {
            console.error("Error initializing CharacterManager:", err);
            // Continue initialization - non-critical error
        }

        // Initialize Notebook if elements exist
        const notebookElements = document.querySelectorAll('.notebook-tab, .notebook-content');
        if (notebookElements.length > 0) {
            try {
                console.log("Loading NotebookManager");
                const NotebookManager = (await import('./modules/NotebookManager.js')).default;
                
                if (!NotebookManager) {
                    throw new Error('NotebookManager module not found');
                }

                const notebookManager = new NotebookManager();
                await notebookManager.initialize();
                console.log("NotebookManager initialized");
            } catch (err) {
                console.error("Error initializing NotebookManager:", err);
                // Continue initialization - non-critical error
            }
        }

        // Initialize optional modules
        await initializeOptionalModules();

        console.log("Application initialization complete");
    } catch (error) {
        console.error('Critical error during application initialization:', error);
        showErrorMessage(error);
    }
}

// Initialize optional modules
async function initializeOptionalModules() {
    // Payment Manager
    try {
        const PaymentManager = (await import('./modules/PaymentManager.js')).default;
        if (PaymentManager) {
            const paymentManager = new PaymentManager();
            await paymentManager.initialize();
            console.log("PaymentManager initialized");
        }
    } catch (err) {
        console.warn("PaymentManager not loaded:", err.message);
    }

    // User Progress Manager
    try {
        const UserProgressManager = (await import('./modules/UserProgressManager.js')).default;
        if (UserProgressManager) {
            const progressManager = new UserProgressManager();
            await progressManager.initialize();
            console.log("UserProgressManager initialized");
        }
    } catch (err) {
        console.warn("UserProgressManager not loaded:", err.message);
    }
}

// Show error message to user
function showErrorMessage(error) {
    const errorDiv = document.getElementById('characterSelectionError');
    if (errorDiv) {
        errorDiv.textContent = 'An error occurred while loading the application. Please refresh the page or contact support if the problem persists.';
        errorDiv.style.display = 'block';
    }
}

// Initialize character mentions in story text
function initializeCharacterMentions() {
    try {
        const storyContent = document.querySelector('.story-content');
        if (!storyContent) {
            console.log("No story content found for character mentions");
            return;
        }

        const characterMentions = document.querySelectorAll('.character-mention');
        characterMentions.forEach(mention => {
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

        console.log(`Initialized ${characterMentions.length} character mentions`);
    } catch (error) {
        console.error("Error initializing character mentions:", error);
    }
}

// Start initialization when DOM is ready
document.addEventListener('DOMContentLoaded', async function() {
    try {
        await initializeApplication();

        const storyIdParam = new URLSearchParams(window.location.search).get('story_id');
        if (storyIdParam) {
            localStorage.setItem('lastStoryId', storyIdParam);
        }

        if (document.querySelector('.story-content')) {
            const { CharacterManager, default: characterManager } = await import('./modules/CharacterManager.js');
            const manager = characterManager || new CharacterManager();
            
            if (manager) {
                await manager.highlightCharactersInStory();
            }
            
            initializeCharacterMentions();
        }

        // Setup global event listeners
        setupGlobalListeners();
    } catch (error) {
        console.error("Error during initialization:", error);
        showErrorMessage(error);
    }
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
}

// Make utility functions available globally
window.createLoadingOverlay = UIUtils.createLoadingOverlay;
window.updateLoadingPercent = UIUtils.updateLoadingPercent;
window.removeLoadingOverlay = UIUtils.removeLoadingOverlay;
window.showToast = UIUtils.showToast;

// Initialize event handlers when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await EventHandlers.initialize();
    } catch (error) {
        console.error('Failed to initialize application:', error);
        UIUtils.showToast('Error', 'Failed to initialize application. Please refresh the page.');
    }
});