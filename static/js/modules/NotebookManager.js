
/**
 * Notebook Management Module
 * Handles displaying and updating user progress information
 */
import UIUtils from './UIUtils.js';

class NotebookManager {
    constructor() {
        this.notebookElement = null;
        this.toggleButton = null;
        this.closeButton = null;
        this.continueStoryButton = null;
        this.isOpen = false;
        this.lastStoryId = null;
    }

    initialize() {
        // Initialize notebook elements
        this.notebookElement = document.getElementById('notebookSidebar');
        this.toggleButton = document.getElementById('toggleNotebookBtn');
        this.closeButton = document.getElementById('closeNotebookBtn');
        this.continueStoryButton = document.getElementById('continueStoryBtn');

        // Get last story ID from local storage
        this.lastStoryId = localStorage.getItem('lastStoryId');

        if (this.toggleButton && this.notebookElement) {
            this.setupEventListeners();
            console.log("Notebook manager initialized");
        } else {
            console.log("Notebook elements not found in the DOM, skipping initialization");
        }
    }

    setupEventListeners() {
        // Toggle notebook visibility
        if (this.toggleButton) {
            this.toggleButton.addEventListener('click', () => this.toggleNotebook());
        }

        // Close notebook
        if (this.closeButton) {
            this.closeButton.addEventListener('click', () => this.closeNotebook());
        }

        // Continue story button
        if (this.continueStoryButton) {
            this.continueStoryButton.addEventListener('click', () => this.continueLastStory());
        }
    }

    toggleNotebook() {
        if (!this.notebookElement) return;
        
        this.isOpen = !this.isOpen;
        if (this.isOpen) {
            this.notebookElement.classList.add('open');
        } else {
            this.notebookElement.classList.remove('open');
        }
    }

    closeNotebook() {
        if (!this.notebookElement) return;
        
        this.isOpen = false;
        this.notebookElement.classList.remove('open');
    }

    continueLastStory() {
        if (this.lastStoryId) {
            window.location.href = `/story/${this.lastStoryId}`;
        }
    }

    updateNotebookData(userData) {
        // Update notebook data with user progress
        // This is a placeholder for future implementation
        console.log("Updating notebook data:", userData);
    }
}

// Export the NotebookManager class as default
export default NotebookManager;

// For backwards compatibility
if (typeof window !== 'undefined') {
    // Make NotebookManager available globally
    window.NotebookManager = NotebookManager;
    
    // Initialize the notebook manager when the DOM is loaded
    document.addEventListener('DOMContentLoaded', () => {
        try {
            const notebookManager = new NotebookManager();
            notebookManager.initialize();
            // Store instance globally for debugging
            window.notebookManagerInstance = notebookManager;
        } catch (error) {
            console.error('Error initializing NotebookManager:', error);
        }
    });
}
