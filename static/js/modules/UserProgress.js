/**
 * UserProgress.js - User State and Progress Management
 * =============================================
 * 
 * !!! IMPORTANT - READ BEFORE MODIFYING !!!
 * This module manages all user-related state and progress tracking.
 * Changes here affect the user's entire game experience.
 * 
 * Key Features:
 * ------------
 * - Progress tracking
 * - Experience points
 * - Level management
 * - Achievement tracking
 * - Character relationships
 * 
 * Dependencies:
 * -----------
 * - EventHandlers: For event coordination
 * - UIUtils: For progress feedback
 * - LocalStorage: For state persistence
 * - API endpoints: For server sync
 * 
 * Progress Types:
 * -------------
 * - Story Progress
 * - Character Relationships
 * - Mission Completion
 * - Achievements
 * - Currency Collection
 * 
 * Required DOM Elements:
 * -------------------
 * - '.progress-bar': Level and XP display
 * - '.achievement-list': Achievement tracking
 * - '.relationship-status': Character relations
 * - '.user-stats': General statistics
 * 
 * Integration Points:
 * -----------------
 * - Story system for progress
 * - Character system for relationships
 * - Mission system for completion
 * - Currency system for rewards
 * 
 * Usage Guidelines:
 * ---------------
 * 1. ALWAYS sync with server after changes
 * 2. Maintain data consistency
 * 3. Handle progress atomically
 * 4. Cache progress locally
 * 
 * State Management:
 * --------------
 * 1. Load initial state
 * 2. Track changes
 * 3. Validate updates
 * 4. Sync with server
 * 5. Update UI
 * 6. Cache state
 */

/**
 * User Progress Class
 * Manages user level and experience data
 */
class UserProgress {
    constructor() {
        this.userData = null;
        this.progressData = {
            completed_plot_arcs: [],
            choice_history: []
        };
    }

    /**
     * Initialize the user progress tracking
     */
    initialize() {
        console.log("Initializing UserProgress");
        
        // Check for existing user progress data
        const userProgressData = window.userProgressData;
        
        if (userProgressData) {
            this.updateUserProgress(
                userProgressData.level, 
                userProgressData.experience
            );
        }

        return this;
    }

    /**
     * Updates user progress displays
     * @param {number} level - User level
     * @param {number} experience - User experience points
     */
    updateUserProgress(level, experience) {
        if (!level && !experience) return;

        // Update level display
        const levelDisplay = document.querySelector('.user-level');
        if (levelDisplay && level) {
            levelDisplay.textContent = `Level ${level}`;
        }

        // Update XP bar
        const xpProgress = document.querySelector('.xp-progress');
        if (xpProgress && experience) {
            const xpPercent = experience % 100;
            xpProgress.style.width = `${xpPercent}%`;
        }

        // Update progress modal if open
        if (document.getElementById('progressModal')) {
            // Find all strong elements in the progress modal
            const strongElements = document.querySelectorAll('#progressModal .card-body strong');

            // Update level
            if (level) {
                strongElements.forEach(elem => {
                    if (elem.textContent === 'Level:') {
                        const nextNode = elem.nextSibling;
                        if (nextNode) {
                            nextNode.textContent = ` ${level}`;
                        }
                    }
                });
            }

            // Update XP
            if (experience) {
                strongElements.forEach(elem => {
                    if (elem.textContent === 'XP:') {
                        const nextNode = elem.nextSibling;
                        if (nextNode) {
                            nextNode.textContent = ` ${experience}`;
                        }
                    }
                });

                // Update Next Level
                strongElements.forEach(elem => {
                    if (elem.textContent === 'Next Level:') {
                        const nextNode = elem.nextSibling;
                        if (nextNode) {
                            nextNode.textContent = ` ${Math.floor(experience / 100) + 1}`;
                        }
                    }
                });
            }

            // Update progress bar
            const progressBar = document.querySelector('#progressModal .progress-bar');
            if (progressBar && experience) {
                const xpPercent = experience % 100;
                progressBar.style.width = `${xpPercent}%`;
                progressBar.setAttribute('aria-valuenow', xpPercent);
                progressBar.textContent = `${xpPercent}%`;
            }
        }
    }

    /**
     * Get the user's completed plot arcs
     * @returns {Array} - Array of completed plot arc IDs
     */
    getCompletedPlotArcs() {
        return this.progressData.completed_plot_arcs || [];
    }

    /**
     * Check if a plot arc is completed
     * @param {number} plotArcId - The plot arc ID to check
     * @returns {boolean} - True if completed, false otherwise
     */
    isPlotArcCompleted(plotArcId) {
        const completedPlotArcs = this.getCompletedPlotArcs();
        return completedPlotArcs.includes(plotArcId);
    }

    /**
     * Get the user's choice history
     * @returns {Array} - Array of choice data objects
     */
    getChoiceHistory() {
        return this.progressData.choice_history || [];
    }

    /**
     * Check if a specific choice was made
     * @param {number} choiceId - The choice ID to check
     * @returns {boolean} - True if the choice was made, false otherwise
     */
    wasChoiceMade(choiceId) {
        const choices = this.getChoiceHistory();
        return choices.some(choice => choice.choice_id === choiceId);
    }

