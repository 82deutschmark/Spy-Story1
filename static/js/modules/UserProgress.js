/**
 * UserProgress.js - User State and Progress Management
 * =============================================
 * 
 * !!! IMPORTANT - READ BEFORE MODIFYING !!!
 * This module manages all user-related state and progress tracking.
 * Changes here affect the user's entire game experience.
 * 
 * Key Features:
 * ------------
 * - Progress tracking
 * - Experience points
 * - Level management
 * - Achievement tracking
 * - Character relationships
 * 
 * Dependencies:
 * -----------
 * - EventHandlers: For event coordination
 * - UIUtils: For progress feedback
 * - LocalStorage: For state persistence
 * - API endpoints: For server sync
 * 
 * Progress Types:
 * -------------
 * - Story Progress
 * - Character Relationships
 * - Mission Completion
 * - Achievements
 * - Currency Collection
 * 
 * Required DOM Elements:
 * -------------------
 * - '.progress-bar': Level and XP display
 * - '.achievement-list': Achievement tracking
 * - '.relationship-status': Character relations
 * - '.user-stats': General statistics
 * 
 * Integration Points:
 * -----------------
 * - Story system for progress
 * - Character system for relationships
 * - Mission system for completion
 * - Currency system for rewards
 * 
 * Usage Guidelines:
 * ---------------
 * 1. ALWAYS sync with server after changes
 * 2. Maintain data consistency
 * 3. Handle progress atomically
 * 4. Cache progress locally
 * 
 * State Management:
 * --------------
 * 1. Load initial state
 * 2. Track changes
 * 3. Validate updates
 * 4. Sync with server
 * 5. Update UI
 * 6. Cache state
 */

/**
 * User Progress Module
 * Manages user level and experience data
 */
export default {
    /**
     * Updates user progress displays
     * @param {number} level - User level
     * @param {number} experience - User experience points
     */
    updateUserProgress(level, experience) {
        if (!level && !experience) return;

        // Update level display
        const levelDisplay = document.querySelector('.user-level');
        if (levelDisplay && level) {
            levelDisplay.textContent = `Level ${level}`;
        }

        // Update XP bar
        const xpProgress = document.querySelector('.xp-progress');
        if (xpProgress && experience) {
            const xpPercent = experience % 100;
            xpProgress.style.width = `${xpPercent}%`;
        }

        // Update progress modal if open
        if (document.getElementById('progressModal')) {
            // Find all strong elements in the progress modal
            const strongElements = document.querySelectorAll('#progressModal .card-body strong');

            // Update level
            if (level) {
                strongElements.forEach(elem => {
                    if (elem.textContent === 'Level:') {
                        const nextNode = elem.nextSibling;
                        if (nextNode) {
                            nextNode.textContent = ` ${level}`;
                        }
                    }
                });
            }

            // Update XP
            if (experience) {
                strongElements.forEach(elem => {
                    if (elem.textContent === 'XP:') {
                        const nextNode = elem.nextSibling;
                        if (nextNode) {
                            nextNode.textContent = ` ${experience}`;
                        }
                    }
                });

                // Update Next Level
                strongElements.forEach(elem => {
                    if (elem.textContent === 'Next Level:') {
                        const nextNode = elem.nextSibling;
                        if (nextNode) {
                            nextNode.textContent = ` ${Math.floor(experience / 100) + 1}`;
                        }
                    }
                });
            }

            // Update progress bar
            const progressBar = document.querySelector('#progressModal .progress-bar');
            if (progressBar && experience) {
                const xpPercent = experience % 100;
                progressBar.style.width = `${xpPercent}%`;
                progressBar.setAttribute('aria-valuenow', xpPercent);
                progressBar.textContent = `${xpPercent}%`;
            }
        }
    },
    /**
     * Get the user's completed plot arcs
     * @returns {Array} - Array of completed plot arc IDs
     */
    getCompletedPlotArcs() {
        return this.progressData.completed_plot_arcs || [];
    },

    /**
     * Check if a plot arc is completed
     * @param {number} plotArcId - The plot arc ID to check
     * @returns {boolean} - True if completed, false otherwise
     */
    isPlotArcCompleted(plotArcId) {
        const completedPlotArcs = this.getCompletedPlotArcs();
        return completedPlotArcs.includes(plotArcId);
    },
    /**
     * Get the user's choice history
     * @returns {Array} - Array of choice data objects
     */
    getChoiceHistory() {
        return this.progressData.choice_history || [];
    },

    /**
     * Check if a specific choice was made
     * @param {number} choiceId - The choice ID to check
     * @returns {boolean} - True if the choice was made, false otherwise
     */
    wasChoiceMade(choiceId) {
        const choices = this.getChoiceHistory();
        return choices.some(choice => choice.choice_id === choiceId);
    },
    /**
     * Initialize the user progress tracking
     * TEMPORARILY DISABLED - See CHANGELOG.md
     */
    initialize() {
        console.log("UserProgress initialization skipped (temporarily disabled)");
        /*
        // Setup event listeners or any initialization logic
        console.log("UserProgress initialized");
        // Additional initialization code...
        */
    }
};