/**
 * Notebook Management Module
 * Handles displaying and updating user progress information
 */
import UIUtils from './UIUtils.js';

const NotebookManager = {
    /**
     * Initialize notebook manager
     */
    initialize() {
        console.log('Notebook manager initialized');
        this.setupNotebookControls();
    },

    /**
     * Set up notebook controls and event listeners
     */
    setupNotebookControls() {
        // Set up notebook toggle buttons
        const toggleBtn = document.getElementById('toggleNotebookBtn');
        const closeBtn = document.getElementById('closeNotebookBtn');
        const notebookContainer = document.querySelector('.notebook-container');

        if (toggleBtn && notebookContainer) {
            toggleBtn.addEventListener('click', () => {
                this.toggleNotebook();
            });
        }

        if (closeBtn && notebookContainer) {
            closeBtn.addEventListener('click', () => {
                this.closeNotebook();
            });
        }
    },

    /**
     * Toggle notebook visibility
     */
    toggleNotebook() {
        const notebookContainer = document.querySelector('.notebook-container');
        if (notebookContainer) {
            notebookContainer.classList.toggle('active');
        }
    },

    /**
     * Close the notebook
     */
    closeNotebook() {
        const notebookContainer = document.querySelector('.notebook-container');
        if (notebookContainer) {
            notebookContainer.classList.remove('active');
        }
    },

    /**
     * Updates the notebook with user progress data
     * @param {Object} userData - User progress data
     */
    updateNotebook(userData) {
        if (!userData) return;

        const notebook = document.querySelector('.notebook-content');
        if (!notebook) return;

        // Update user info section
        const userInfoSection = notebook.querySelector('.notebook-section.user-info');
        if (userInfoSection) {
            // Update protagonist name if available
            const nameElement = userInfoSection.querySelector('.protagonist-name');
            if (nameElement && userData.game_state && userData.game_state.protagonist_name) {
                nameElement.textContent = userData.game_state.protagonist_name;
            }

            // Update level information
            const levelElement = userInfoSection.querySelector('.user-level');
            if (levelElement) {
                levelElement.textContent = `Level ${userData.level || 1}`;
            }

            // Update XP information
            const xpElement = userInfoSection.querySelector('.user-xp');
            if (xpElement) {
                xpElement.textContent = `XP: ${userData.experience_points || 0}`;
            }

            // Update XP progress bar if it exists
            const xpProgressBar = userInfoSection.querySelector('.xp-progress-bar');
            if (xpProgressBar) {
                const xpPercentage = (userData.experience_points % 100);
                xpProgressBar.style.width = `${xpPercentage}%`;
                xpProgressBar.textContent = `${xpPercentage}%`;
            }
        }

        // Update currency section
        const currencySection = notebook.querySelector('.notebook-section.currency');
        if (currencySection && userData.currency_balances) {
            const currencyList = currencySection.querySelector('.currency-list');
            if (currencyList) {
                currencyList.innerHTML = '';

                // Add each currency to the list
                Object.entries(userData.currency_balances).forEach(([currency, amount]) => {
                    const currencyItem = document.createElement('div');
                    currencyItem.classList.add('currency-item');

                    const currencySymbol = document.createElement('span');
                    currencySymbol.classList.add('currency-symbol');
                    currencySymbol.textContent = currency;

                    const currencyAmount = document.createElement('span');
                    currencyAmount.classList.add('currency-amount');
                    currencyAmount.textContent = amount;

                    currencyItem.appendChild(currencySymbol);
                    currencyItem.appendChild(currencyAmount);
                    currencyList.appendChild(currencyItem);
                });
            }
        }

        // Update missions section
        const missionsSection = notebook.querySelector('.notebook-section.missions');
        if (missionsSection && userData.active_missions) {
            const missionsList = missionsSection.querySelector('.missions-list');
            if (missionsList) {
                missionsList.innerHTML = '';

                if (userData.active_missions.length > 0) {
                    // Add each mission to the list
                    userData.active_missions.forEach(mission => {
                        const missionItem = document.createElement('li');
                        missionItem.classList.add('mission-item');

                        const missionTitle = document.createElement('div');
                        missionTitle.classList.add('mission-title');
                        missionTitle.textContent = mission.title || `Mission #${mission.id || '?'}`;

                        const missionDescription = document.createElement('div');
                        missionDescription.classList.add('mission-description');
                        missionDescription.textContent = mission.description || 'Details classified';

                        missionItem.appendChild(missionTitle);
                        missionItem.appendChild(missionDescription);
                        missionsList.appendChild(missionItem);
                    });
                } else {
                    // No missions message
                    const noMissions = document.createElement('p');
                    noMissions.textContent = 'No active missions';
                    missionsList.appendChild(noMissions);
                }
            }
        }

        // Update relationships section
        const relationshipsSection = notebook.querySelector('.notebook-section.relationships');
        if (relationshipsSection && userData.character_relationships) {
            const relationshipsList = relationshipsSection.querySelector('.relationships-list');
            if (relationshipsList) {
                relationshipsList.innerHTML = '';

                const relationships = Object.entries(userData.character_relationships);
                if (relationships.length > 0) {
                    // Add each relationship to the list
                    relationships.forEach(([charId, data]) => {
                        const relationshipItem = document.createElement('li');
                        relationshipItem.classList.add('relationship-item');

                        const charName = document.createElement('span');
                        charName.classList.add('char-name');
                        charName.textContent = data.name || `Character #${charId}`;

                        const relationshipMeter = document.createElement('div');
                        relationshipMeter.classList.add('relationship-meter');

                        const relationshipLevel = document.createElement('div');
                        relationshipLevel.classList.add('relationship-level');
                        relationshipLevel.style.width = `${(data.relationship_value || 0) * 10}%`;

                        relationshipMeter.appendChild(relationshipLevel);
                        relationshipItem.appendChild(charName);
                        relationshipItem.appendChild(relationshipMeter);
                        relationshipsList.appendChild(relationshipItem);
                    });
                } else {
                    // No relationships message
                    const noRelationships = document.createElement('p');
                    noRelationships.textContent = 'No character relationships';
                    relationshipsList.appendChild(noRelationships);
                }
            }
        }
    }
};

// Export for ES module use
export default NotebookManager;

// Initialize on page load if we're not in an ES module context
if (typeof window !== 'undefined') {
    window.NotebookManager = NotebookManager;
    document.addEventListener('DOMContentLoaded', () => NotebookManager.initialize());
}