    /**
     * Update mission progress and status
     * @param {Object} update - Mission update data from server
     */
    updateMissionProgress(update) {
        if (!update || !update.id) return;
        
        // Update mission progress in UI
        const missionElement = document.querySelector(`[data-mission-id="${update.id}"]`);
        if (!missionElement) return;
        
        // Update progress bar
        const progressBar = missionElement.querySelector('.mission-progress');
        if (progressBar) {
            progressBar.style.width = `${update.progress * 100}%`;
        }
        
        // Update status
        if (update.status) {
            const statusElement = missionElement.querySelector('.mission-status');
            if (statusElement) {
                statusElement.textContent = update.status;
            }
            
            // Update rewards
            const rewardElement = missionElement.querySelector('.mission-reward');
            if (rewardElement && update.rewards) {
                rewardElement.textContent = `Reward: ${update.rewards.amount} ${update.rewards.currency}`;
            }
            
            // Add completion animation
            missionElement.classList.add('mission-completed');
            
            // Update user currency if reward is provided
            if (update.rewards) {
                this.updateUserCurrency(update.rewards);
            }
        }
        
        // Handle failure
        if (update.status === 'failed') {
            missionElement.classList.add('mission-failed');
        }
    }

    /**
     * Update user currency balance
     * @param {Object} reward - Reward object with currency and amount
     */
    updateUserCurrency(reward) {
        // If reward is null or missing currency/amount, do nothing
        if (!reward || !reward.currency || reward.amount === undefined) return;
        
        console.log('Updating currency:', reward);
        
        // Find the currency display element
        const currencyDisplay = document.getElementById('currency-display');
        if (!currencyDisplay) return;
        
        // Get current balances from data attribute or create default
        let currentBalances = {};
        try {
            currentBalances = currencyDisplay.dataset.balances ? 
                JSON.parse(currencyDisplay.dataset.balances) : 
                { "💎": 0, "💷": 0, "💶": 0, "💴": 0, "💵": 0 };
        } catch (e) {
            console.error("Error parsing currency balances:", e);
            currentBalances = { "💎": 0, "💷": 0, "💶": 0, "💴": 0, "💵": 0 };
        }
        
        // Update the specific currency
        if (currentBalances[reward.currency] !== undefined) {
            currentBalances[reward.currency] += reward.amount;
        } else {
            currentBalances[reward.currency] = reward.amount;
        }
        
        // Store updated balances
        currencyDisplay.dataset.balances = JSON.stringify(currentBalances);
        
        // Display the updated balances
        this.refreshCurrencyDisplay(currentBalances);
        
        // Add animation effect for feedback
        this.animateCurrencyChange(reward.currency, reward.amount);
    }
    
    /**
     * Update the currency display with current balances
     * @param {Object} balances - Currency balance object
     */
    refreshCurrencyDisplay(balances = null) {
        const currencyDisplay = document.getElementById('currency-display');
        if (!currencyDisplay) return;
        
        // If no balances provided, try to get from data attribute
        if (!balances) {
            try {
                balances = currencyDisplay.dataset.balances ? 
                    JSON.parse(currencyDisplay.dataset.balances) : 
                    { "💎": 0, "💷": 0, "💶": 0, "💴": 0, "💵": 0 };
            } catch (e) {
                console.error("Error parsing currency balances:", e);
                balances = { "💎": 0, "💷": 0, "💶": 0, "💴": 0, "💵": 0 };
            }
        }
        
        // Format the currency display with all currencies
        let displayHtml = '';
        
        // Premium currency first with special styling
        if (balances["💎"] !== undefined) {
            displayHtml += `<span class="currency premium-currency" data-currency="💎">💎 ${balances["💎"]}</span>`;
        }
        
        // Add other currencies
        const otherCurrencies = ["💷", "💶", "💴", "💵"];
        otherCurrencies.forEach(currency => {
            if (balances[currency] !== undefined) {
                displayHtml += `<span class="currency" data-currency="${currency}">${currency} ${balances[currency]}</span>`;
            }
        });
        
        // Update the display
        currencyDisplay.innerHTML = displayHtml;
    }
    
    /**
     * Animate currency change for visual feedback
     * @param {string} currency - The currency symbol
     * @param {number} amount - The amount changed
     */
    animateCurrencyChange(currency, amount) {
        const currencyElement = document.querySelector(`.currency[data-currency="${currency}"]`);
        if (!currencyElement) return;
        
        // Create animation element
        const animationEl = document.createElement('span');
        animationEl.className = `currency-change ${amount > 0 ? 'positive' : 'negative'}`;
        animationEl.textContent = `${amount > 0 ? '+' : ''}${amount}`;
        
        // Add to the document near the currency display
        currencyElement.appendChild(animationEl);
        
        // Remove after animation completes
        setTimeout(() => {
            animationEl.remove();
        }, 2000);
    }
    
    /**
     * Initialize currency display from user progress data
     * @param {Object} currencyBalances - User's currency balances
     */
    initializeCurrencyDisplay(currencyBalances) {
        if (!currencyBalances) return;
        
        const currencyDisplay = document.getElementById('currency-display');
        if (!currencyDisplay) return;
        
        // Store balances in data attribute
        currencyDisplay.dataset.balances = JSON.stringify(currencyBalances);
        
        // Display the currencies
        this.refreshCurrencyDisplay(currencyBalances);
        
        console.log("Currency display initialized:", currencyBalances);
    }

    /**
     * Gain experience points
     * @param {number} amount - Experience points to gain
     */
    gainExperience(amount) {
        // Placeholder for experience gain logic
        console.log('Gaining experience:', amount);
    }
}

/**
 * Extracts story data from the response
 * @param {Object} responseData - The response data from the server
 * @returns {Object} - An object containing narrative and choices
 */
function extractStoryData(responseData) {
    const narrative = responseData.narrative_text || (responseData.stories && responseData.stories.narrative_text) || "";
    const choices = responseData.choices || (responseData.stories && responseData.stories.choices) || [];
    return { narrative, choices };
}

export default UserProgress;