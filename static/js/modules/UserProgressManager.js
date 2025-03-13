
/**
 * User Progress Manager Module
 * Manages user progress data and interface
 */
import NotebookManager from './NotebookManager.js';

const UserProgressManager = {
    // Current user data
    currentCurrency: {},
    currentLevel: 1,
    currentXP: 0,
    userData: null,

    initialize() {
        console.log('User progress manager initialized');
        this.loadUserProgress();
    },

    /**
     * Load user progress data from the server or from DOM elements
     */
    loadUserProgress() {
        // Get user progress from the server or from DOM elements
        const userProgressElement = document.getElementById('userProgress');
        if (userProgressElement) {
            this.userData = {
                level: userProgressElement.dataset.level || 1,
                experience_points: userProgressElement.dataset.xp || 0,
                currency_balances: {}
            };

            // Parse currency data
            const currency = userProgressElement.dataset.currency;
            if (currency) {
                try {
                    this.userData.currency_balances = JSON.parse(currency);
                    this.currentCurrency = JSON.parse(currency);
                } catch (e) {
                    console.error('Error parsing currency data:', e);
                    this.userData.currency_balances = {};
                    this.currentCurrency = {};
                }
            }

            // Set current user data
            this.currentLevel = this.userData.level;
            this.currentXP = this.userData.experience_points;

            // Get additional data from other elements if available
            const gameStateElement = document.getElementById('gameState');
            if (gameStateElement && gameStateElement.dataset.state) {
                try {
                    this.userData.game_state = JSON.parse(gameStateElement.dataset.state);
                } catch (e) {
                    console.error('Error parsing game state data:', e);
                    this.userData.game_state = {};
                }
            }

            // Get active missions if available
            const missionsElement = document.getElementById('activeMissions');
            if (missionsElement && missionsElement.dataset.missions) {
                try {
                    this.userData.active_missions = JSON.parse(missionsElement.dataset.missions);
                } catch (e) {
                    console.error('Error parsing active missions data:', e);
                    this.userData.active_missions = [];
                }
            }

            // Get character relationships if available
            const relationshipsElement = document.getElementById('characterRelationships');
            if (relationshipsElement && relationshipsElement.dataset.relationships) {
                try {
                    this.userData.character_relationships = JSON.parse(relationshipsElement.dataset.relationships);
                } catch (e) {
                    console.error('Error parsing character relationships data:', e);
                    this.userData.character_relationships = {};
                }
            }

            // Update UI with current data
            this.updateProgressDisplay();
        } else {
            console.log('No user ID found, using default data');
            // Default data for new users
            this.currentCurrency = {'💵': 5000, '💎': 100};
            this.currentLevel = 1;
            this.currentXP = 0;
            
            this.userData = {
                level: 1,
                experience_points: 0,
                currency_balances: {'💵': 5000, '💎': 100},
                active_missions: [],
                character_relationships: {},
                game_state: {
                    protagonist_name: 'Agent'
                }
            };
            
            this.updateProgressDisplay();
        }
    },

    /**
     * Update progress display in both progress modal and notebook
     */
    updateProgressDisplay() {
        // Update the progress modal elements
        const levelElement = document.getElementById('userLevel');
        const xpElement = document.getElementById('userXP');
        const currencyContainer = document.getElementById('currencyBalances');

        if (levelElement) levelElement.textContent = this.currentLevel;
        if (xpElement) xpElement.textContent = this.currentXP;

        // Update currency display in progress modal
        if (currencyContainer) {
            currencyContainer.innerHTML = '';
            Object.entries(this.currentCurrency).forEach(([currency, amount]) => {
                const currencyItem = document.createElement('div');
                currencyItem.classList.add('currency-item');
                currencyItem.innerHTML = `<span class="currency-symbol">${currency}</span> <span class="currency-amount">${amount}</span>`;
                currencyContainer.appendChild(currencyItem);
            });
        }

        // Update the notebook with all user data
        if (window.NotebookManager) {
            window.NotebookManager.updateNotebook(this.userData);
        } else if (NotebookManager) {
            NotebookManager.updateNotebook(this.userData);
        }
    },

    /**
     * Update user level, experience, or currency
     * @param {Object} updates - Object containing updates to apply
     */
    updateUserProgress(updates) {
        if (updates.level) {
            this.currentLevel = updates.level;
            this.userData.level = updates.level;
        }
        
        if (updates.xp) {
            this.currentXP = updates.xp;
            this.userData.experience_points = updates.xp;
        }
        
        if (updates.currency) {
            this.currentCurrency = {...this.currentCurrency, ...updates.currency};
            this.userData.currency_balances = {...this.userData.currency_balances, ...updates.currency};
        }
        
        if (updates.missions) {
            this.userData.active_missions = updates.missions;
        }
        
        if (updates.relationships) {
            this.userData.character_relationships = updates.relationships;
        }
        
        if (updates.game_state) {
            this.userData.game_state = {...this.userData.game_state, ...updates.game_state};
        }
        
        // Update the display with new data
        this.updateProgressDisplay();
    }
};

// Export for ES module use
export default UserProgressManager;

// Initialize on page load if we're not in an ES module context
if (typeof window !== 'undefined') {
    window.UserProgressManager = UserProgressManager;
    document.addEventListener('DOMContentLoaded', () => UserProgressManager.initialize());
}
