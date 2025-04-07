/**
 * NotebookManager.js - Story Progress and Notes Management
 * ===================================================
 * 
 * !!! IMPORTANT - READ BEFORE MODIFYING !!!
 * This module manages the notebook interface for tracking story
 * progress, character notes, and mission information.
 * 
 * Key Features:
 * ------------
 * - Notebook visibility toggling
 * - Story continuation handling
 * - Progress tracking
 * - Note management
 * - Mission details display
 * 
 * Dependencies:
 * -----------
 * - EventHandlers: For event coordination
 * - UIUtils: For UI feedback
 * - LocalStorage: For progress persistence
 * 
 * Required DOM Elements:
 * -------------------
 * - Toggle button for notebook visibility
 * - Close button for notebook
 * - Continue story button
 * - Notebook content container
 * - Mission list container
 * - Mission detail container
 * 
 * Usage Guidelines:
 * ---------------
 * 1. ALWAYS handle notebook state persistence
 * 2. Maintain clean event listener management
 * 3. Coordinate with story progression system
 * 4. Handle mobile/responsive layouts properly
 * 
 * State Management:
 * --------------
 * - Notebook visibility state
 * - Current story progress
 * - User notes and annotations
 * - Last accessed story position
 * - Active missions
 * - Current mission
 */

/**
 * Notebook Management Module
 * Handles displaying and updating user progress information
 */
import UIUtils from './UIUtils.js';
import MissionManager from './MissionManager.js';

class NotebookManager {
    constructor() {
        this.notebookElement = null;
        this.toggleButton = null;
        this.closeButton = null;
        this.continueStoryButton = null;
        this.isOpen = false;
        this.lastStoryId = null;
        this.initialized = false;
        this.isNotebookVisible = false;
        this.activeMissions = [];
        this.currentMission = null;
        this.bindEvents();
    }

    async initialize() {
        try {
            if (this.initialized) {
                console.log("NotebookManager already initialized");
                return;
            }

            console.log("Initializing NotebookManager");

            // Initialize notebook elements
            this.notebookElement = document.getElementById('notebookSidebar');
            this.toggleButton = document.getElementById('toggleNotebookBtn');
            this.closeButton = document.getElementById('closeNotebookBtn');
            this.continueStoryButton = document.getElementById('continueStoryBtn');

            // Get last story ID from local storage
            this.lastStoryId = localStorage.getItem('lastStoryId');

            if (this.toggleButton && this.notebookElement) {
                await this.setupEventListeners();
                this.initialized = true;
                console.log("NotebookManager initialized successfully");
            } else {
                console.log("Notebook elements not found in the DOM, skipping initialization");
            }
        } catch (error) {
            console.error("Error initializing NotebookManager:", error);
            throw error;
        }
    }

    async setupEventListeners() {
        try {
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

            console.log("NotebookManager event listeners set up");
        } catch (error) {
            console.error("Error setting up NotebookManager event listeners:", error);
            throw error;
        }
    }

    toggleNotebook() {
        try {
            if (!this.notebookElement) {
                console.warn("Notebook element not found");
                return;
            }
            
            this.isOpen = !this.isOpen;
            if (this.isOpen) {
                this.notebookElement.classList.add('open');
            } else {
                this.notebookElement.classList.remove('open');
            }
        } catch (error) {
            console.error("Error toggling notebook:", error);
        }
    }

    closeNotebook() {
        try {
            if (!this.notebookElement) {
                console.warn("Notebook element not found");
                return;
            }
            
            this.isOpen = false;
            this.notebookElement.classList.remove('open');
        } catch (error) {
            console.error("Error closing notebook:", error);
        }
    }

    async continueLastStory() {
        try {
            if (!this.lastStoryId) {
                console.warn("No last story ID found");
                return;
            }

            window.location.href = `/story/${this.lastStoryId}`;
        } catch (error) {
            console.error("Error continuing last story:", error);
        }
    }

    async updateNotebookData(userData) {
        try {
            if (!userData) {
                throw new Error("No user data provided");
            }

            // Update notebook data with user progress
            console.log("Updating notebook data:", userData);

            // Implementation will be added in the future
        } catch (error) {
            console.error("Error updating notebook data:", error);
            throw error;
        }
    }

    async loadMissionDetails() {
        try {
            const response = await fetch('/api/missions/active');
            const data = await response.json();
            
            // Check if the response has the new structure with 'status' and 'missions'
            this.activeMissions = data.status === 'success' ? data.missions : data;
            
            this.renderMissionList();
        } catch (error) {
            console.error('Failed to load missions:', error);
            UIUtils.showToast('Error', 'Failed to load mission details');
        }
    }

    renderMissionList() {
        const missionList = document.getElementById('mission-list');
        if (!missionList) return;

        missionList.innerHTML = this.activeMissions
            .map(mission => `
                <div class="mission-item" data-mission-id="${mission.id}">
                    <h4>${mission.title}</h4>
                    <p>${mission.description}</p>
                    <div class="progress">
                        <div class="progress-bar" style="width: ${mission.progress}%"></div>
                    </div>
                </div>`)
            .join('');

        // Add click handlers
        document.querySelectorAll('.mission-item').forEach(item => {
            item.addEventListener('click', () => this.showMissionDetail(item.dataset.missionId));
        });
    }

    async showMissionDetail(missionId) {
        try {
            this.currentMission = await MissionManager.loadMissionDetails(missionId);
            this.renderMissionDetail();
        } catch (error) {
            console.error('Failed to load mission details:', error);
        }
    }

    renderMissionDetail() {
        const detailContainer = document.getElementById('mission-detail');
        if (!detailContainer || !this.currentMission) return;

        detailContainer.innerHTML = `
            <h3>${this.currentMission.title}</h3>
            <p>${this.currentMission.description}</p>
            <div class="progress-container">
                <div class="progress">
                    <div class="progress-bar" style="width: ${this.currentMission.progress}%"></div>
                </div>
                <span>${this.currentMission.progress}% complete</span>
            </div>
            <h4>Objectives</h4>
            <ul class="objective-list">
                ${this.currentMission.objectives.map(obj => 
                    `<li class="${obj.completed ? 'completed' : ''}">
                        ${obj.description}
                    </li>`).join('')}
            </ul>
            <h4>Rewards</h4>
            <div class="rewards">
                ${Object.entries(this.currentMission.rewards)
                    .map(([type, amount]) => 
                        `<span class="reward-badge">${type}: ${amount}</span>`)
                    .join('')}
            </div>`;
    }

    bindEvents() {
        // Add event listeners for mission details
        document.addEventListener('DOMContentLoaded', () => {
            this.loadMissionDetails();
        });
    }
}

// Export the NotebookManager class as default
export default NotebookManager;

// Remove the automatic initialization since it's now handled by main.js
if (typeof window !== 'undefined') {
    // Make NotebookManager available globally for debugging
    window.NotebookManager = NotebookManager;
}
