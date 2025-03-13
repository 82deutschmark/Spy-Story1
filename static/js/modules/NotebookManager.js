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
            this.continueStoryButton.addEventListener('click', () => this.continueStory());
        }
    }

    toggleNotebook() {
        if (this.notebookElement) {
            this.notebookElement.classList.toggle('open');
            this.isOpen = !this.isOpen;
        }
    }

    closeNotebook() {
        if (this.notebookElement) {
            this.notebookElement.classList.remove('open');
            this.isOpen = false;
        }
    }

    continueStory() {
        // Get the last story ID from local storage or from the page
        const storyId = this.lastStoryId || 
                        (document.querySelector('[data-story-id]') ? 
                         document.querySelector('[data-story-id]').dataset.storyId : null);

        if (storyId) {
            window.location.href = `/storyboard?story_id=${storyId}`;
        } else {
            console.error("No story ID found to continue");
            // Show an error message or toast notification
            if (typeof showNotification === 'function') {
                showNotification('No previous story found to continue', 'warning');
            }
        }
    }
}

export default NotebookManager;