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
};