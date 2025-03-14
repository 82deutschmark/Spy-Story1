/**
 * Module for handling user progress, including agent login and progress
 */
class UserProgressManager {
    constructor() {
        this.userData = {
            level: 1,
            experience_points: 0,
            currency_balances: {},
            active_missions: [],
            encountered_characters: {},
            current_story_id: null
        };

        this.initialized = false;
        console.log("User progress manager initialized");
    }

    /**
     * Initialize user progress data
     */
    async initialize() {
        try {
            // Fetch initial user progress data
            const response = await fetch('/api/user_progress');
            if (!response.ok) {
                throw new Error('Failed to fetch user progress');
            }

            const data = await response.json();
            if (data.success && data.user_progress) {
                this.updateUserData(data.user_progress);
                this.initialized = true;
            }

            // Update UI elements
            this.updateUIElements();

            // Set up event listeners for notebook elements
            this.setupNotebookListeners();
        } catch (error) {
            console.error("Error initializing user progress:", error);
        }
    }

    /**
     * Set up event listeners for notebook elements
     */
    setupNotebookListeners() {
        const notebookBtn = document.getElementById('toggleNotebookBtn');
        const closeBtn = document.getElementById('closeNotebookBtn');
        const sidebar = document.getElementById('notebookSidebar');

        if (!notebookBtn || !closeBtn || !sidebar) {
            console.log("Notebook elements not found in the DOM, skipping initialization");
            return;
        }

        notebookBtn.addEventListener('click', () => {
            sidebar.classList.add('open');
        });

        closeBtn.addEventListener('click', () => {
            sidebar.classList.remove('open');
        });
    }

    /**
     * Update user data from API response
     * @param {Object} progressData - The user progress data
     */
    updateUserData(progressData) {
        if (!progressData) return;

        this.userData = {
            ...this.userData,
            ...progressData
        };
    }

    /**
     * Update UI elements with current user data
     */
    updateUIElements() {
        // Update agent name
        const agentName = document.getElementById('agentName');
        if (agentName) agentName.textContent = this.userData.protagonist_name || 'Agent';

        // Update level and XP
        const agentLevel = document.getElementById('agentLevel');
        const agentXP = document.getElementById('agentXP');
        const xpProgressBar = document.getElementById('xpProgressBar');

        if (agentLevel) agentLevel.textContent = this.userData.level || 1;
        if (agentXP) agentXP.textContent = this.userData.experience_points || 0;

        // Calculate XP progress (simple formula: level = 1 + sqrt(xp/100))
        if (xpProgressBar && this.userData.experience_points) {
            const nextLevelXP = Math.pow((this.userData.level), 2) * 100;
            const prevLevelXP = Math.pow((this.userData.level - 1), 2) * 100;
            const xpRange = nextLevelXP - prevLevelXP;
            const xpProgress = (this.userData.experience_points - prevLevelXP) / xpRange * 100;

            xpProgressBar.style.width = `${Math.min(100, Math.max(0, xpProgress))}%`;
        }

        // Update currency balances
        const currencyContainer = document.querySelector('.currency-balances');
        if (currencyContainer && this.userData.currency_balances) {
            currencyContainer.innerHTML = '';

            for (const [currency, amount] of Object.entries(this.userData.currency_balances)) {
                const currencyItem = document.createElement('div');
                currencyItem.className = 'currency-item';
                currencyItem.innerHTML = `
                    <span class="currency-symbol">${currency}</span>
                    <span class="currency-amount">${amount}</span>
                `;
                currencyContainer.appendChild(currencyItem);
            }
        }

        // Update missions list
        const missionsList = document.querySelector('.notebook-missions-list');
        if (missionsList && this.userData.active_missions) {
            missionsList.innerHTML = '';

            if (this.userData.active_missions.length > 0) {
                for (const missionId of this.userData.active_missions) {
                    const missionItem = document.createElement('li');
                    missionItem.className = 'mission-item';
                    missionItem.textContent = `Mission #${missionId}`;
                    missionsList.appendChild(missionItem);
                }
            } else {
                missionsList.innerHTML = '<p>No active missions</p>';
            }
        }

        // Update character relationships
        const relationshipsList = document.querySelector('.relationships-list');
        if (relationshipsList && this.userData.character_relationships) {
            relationshipsList.innerHTML = '';

            if (Object.keys(this.userData.character_relationships).length > 0) {
                for (const [charId, data] of Object.entries(this.userData.character_relationships)) {
                    const relationshipItem = document.createElement('li');
                    relationshipItem.innerHTML = `
                        <span class="char-name">${data.name}</span>
                        <div class="relationship-meter">
                            <div class="relationship-level" style="width: ${data.relationship_value * 10}%"></div>
                        </div>
                    `;
                    relationshipsList.appendChild(relationshipItem);
                }
            } else {
                relationshipsList.innerHTML = '<p>No character relationships</p>';
            }
        }
    }

    /**
     * Show a notification toast
     * @param {string} message - The message to display
     * @param {string} type - The type of notification (success, danger, warning, info)
     */
    showNotification(message, type = 'info') {
        const toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) return;

        const toast = document.getElementById('notificationToast');
        const toastTitle = document.getElementById('toastTitle');
        const toastMessage = document.getElementById('toastMessage');

        // Set appropriate title and icon based on type
        let title = 'Notification';
        let icon = 'fa-info-circle';

        switch (type) {
            case 'success':
                title = 'Success';
                icon = 'fa-check-circle';
                break;
            case 'danger':
                title = 'Error';
                icon = 'fa-exclamation-circle';
                break;
            case 'warning':
                title = 'Warning';
                icon = 'fa-exclamation-triangle';
                break;
        }

        // Update toast content
        if (toastTitle) toastTitle.innerHTML = `<i class="fas ${icon} me-2"></i>${title}`;
        if (toastMessage) toastMessage.textContent = message;

        // Show the toast
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
    }

    /**
     * Get current user data
     * @returns {Object} The user data
     */
    getUserData() {
        return this.userData;
    }

    /**
     * Check if the user has enough currency
     * @param {Object} requirements - The currency requirements
     * @returns {boolean} Whether the user can afford the requirements
     */
    canAfford(requirements) {
        if (!this.userData || !this.userData.currency_balances) return false;

        for (const [currency, amount] of Object.entries(requirements)) {
            if ((this.userData.currency_balances[currency] || 0) < amount) {
                return false;
            }
        }

        return true;
    }
}

// Export the UserProgressManager class
export default UserProgressManager;