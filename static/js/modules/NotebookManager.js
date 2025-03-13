
/**
 * Notebook Manager Module
 * Handles notebook UI component displaying user progress, missions, etc.
 */
const NotebookManager = {
    /**
     * Initialize the notebook manager
     */
    initialize() {
        console.log('Notebook manager initialized');
        this.setupEventListeners();
    },

    /**
     * Setup event listeners for notebook interactions
     */
    setupEventListeners() {
        // Get toggle button and notebook sidebar
        const toggleBtn = document.querySelector('.notebook-toggle-btn');
        const sidebar = document.querySelector('.notebook-sidebar');
        const closeBtn = document.querySelector('.close-notebook-btn');
        
        if (!toggleBtn || !sidebar) {
            console.warn('Notebook elements not found in the DOM');
            return;
        }
        
        // Toggle notebook visibility when button is clicked
        toggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            sidebar.classList.toggle('active');
        });
        
        // Close notebook when close button is clicked
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                sidebar.classList.remove('active');
            });
        }
        
        // Close notebook when clicking outside
        document.addEventListener('click', (e) => {
            if (sidebar.classList.contains('active') && 
                !sidebar.contains(e.target) && 
                e.target !== toggleBtn) {
                sidebar.classList.remove('active');
            }
        });
    },

    /**
     * Update notebook content with user progress data
     * @param {Object} userData - User progress data
     */
    updateNotebookContent(userData) {
        if (!userData) {
            console.warn('No user data provided to update notebook');
            return;
        }
        
        this.updateAgentDetails(userData);
        this.updateLevelInfo(userData);
        this.updateCurrencyBalances(userData);
        this.updateMissions(userData);
        this.updateRelationships(userData);
    },
    
    /**
     * Update agent/protagonist details section
     * @param {Object} userData - User progress data
     */
    updateAgentDetails(userData) {
        const nameElement = document.getElementById('agent-name');
        if (nameElement && userData.protagonist_name) {
            nameElement.textContent = userData.protagonist_name;
        }
    },
    
    /**
     * Update level information section
     * @param {Object} userData - User progress data
     */
    updateLevelInfo(userData) {
        const levelElement = document.getElementById('user-level');
        const xpElement = document.getElementById('user-xp');
        
        if (levelElement && userData.level !== undefined) {
            levelElement.textContent = userData.level;
        }
        
        if (xpElement && userData.experience_points !== undefined) {
            xpElement.textContent = userData.experience_points;
        }
    },
    
    /**
     * Update currency balances section
     * @param {Object} userData - User progress data
     */
    updateCurrencyBalances(userData) {
        const currencyContainer = document.getElementById('currency-balances');
        if (!currencyContainer || !userData.currency_balances) {
            return;
        }
        
        currencyContainer.innerHTML = '';
        
        // Create elements for each currency type
        for (const [currency, amount] of Object.entries(userData.currency_balances)) {
            const currencyElement = document.createElement('div');
            currencyElement.classList.add('currency-item');
            
            let currencySymbol = '';
            switch (currency) {
                case 'diamonds': currencySymbol = '💎'; break;
                case 'dollars': currencySymbol = '💵'; break;
                case 'pounds': currencySymbol = '💷'; break;
                case 'euros': currencySymbol = '💶'; break;
                case 'yen': currencySymbol = '💴'; break;
                default: currencySymbol = '💰';
            }
            
            currencyElement.innerHTML = `<span>${currencySymbol} ${amount}</span>`;
            currencyContainer.appendChild(currencyElement);
        }
    },
    
    /**
     * Update missions section
     * @param {Object} userData - User progress data
     */
    updateMissions(userData) {
        const missionsContainer = document.getElementById('active-missions');
        if (!missionsContainer || !userData.active_missions) {
            return;
        }
        
        missionsContainer.innerHTML = '';
        
        if (userData.active_missions.length === 0) {
            missionsContainer.innerHTML = '<p>No active missions</p>';
            return;
        }
        
        // Create elements for each active mission
        userData.active_missions.forEach(mission => {
            const missionElement = document.createElement('div');
            missionElement.classList.add('mission-item');
            
            missionElement.innerHTML = `
                <div class="mission-title">${mission.title || 'Unnamed Mission'}</div>
                <div class="mission-desc">${mission.description || 'No description'}</div>
                <div class="mission-giver">From: ${mission.mission_giver || 'Unknown'}</div>
            `;
            
            missionsContainer.appendChild(missionElement);
        });
    },
    
    /**
     * Update relationships section
     * @param {Object} userData - User progress data
     */
    updateRelationships(userData) {
        const relationshipsContainer = document.getElementById('character-relationships');
        if (!relationshipsContainer || !userData.relationships) {
            return;
        }
        
        relationshipsContainer.innerHTML = '';
        
        if (Object.keys(userData.relationships).length === 0) {
            relationshipsContainer.innerHTML = '<p>No relationships established</p>';
            return;
        }
        
        // Create elements for each relationship
        for (const [character, value] of Object.entries(userData.relationships)) {
            const relationshipElement = document.createElement('div');
            relationshipElement.classList.add('relationship-item');
            
            relationshipElement.innerHTML = `
                <span class="relationship-name">${character}</span>
                <span class="relationship-value">${value}</span>
            `;
            
            relationshipsContainer.appendChild(relationshipElement);
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
