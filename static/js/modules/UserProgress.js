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
    },

    /**
     * Update mission progress and status
     * @param {Object} update - Mission update data from server
     */
    updateMissionProgress(update) {
        if (!update || !update.id) return;
        
        // Update mission progress in UI
        const missionElement = document.querySelector(`[data-mission-id="${update.id}"]`);
        if (!missionElement) return;
        
        // Update progress bar
        const progressBar = missionElement.querySelector('.mission-progress');
        if (progressBar) {
            progressBar.style.width = `${update.progress * 100}%`;
        }
        
        // Update status
        if (update.status) {
            const statusElement = missionElement.querySelector('.mission-status');
            if (statusElement) {
                statusElement.textContent = update.status;
            }
        }
        
        // Handle completion
        if (update.status === 'completed') {
            // Show reward
            const rewardElement = missionElement.querySelector('.mission-reward');
            if (rewardElement && update.rewards) {
                rewardElement.textContent = `Reward: ${update.rewards.amount} ${update.rewards.currency}`;
            }
            
            // Add completion animation
            missionElement.classList.add('mission-completed');
            
            // Update user currency if reward is provided
            if (update.rewards) {
                this.updateUserCurrency(update.rewards);
            }
        }
        
        // Handle failure
        if (update.status === 'failed') {
            missionElement.classList.add('mission-failed');
        }
    },
    
    /**
     * Update user's currency display
     * @param {Object} reward - Reward data from server
     */
    updateUserCurrency(reward) {
        if (!reward || !reward.amount || !reward.currency) return;
        
        const currencyElement = document.querySelector('.user-currency');
        if (!currencyElement) return;
        
        const currentAmount = parseInt(currencyElement.textContent) || 0;
        const newAmount = currentAmount + reward.amount;
        currencyElement.textContent = newAmount;
        
        // Show currency gain animation
        const gainElement = document.createElement('div');
        gainElement.className = 'currency-gain';
        gainElement.textContent = `+${reward.amount} ${reward.currency}`;
        currencyElement.appendChild(gainElement);
        
        // Remove animation after it completes
        setTimeout(() => gainElement.remove(), 2000);
    }
};

/**
 * Extracts story data from the response
 * @param {Object} responseData - The response data from the server
 * @returns {Object} - An object containing narrative and choices
 */
function extractStoryData(responseData) {
    const narrative = responseData.narrative_text || (responseData.stories && responseData.stories.narrative_text) || "";
    const choices = responseData.choices || (responseData.stories && responseData.stories.choices) || [];
    return { narrative, choices };
}