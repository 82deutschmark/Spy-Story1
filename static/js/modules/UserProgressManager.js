/**
 * User Progress Manager Module
 * Manages user progress data and interface
 */

const UserProgressManager = {
    initialize() {
        console.log('User progress manager initialized');
        this.loadUserProgress();
        this.setupEventListeners();
    },

    loadUserProgress() {
        // Get user progress from the server
        const userProgressElement = document.getElementById('userProgress');
        if (userProgressElement) {
            const currency = userProgressElement.dataset.currency;
            const level = userProgressElement.dataset.level;
            const xp = userProgressElement.dataset.xp;

            if (currency) {
                try {
                    this.currentCurrency = JSON.parse(currency);
                } catch (e) {
                    console.error('Error parsing currency data:', e);
                    this.currentCurrency = {};
                }
            }

            this.currentLevel = level || 1;
            this.currentXP = xp || 0;

            this.updateProgressDisplay();
        } else {
            console.log('No user ID found, using default data');
            // Default data for new users
            this.currentCurrency = {'💵': 5000, '💎': 100};
            this.currentLevel = 1;
            this.currentXP = 0;
        }
    },

    setupEventListeners() {
        // Event listeners are now handled by NotebookManager
        
        // Set up currency trade handlers if on storyboard
        const tradeForm = document.getElementById('tradeForm');
        if (tradeForm) {
            tradeForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleTradeCurrency();
            });
        }bar');

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

    updateProgressDisplay() {
        // Update the UI with current progress in both progress modal and notebook
        const levelElement = document.getElementById('userLevel');
        const xpElement = document.getElementById('userXP');
        const currencyContainer = document.getElementById('currencyBalances');

        if (levelElement) levelElement.textContent = this.currentLevel;
        if (xpElement) xpElement.textContent = this.currentXP;
        
        // Use NotebookManager to update the notebook if it exists
        if (window.NotebookManager) {
            const userData = {
                protagonist_name: document.getElementById('agentName')?.textContent || 'Agent',
                level: this.currentLevel,
                experience_points: this.currentXP,
                currency_balances: this.currentCurrency,
                active_missions: [],  // This would be filled with actual mission data
                character_relationships: {}  // This would be filled with actual relationship data
            };
            
            window.NotebookManager.updateNotebook(userData);
        }
        }

        if (currencyContainer) {
            currencyContainer.innerHTML = '';
            for (const [currency, amount] of Object.entries(this.currentCurrency)) {
                const currencyItem = document.createElement('div');
                currencyItem.classList.add('currency-item');
                currencyItem.innerHTML = `
                    <span class="currency-symbol">${currency}</span>
                    <span class="currency-amount">${amount}</span>
                `;
                currencyContainer.appendChild(currencyItem);
            }
        }
    },

    updateCurrency(newBalances) {
        this.currentCurrency = newBalances;
        this.updateProgressDisplay();
    },

    updateExperience(level, xp) {
        this.currentLevel = level;
        this.currentXP = xp;
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