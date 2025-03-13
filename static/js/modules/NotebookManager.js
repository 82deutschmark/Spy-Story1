/**
 * Notebook Management Module
 * Handles displaying and updating user progress information
 */
import UIUtils from './UIUtils.js';

const NotebookManager = {
    /**
     * Initialize the notebook manager
     */
    initialize() {
        console.log('Notebook manager initialized');
        this.setupEventListeners();
    },

    /**
     * Set up event listeners for notebook interactions
     */
    setupEventListeners() {
        // Set up notebook toggle on storyboard
        const toggleBtn = document.getElementById('toggleNotebookBtn');
        const closeBtn = document.getElementById('closeNotebookBtn');
        const notebookSidebar = document.getElementById('notebookSidebar');

        if (toggleBtn && notebookSidebar) {
            toggleBtn.addEventListener('click', () => {
                notebookSidebar.classList.toggle('active');
            });
        }

        if (closeBtn && notebookSidebar) {
            closeBtn.addEventListener('click', () => {
                notebookSidebar.classList.remove('active');
            });
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

        // Update agent info
        const agentNameElement = document.getElementById('agentName');
        const agentLevelElement = document.getElementById('agentLevel');
        const agentXPElement = document.getElementById('agentXP');
        const xpProgressBar = document.getElementById('xpProgressBar');

        if (agentNameElement && userData.protagonist_name) {
            agentNameElement.textContent = userData.protagonist_name;
        }

        if (agentLevelElement) {
            agentLevelElement.textContent = userData.level || 1;
        }

        if (agentXPElement) {
            agentXPElement.textContent = userData.experience_points || 0;
        }

        if (xpProgressBar) {
            const xpPercentage = (userData.experience_points % 100);
            xpProgressBar.style.width = `${xpPercentage}%`;
        }

        // Update currency section
        if (userData.currency_balances) {
            const currencyContainer = document.querySelector('.currency-balances');
            if (currencyContainer) {
                currencyContainer.innerHTML = '';

                for (const [currency, amount] of Object.entries(userData.currency_balances)) {
                    const currencyItem = document.createElement('div');
                    currencyItem.className = 'currency-item';

                    const currencySymbol = document.createElement('span');
                    currencySymbol.className = 'currency-symbol';
                    currencySymbol.textContent = currency;

                    const currencyAmount = document.createElement('span');
                    currencyAmount.className = 'currency-amount';
                    currencyAmount.textContent = amount;

                    currencyItem.appendChild(currencySymbol);
                    currencyItem.appendChild(currencyAmount);
                    currencyContainer.appendChild(currencyItem);
                }
            }
        }

        // Update mission section
        if (userData.active_missions) {
            const missionsList = document.querySelector('.notebook-missions-list');
            if (missionsList) {
                missionsList.innerHTML = '';

                if (userData.active_missions.length > 0) {
                    userData.active_missions.forEach(missionId => {
                        const missionItem = document.createElement('li');
                        missionItem.className = 'mission-item';
                        missionItem.textContent = `Mission #${missionId}`;
                        missionsList.appendChild(missionItem);
                    });
                } else {
                    const noMissions = document.createElement('p');
                    noMissions.textContent = 'No active missions';
                    missionsList.appendChild(noMissions);
                }
            }
        }

        // Update relationships section
        if (userData.character_relationships) {
            const relationshipsList = document.querySelector('.relationships-list');
            if (relationshipsList) {
                relationshipsList.innerHTML = '';

                if (Object.keys(userData.character_relationships).length > 0) {
                    for (const [charId, data] of Object.entries(userData.character_relationships)) {
                        const li = document.createElement('li');

                        const charName = document.createElement('span');
                        charName.className = 'char-name';
                        charName.textContent = data.name;

                        const relationshipMeter = document.createElement('div');
                        relationshipMeter.className = 'relationship-meter';

                        const relationshipLevel = document.createElement('div');
                        relationshipLevel.className = 'relationship-level';
                        relationshipLevel.style.width = `${data.relationship_value * 10}%`;

                        relationshipMeter.appendChild(relationshipLevel);
                        li.appendChild(charName);
                        li.appendChild(relationshipMeter);
                        relationshipsList.appendChild(li);
                    }
                } else {
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