
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
        this.setupNotebookToggle();
    },

    /**
     * Set up notebook toggle functionality
     */
    setupNotebookToggle() {
        const notebookToggle = document.querySelector('.notebook-toggle');
        if (notebookToggle) {
            notebookToggle.addEventListener('click', () => {
                const notebook = document.querySelector('.notebook-container');
                if (notebook) {
                    const isOpen = notebook.classList.toggle('open');
                    notebookToggle.innerHTML = isOpen ? 
                        '<i class="fas fa-book-open"></i> Close Notebook' : 
                        '<i class="fas fa-book"></i> Open Notebook';
                }
            });
        }
        
        // Also set up close button functionality
        const closeBtn = document.querySelector('.notebook-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                const notebook = document.querySelector('.notebook-container');
                if (notebook) {
                    notebook.classList.remove('open');
                    const toggle = document.querySelector('.notebook-toggle');
                    if (toggle) {
                        toggle.innerHTML = '<i class="fas fa-book"></i> Open Notebook';
                    }
                }
            });
        }
        
        // Update notebook when protagonist name changes
        const nameInput = document.getElementById('protagonistName');
        if (nameInput) {
            nameInput.addEventListener('input', () => {
                const nameElement = document.querySelector('.protagonist-name');
                if (nameElement) {
                    nameElement.textContent = nameInput.value || 'Unknown Agent';
                }
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
        
        // Update user info section
        const userInfoSection = notebook.querySelector('.notebook-section.user-info');
        if (userInfoSection) {
            const nameElement = userInfoSection.querySelector('.protagonist-name');
            if (nameElement && userData.game_state && userData.game_state.protagonist_name) {
                nameElement.textContent = userData.game_state.protagonist_name;
            }
            
            const levelElement = userInfoSection.querySelector('.user-level');
            if (levelElement) {
                levelElement.textContent = `Level ${userData.level || 1}`;
            }
            
            const xpElement = userInfoSection.querySelector('.user-xp');
            if (xpElement) {
                xpElement.textContent = `XP: ${userData.experience_points || 0}`;
            }
        }
        
        // Update currency section
        const currencySection = notebook.querySelector('.notebook-section.currency');
        if (currencySection && userData.currency_balances) {
            const currencyList = currencySection.querySelector('.currency-list');
            if (currencyList) {
                currencyList.innerHTML = '';
                for (const [currency, amount] of Object.entries(userData.currency_balances)) {
                    const currencyItem = document.createElement('div');
                    currencyItem.className = 'currency-item';
                    currencyItem.innerHTML = `<span class="currency-symbol">${currency}</span> <span class="currency-amount">${amount}</span>`;
                    currencyList.appendChild(currencyItem);
                }
            }
        }
        
        // Update missions section
        const missionsSection = notebook.querySelector('.notebook-section.missions');
        if (missionsSection && userData.active_missions) {
            const missionsList = missionsSection.querySelector('.missions-list');
            if (missionsList) {
                missionsList.innerHTML = '';
                if (userData.active_missions.length === 0) {
                    missionsList.innerHTML = '<div class="empty-list">No active missions</div>';
                } else {
                    userData.active_missions.forEach(mission => {
                        const missionItem = document.createElement('div');
                        missionItem.className = 'mission-item';
                        missionItem.innerHTML = `
                            <div class="mission-title">${mission.title}</div>
                            <div class="mission-objective">${mission.objective}</div>
                            <div class="mission-progress">
                                <div class="progress">
                                    <div class="progress-bar bg-success" role="progressbar" 
                                        style="width: ${mission.progress}%" 
                                        aria-valuenow="${mission.progress}" 
                                        aria-valuemin="0" 
                                        aria-valuemax="100">
                                        ${mission.progress}%
                                    </div>
                                </div>
                            </div>
                        `;
                        missionsList.appendChild(missionItem);
                    });
                }
            }
        }
        
        // Update characters section
        const charactersSection = notebook.querySelector('.notebook-section.characters');
        if (charactersSection && userData.encountered_characters) {
            const charactersList = charactersSection.querySelector('.characters-list');
            if (charactersList) {
                charactersList.innerHTML = '';
                const characters = Object.entries(userData.encountered_characters);
                if (characters.length === 0) {
                    charactersList.innerHTML = '<div class="empty-list">No encountered characters</div>';
                } else {
                    characters.forEach(([id, charData]) => {
                        const characterItem = document.createElement('div');
                        characterItem.className = 'character-item';
                        characterItem.innerHTML = `
                            <div class="character-name">${charData.name}</div>
                            <div class="relationship-level">Relationship: 
                                <span class="relation-value ${this.getRelationshipClass(charData.relationship_level)}">
                                    ${charData.relationship_level}
                                </span>
                            </div>
                        `;
                        charactersList.appendChild(characterItem);
                    });
                }
            }
        }
    },
    
    /**
     * Get appropriate CSS class based on relationship level
     * @param {number} level - Relationship level value
     * @returns {string} CSS class name
     */
    getRelationshipClass(level) {
        if (level < -5) return 'relation-very-negative';
        if (level < 0) return 'relation-negative';
        if (level === 0) return 'relation-neutral';
        if (level > 5) return 'relation-very-positive';
        return 'relation-positive';
    },
    
    /**
     * Creates notebook HTML structure
     * @returns {string} Notebook HTML
     */
    createNotebookHTML() {
        return `
        <div class="notebook-container">
            <div class="notebook-header">
                <h3><i class="fas fa-book"></i> Agent's Notebook</h3>
                <button class="notebook-close-btn"><i class="fas fa-times"></i></button>
            </div>
            <div class="notebook-content">
                <div class="notebook-section user-info">
                    <h4>Agent Profile</h4>
                    <div class="protagonist-name">Unknown Agent</div>
                    <div class="user-stats">
                        <div class="user-level">Level 1</div>
                        <div class="user-xp">XP: 0</div>
                    </div>
                </div>
                
                <div class="notebook-section currency">
                    <h4>Resources</h4>
                    <div class="currency-list">
                        <div class="currency-item">
                            <span class="currency-symbol">💎</span>
                            <span class="currency-amount">0</span>
                        </div>
                    </div>
                </div>
                
                <div class="notebook-section missions">
                    <h4>Active Missions</h4>
                    <div class="missions-list">
                        <div class="empty-list">No active missions</div>
                    </div>
                </div>
                
                <div class="notebook-section characters">
                    <h4>Network Contacts</h4>
                    <div class="characters-list">
                        <div class="empty-list">No encountered characters</div>
                    </div>
                </div>
            </div>
        </div>
        <button class="notebook-toggle"><i class="fas fa-book"></i> Open Notebook</button>
        `;
    }
};

// Export for ES module use
export default NotebookManager;

// Initialize on page load if we're not in an ES module context
if (typeof window !== 'undefined') {
    window.NotebookManager = NotebookManager;
    document.addEventListener('DOMContentLoaded', () => NotebookManager.initialize());
}
