
/**
 * User Progress Management Module
 * Handles fetching and updating user progress data
 */
import NotebookManager from './NotebookManager.js';

const UserProgressManager = {
    /**
     * Initialize user progress manager
     */
    initialize() {
        console.log('User progress manager initialized');
        this.userData = null;
        this.fetchUserData();
    },

    /**
     * Fetch user data from the API
     */
    fetchUserData() {
        // Get current user ID from session
        const userId = this._getUserId();
        if (!userId) {
            console.log('No user ID found, using default data');
            this._useDefaultData();
            return;
        }

        // Fetch user data from API
        fetch(`/api/game/state/${userId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to fetch user data: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.status === 'success' && data.data) {
                    this.userData = data.data;
                    console.log('User data loaded:', this.userData);
                    this._updateNotebook();
                } else {
                    throw new Error('Invalid response from server');
                }
            })
            .catch(error => {
                console.error('Error fetching user data:', error);
                this._useDefaultData();
            });
    },

    /**
     * Update the notebook with current user data
     */
    _updateNotebook() {
        if (NotebookManager && this.userData) {
            NotebookManager.updateNotebook(this.userData);
        }
    },

    /**
     * Get user ID from cookie or session storage
     * @returns {string|null} User ID or null if not found
     */
    _getUserId() {
        // Try to get from URL parameter first
        const urlParams = new URLSearchParams(window.location.search);
        const urlUserId = urlParams.get('user_id');
        if (urlUserId) return urlUserId;

        // Try to get from data attribute in body
        const bodyElement = document.body;
        if (bodyElement && bodyElement.dataset.userId) {
            return bodyElement.dataset.userId;
        }

        // Try to get from an input field that might contain it
        const userIdInput = document.querySelector('input[name="user_id"]');
        if (userIdInput && userIdInput.value) {
            return userIdInput.value;
        }

        // Try session storage as a fallback
        return sessionStorage.getItem('userId');
    },

    /**
     * Use default data when API call fails
     */
    _useDefaultData() {
        // Use default data structure matching our model
        this.userData = {
            user_id: 'guest',
            level: 1,
            experience_points: 0,
            currency_balances: {
                "💎": 500,
                "💷": 5000,
                "💶": 5000,
                "💴": 5000,
                "💵": 5000
            },
            active_missions: [],
            encountered_characters: {},
            game_state: {
                protagonist_name: "Agent"
            }
        };
        this._updateNotebook();
    }
};

// Export for ES module use
export default UserProgressManager;

// Initialize on page load if we're not in an ES module context
if (typeof window !== 'undefined') {
    window.UserProgressManager = UserProgressManager;
    document.addEventListener('DOMContentLoaded', () => UserProgressManager.initialize());
}
