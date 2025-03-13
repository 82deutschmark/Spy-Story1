
/**
 * Module for handling the notebook sidebar functionality
 */
class NotebookManager {
    constructor() {
        this.notebookElement = null;
        this.toggleButton = null;
        this.closeButton = null;
        this.continueStoryButton = null;
        this.isOpen = false;
        this.lastStoryId = null;
        this.currentPage = this.detectCurrentPage();
    }

    /**
     * Detect which page we're on to determine if notebook should be initialized
     */
    detectCurrentPage() {
        const path = window.location.pathname;
        if (path.includes('/storyboard')) {
            return 'storyboard';
        } else if (path === '/' || path === '/index.html') {
            return 'index';
        } else if (path.includes('/debug')) {
            return 'debug';
        }
        return 'other';
    }

    initialize() {
        // Get last story ID from local storage
        this.lastStoryId = localStorage.getItem('lastStoryId');

        // Only try to initialize notebook UI on storyboard page
        if (this.currentPage === 'storyboard') {
            // Initialize notebook elements
            this.notebookElement = document.getElementById('notebookSidebar');
            this.toggleButton = document.getElementById('toggleNotebookBtn');
            this.closeButton = document.getElementById('closeNotebookBtn');
            this.continueStoryButton = document.getElementById('continueStoryBtn');
            
            if (this.toggleButton && this.notebookElement) {
                this.setupEventListeners();
                console.log("Notebook manager initialized on storyboard page");
            } else {
                console.error("Notebook elements not found in the DOM on storyboard page");
            }
        } else {
            console.log(`Notebook manager skipped initialization (current page: ${this.currentPage})`);
        }
    }

    setupEventListeners() {
        // Toggle notebook visibility
        this.toggleButton.addEventListener('click', () => this.toggleNotebook());
        
        // Close notebook when close button is clicked
        if (this.closeButton) {
            this.closeButton.addEventListener('click', () => this.closeNotebook());
        }
        
        // Continue story from last point if available
        if (this.continueStoryButton && this.lastStoryId) {
            this.continueStoryButton.style.display = 'block';
            this.continueStoryButton.addEventListener('click', () => this.continueStory());
        } else if (this.continueStoryButton) {
            this.continueStoryButton.style.display = 'none';
        }
    }

    toggleNotebook() {
        this.isOpen = !this.isOpen;
        if (this.notebookElement) {
            if (this.isOpen) {
                this.notebookElement.classList.add('open');
            } else {
                this.notebookElement.classList.remove('open');
            }
        }
    }

    closeNotebook() {
        this.isOpen = false;
        if (this.notebookElement) {
            this.notebookElement.classList.remove('open');
        }
    }

    continueStory() {
        if (this.lastStoryId) {
            window.location.href = `/storyboard?story_id=${this.lastStoryId}`;
        }
    }

    updateNotebookContent(userData) {
        if (!this.notebookElement || !userData) return;
        
        // Update user stats
        const levelElement = document.getElementById('user-level');
        const xpElement = document.getElementById('user-xp');
        
        if (levelElement) levelElement.textContent = userData.level;
        if (xpElement) xpElement.textContent = userData.experience_points;
        
        // Update currency display
        const currencyList = document.getElementById('currency-list');
        if (currencyList && userData.currency_balances) {
            currencyList.innerHTML = '';
            
            for (const [currency, amount] of Object.entries(userData.currency_balances)) {
                const currencyItem = document.createElement('div');
                currencyItem.className = 'currency-item';
                currencyItem.innerHTML = `
                    <span class="currency-symbol">${currency}</span>
                    <span class="currency-amount">${amount.toLocaleString()}</span>
                `;
                currencyList.appendChild(currencyItem);
            }
        }
        
        // Update missions list
        this.updateMissionsList(userData.active_missions);
        
        // Update characters list
        this.updateCharactersList(userData.encountered_characters);
    }
    
    updateMissionsList(missions) {
        const missionsList = document.getElementById('missions-list');
        if (!missionsList || !missions) return;
        
        if (missions.length === 0) {
            missionsList.innerHTML = '<div class="empty-list">No active missions</div>';
            return;
        }
        
        missionsList.innerHTML = '';
        
        missions.forEach(mission => {
            const missionItem = document.createElement('div');
            missionItem.className = 'mission-item';
            
            // Calculate progress percentage
            const progressPercent = mission.progress ? Math.min(100, Math.max(0, mission.progress)) : 0;
            
            missionItem.innerHTML = `
                <div class="mission-title">${mission.title || 'Unknown Mission'}</div>
                <div class="mission-objective">${mission.objective || 'No details available'}</div>
                <div class="mission-progress">
                    <div class="progress">
                        <div class="progress-bar" role="progressbar" style="width: ${progressPercent}%" 
                            aria-valuenow="${progressPercent}" aria-valuemin="0" aria-valuemax="100">
                            ${progressPercent}%
                        </div>
                    </div>
                </div>
            `;
            
            missionsList.appendChild(missionItem);
        });
    }
    
    updateCharactersList(characters) {
        const charactersList = document.getElementById('characters-list');
        if (!charactersList || !characters) return;
        
        if (Object.keys(characters).length === 0) {
            charactersList.innerHTML = '<div class="empty-list">No characters encountered yet</div>';
            return;
        }
        
        charactersList.innerHTML = '';
        
        for (const [characterId, data] of Object.entries(characters)) {
            const characterItem = document.createElement('div');
            characterItem.className = 'character-item';
            
            // Determine relationship class based on level
            let relationClass = 'relation-neutral';
            const relationLevel = data.relationship_level || 0;
            
            if (relationLevel <= -50) relationClass = 'relation-very-negative';
            else if (relationLevel < 0) relationClass = 'relation-negative';
            else if (relationLevel > 0 && relationLevel < 50) relationClass = 'relation-positive';
            else if (relationLevel >= 50) relationClass = 'relation-very-positive';
            
            characterItem.innerHTML = `
                <div class="character-name">${data.name || 'Unknown Character'}</div>
                <div class="character-relation">
                    Relationship: <span class="relation-value ${relationClass}">${relationLevel}</span>
                </div>
            `;
            
            charactersList.appendChild(characterItem);
        }
    }
}

// Make NotebookManager available globally
if (typeof window !== 'undefined') {
    window.NotebookManager = NotebookManager;
    
    // Initialize the notebook manager when the DOM is loaded
    document.addEventListener('DOMContentLoaded', () => {
        try {
            const notebookManager = new NotebookManager();
            notebookManager.initialize();
            // Store instance globally for debugging
            window.notebookManagerInstance = notebookManager;
        } catch (error) {
            console.error('Error initializing NotebookManager:', error);
        }
    });
}
