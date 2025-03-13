
/**
 * Module for handling user progress, including agent login and progress
 */
class UserProgressManager {
    constructor() {
        this.userData = null;
        this.isInitialized = false;
    }

    /**
     * Initialize the user progress manager
     */
    initialize() {
        // Setup event listeners
        this.setupEventListeners();
        console.log("User progress manager initialized");
        
        // Check if we have a stored agent codename
        const storedCodename = localStorage.getItem('agentCodename');
        if (storedCodename) {
            document.getElementById('protagonistName').value = storedCodename;
            // Auto-load agent data
            this.loadAgentData(storedCodename);
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for load agent button click
        const loadAgentBtn = document.getElementById('loadAgentBtn');
        if (loadAgentBtn) {
            loadAgentBtn.addEventListener('click', () => {
                const agentCodename = document.getElementById('protagonistName').value.trim();
                if (agentCodename) {
                    this.loadAgentData(agentCodename);
                } else {
                    this.showNotification('Please enter an agent codename', 'warning');
                }
            });
        }

        // Listen for protagonist name input change
        const protagonistNameInput = document.getElementById('protagonistName');
        if (protagonistNameInput) {
            protagonistNameInput.addEventListener('change', (e) => {
                const agentCodename = e.target.value.trim();
                if (agentCodename) {
                    // Save to local storage
                    localStorage.setItem('agentCodename', agentCodename);
                    // Optionally auto-load data
                    this.loadAgentData(agentCodename);
                }
            });
        }
    }

    /**
     * Load agent data by codename
     * @param {string} codename - The agent's codename to look up
     */
    loadAgentData(codename) {
        if (!codename) return;

        // Show loading state
        this.toggleAgentDetailsLoading(true);

        // Make API call to get user progress data
        fetch(`/api/user/progress?codename=${encodeURIComponent(codename)}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to load agent data');
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    this.userData = data.user_progress;
                    this.updateAgentDisplay();
                    this.showNotification(`Agent ${codename} loaded successfully!`, 'success');
                } else {
                    // If no existing data but valid response, we'll create a new agent
                    this.userData = {
                        level: 1,
                        experience_points: 0,
                        currency_balances: {
                            "💎": 500,
                            "💷": 5000,
                            "💶": 5000,
                            "💴": 5000,
                            "💵": 5000,
                        },
                        is_new: true
                    };
                    this.updateAgentDisplay();
                    this.showNotification(`New agent ${codename} created!`, 'info');
                }
            })
            .catch(error => {
                console.error('Error loading agent data:', error);
                this.showNotification('Error loading agent data', 'danger');
                this.toggleAgentDetailsLoading(false);
            });
    }

    /**
     * Toggle loading state for agent details
     * @param {boolean} isLoading - Whether the data is loading
     */
    toggleAgentDetailsLoading(isLoading) {
        const placeholder = document.getElementById('agent-details-placeholder');
        const details = document.getElementById('agent-details');
        
        if (isLoading) {
            if (placeholder) placeholder.innerHTML = '<div class="text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div><p class="mt-2">Loading agent data...</p></div>';
            if (details) details.style.display = 'none';
        } else {
            if (placeholder) placeholder.style.display = 'none';
            if (details) details.style.display = 'block';
        }
    }

    /**
     * Update the agent display with loaded data
     */
    updateAgentDisplay() {
        if (!this.userData) return;

        // Hide placeholder and show details
        this.toggleAgentDetailsLoading(false);
        
        const agentDetails = document.getElementById('agent-details');
        const placeholder = document.getElementById('agent-details-placeholder');
        
        if (agentDetails) agentDetails.style.display = 'block';
        if (placeholder) placeholder.style.display = 'none';

        // Update level and XP
        document.getElementById('agent-level').textContent = this.userData.level;
        document.getElementById('agent-xp').textContent = this.userData.experience_points;
        
        // Calculate XP progress (simple formula: level = 1 + sqrt(xp/100))
        const nextLevelXP = Math.pow((this.userData.level), 2) * 100;
        const prevLevelXP = Math.pow((this.userData.level - 1), 2) * 100;
        const xpRange = nextLevelXP - prevLevelXP;
        const xpProgress = (this.userData.experience_points - prevLevelXP) / xpRange * 100;
        
        // Update XP bar
        const xpBar = document.getElementById('agent-xp-bar');
        if (xpBar) xpBar.style.width = `${Math.min(100, Math.max(0, xpProgress))}%`;

        // Update currency display
        const currencyContainer = document.getElementById('agent-currency');
        if (currencyContainer) {
            currencyContainer.innerHTML = '';
            
            for (const [currency, amount] of Object.entries(this.userData.currency_balances)) {
                const currencyItem = document.createElement('div');
                currencyItem.className = 'currency-item';
                currencyItem.innerHTML = `
                    <span class="currency-symbol">${currency}</span>
                    <span class="currency-amount">${amount.toLocaleString()}</span>
                `;
                currencyContainer.appendChild(currencyItem);
            }
        }

        // Handle continue story button
        const continueStoryContainer = document.getElementById('continue-story-container');
        if (continueStoryContainer && this.userData.current_story_id) {
            // Store last story ID in localStorage
            localStorage.setItem('lastStoryId', this.userData.current_story_id);
            continueStoryContainer.style.display = 'block';
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

// Export the UserProgressManager class for ES6 modules
export default UserProgressManager;

// For backward compatibility with non-module scripts
if (typeof window !== 'undefined') {
    // Make UserProgressManager available globally
    window.UserProgressManager = UserProgressManager;
}-module scripts
if (typeof window !== 'undefined') {
    // Make UserProgressManager available globally
    window.UserProgressManager = UserProgressManager;
    
    // Initialize the user progress manager when the DOM is loaded
    document.addEventListener('DOMContentLoaded', () => {
        try {
            const userProgressManager = new UserProgressManager();
            userProgressManager.initialize();
            // Store instance globally for debugging
            window.userProgressManagerInstance = userProgressManager;
        } catch (error) {
            console.error('Error initializing UserProgressManager:', error);
        }
    });
}
