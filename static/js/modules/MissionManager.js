/**
 * MissionManager.js - Mission and Quest Management 
 * ==========================================
 * 
 * !!! IMPORTANT - READ BEFORE MODIFYING !!!
 * This module manages all mission-related functionality including
 * tracking, updates, and completion logic.
 * 
 * Key Features:
 * ------------
 * - Mission state tracking
 * - Objective validation
 * - Reward distribution
 * - Mission UI updates
 * 
 * Dependencies:
 * -----------
 * - EventHandlers: For event coordination
 * - UIUtils: For mission feedback
 * - CurrencyManager: For rewards
 * - StoryManager: For narrative integration
 * 
 * Mission Types:
 * ------------
 * - Main Story Missions
 * - Side Quests
 * - Character-specific Missions
 * - Time-limited Events
 * 
 * Required DOM Elements:
 * -------------------
 * - '.mission-log': Mission tracking display
 * - '.objective-list': Mission objectives
 * - '.mission-reward': Reward displays
 * - '.mission-status': Progress indicators
 * 
 * Integration Points:
 * -----------------
 * - Story progression system
 * - Character relationship system
 * - Achievement tracking
 * - Reward distribution
 * 
 * Usage Guidelines:
 * ---------------
 * 1. ALWAYS validate mission state
 * 2. Maintain mission dependencies
 * 3. Handle mission branching properly
 * 4. Track all mission attempts
 * 
 * Mission Flow:
 * -----------
 * 1. Mission acceptance
 * 2. Objective tracking
 * 3. Progress validation
 * 4. Completion verification
 * 5. Reward distribution
 * 6. State update
 */

/**
 * Mission Management Module
 * Handles mission details, completion and failure
 */
import UIUtils from './UIUtils.js';
import CurrencyManager from './CurrencyManager.js';

class MissionManager {
    constructor() {
        this.activeMissions = [];
        this.missionUpdateHandlers = [];
    }

    // Add an initialize method
    async initialize() {
        console.log('MissionManager: Initializing...');
        try {
            // Attempt to load active missions
            await this.loadActiveMissions();
            console.log('MissionManager: Initialization complete');
            return this;
        } catch (error) {
            console.error('MissionManager: Initialization failed', error);
            
            // Set default/fallback missions
            this.activeMissions = [
                {
                    id: 'fallback_1',
                    title: 'System Recovery Mission',
                    description: 'Investigate application initialization issues',
                    status: 'active',
                    progress: 0,
                    rewards: {
                        currency: 'system_points',
                        amount: 100
                    }
                }
            ];
            
            this.updateMissionDisplays();
            throw error;  // Re-throw to allow caller to handle
        }
    }

    // Initialize UI event bindings
    bindUIEvents() {
        // Mission progress updates
        document.addEventListener('mission:progress-update', async (e) => {
            const { missionId, progress } = e.detail;
            await this.updateMissionProgress(missionId, progress);
        });

        // Mission completion
        document.addEventListener('mission:complete', async (e) => {
            const { missionId } = e.detail;
            await this.updateMissionProgress(missionId, 100);
        });

        // Mission failure
        document.addEventListener('mission:fail', async (e) => {
            const { missionId, reason } = e.detail;
            await this.failMission(missionId, reason);
        });
    }

    // Add UI update handler
    addUpdateHandler(handler) {
        this.missionUpdateHandlers.push(handler);
    }

    // Remove UI update handler
    removeUpdateHandler(handler) {
        this.missionUpdateHandlers = this.missionUpdateHandlers.filter(h => h !== handler);
    }

    // Fetch active missions from backend
    async loadActiveMissions() {
        try {
            console.log('Attempting to load active missions...');
            
            // Use the configured API base URL
            const apiBaseUrl = window.appConfig?.apiBaseUrl || '/api';
            const response = await fetch(`${apiBaseUrl}/missions/active`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    // Add any necessary authentication headers
                    // 'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });

            console.log('Mission fetch response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Mission fetch error:', errorText);
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }

            const data = await response.json();
            console.log('Missions data received:', data);

            // Validate response structure
            if (data.status !== 'success' || !Array.isArray(data.missions)) {
                throw new Error('Invalid missions data structure');
            }

            // Process and enrich mission data
            this.activeMissions = data.missions.map(mission => ({
                ...mission,
                // Add any additional processing or default values
                progress: mission.progress || 0,
                difficulty: mission.difficulty || 'medium',
                rewards: mission.rewards || { currency: 'default', amount: 0 },
                giver: mission.giver || 'Unknown',
                target: mission.target || 'Unknown',
                deadline: mission.deadline || 'No deadline',
                createdAt: mission.created_at ? new Date(mission.created_at) : new Date()
            }));
            
            // Log missions for debugging
            console.log('Active Missions:', this.activeMissions);

            this.updateMissionDisplays();
            return this.activeMissions;
        } catch (error) {
            console.error('Comprehensive Mission Load Error:', error);
            
            // Provide a fallback or default missions
            this.activeMissions = [
                {
                    id: 'fallback_1',
                    title: 'Default Mission: System Recovery',
                    description: 'Investigate system connectivity issues',
                    status: 'active',
                    progress: 0,
                    difficulty: 'easy',
                    rewards: {
                        currency: 'system_points',
                        amount: 100
                    },
                    giver: 'System',
                    target: 'User',
                    deadline: 'Immediate',
                    createdAt: new Date()
                }
            ];

            this.showErrorNotification(`Failed to load missions: ${error.message}`);
            this.updateMissionDisplays();
            return this.activeMissions;
        }
    }

    // Update mission progress
    async updateMissionProgress(missionId, progress, description = '') {
        try {
            const response = await fetch(`/api/missions/${missionId}/update`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({progress, description})
            });
            
            if (!response.ok) throw new Error('Update failed');
            
            const updatedMission = await response.json();
            this.updateMissionInList(updatedMission);
            
            // Emit mission updated event
            document.dispatchEvent(new CustomEvent('mission:updated', {
                detail: { missionId }
            }));
            
            this.updateMissionDisplays();
            
            // Notify completion if progress is 100%
            if (progress >= 100) {
                this.handleMissionCompletion(updatedMission);
            }
            
            return updatedMission;
        } catch (error) {
            console.error('Mission update error:', error);
            this.showErrorNotification('Mission update failed');
            throw error;
        }
    }

    /**
     * Loads mission details
     * @param {string} missionId - Mission ID to load
     * @returns {Promise} - Promise resolving to mission data
     */
    async loadMissionDetails(missionId) {
        try {
            const response = await fetch(`/api/missions/${missionId}`);
            if (!response.ok) throw new Error('Failed to load mission');
            return await response.json();
        } catch (error) {
            console.error('Mission load error:', error);
            this.showErrorNotification('Failed to load mission details');
            return null;
        }
    }

    /**
     * Tracks mission progress
     * @param {string} missionId - Mission ID to track
     * @param {function} callback - Callback function to receive mission updates
     * @returns {function} - Function to stop tracking mission progress
     */
    trackMissionProgress(missionId, callback) {
        const handler = (missions) => {
            const mission = missions.find(m => m.id === missionId);
            if (mission) callback(mission);
        };
        this.addUpdateHandler(handler);
        return () => this.removeUpdateHandler(handler);
    }

    /**
     * Marks a mission as failed
     * @param {string} missionId - Mission ID to fail
     * @param {string} reason - Reason for failing the mission
     * @returns {Promise} - Promise resolving to failed mission data
     */
    async failMission(missionId, reason = '') {
        try {
            const response = await fetch(`/api/missions/${missionId}/fail`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({reason})
            });
            
            if (!response.ok) throw new Error('Mission failure update failed');
            
            const failedMission = await response.json();
            this.activeMissions = this.activeMissions.filter(m => m.id !== missionId);
            this.updateMissionDisplays();
            
            return failedMission;
        } catch (error) {
            console.error('Mission failure error:', error);
            this.showErrorNotification('Failed to update mission status');
            throw error;
        }
    }

    /**
     * Completes a mission
     * @param {string} missionId - Mission ID to complete
     * @returns {Promise} - Promise resolving to completion result
     */
    async completeMission(missionId) {
        if (!confirm('Are you sure you want to mark this mission as completed?')) {
            return Promise.reject('User cancelled');
        }

        try {
            const response = await fetch(`/api/missions/${missionId}/complete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({})
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Mission completion failed: ${errorText}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.message || 'Mission could not be completed');
            }

            // Close the modal if it exists
            const missionModal = bootstrap.Modal.getInstance(document.getElementById('missionDetailsModal'));
            if (missionModal) {
                missionModal.hide();
            }

            // Update mission list and UI
            this.updateMissionDisplays();

            // Update currency if rewards are provided
            if (result.new_balances) {
                CurrencyManager.updateCurrencyDisplays(result.new_balances);
            }

            // Update user progress if experience points are provided
            if (result.experience_points && result.level) {
                UserProgress.updateUserProgress(result.level, result.experience_points);
            }

            // Trigger mission completion event
            document.dispatchEvent(new CustomEvent('mission:completed', {
                detail: { 
                    missionId: missionId,
                    rewards: result.rewards || {},
                    experiencePoints: result.experience_points || 0,
                    newLevel: result.level || null
                }
            }));

            // Show success notification
            this.showNotification(`Mission ${missionId} completed successfully!`, 'success');

            return result;
        } catch (error) {
            console.error('Mission completion error:', error);
            this.showErrorNotification(`Failed to complete mission: ${error.message}`);
            throw error;
        }
    }

    /**
     * Update mission progress and status
     * @param {Object} update - Mission update data from server
     */
    updateMissionProgress(update) {
        if (!update || !update.id) return;
        
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
        }
        
        // Handle completion
        if (update.status === 'completed') {
            // Show reward
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
     * Update user's currency display
     * @param {Object} reward - Reward data from server
     */
    updateUserCurrency(reward) {
        if (!reward || !reward.amount || !reward.currency) return;
        
        const currencyElement = document.querySelector('.user-currency');
        if (!currencyElement) return;
        
        const currentAmount = parseInt(currencyElement.textContent) || 0;
        const newAmount = currentAmount + reward.amount;
        currencyElement.textContent = newAmount;
        
        // Show currency gain animation
        const gainElement = document.createElement('div');
        gainElement.className = 'currency-gain';
        gainElement.textContent = `+${reward.amount} ${reward.currency}`;
        currencyElement.appendChild(gainElement);
        
        // Remove animation after it completes
        setTimeout(() => gainElement.remove(), 2000);
    }

    // Helper methods
    updateMissionInList(updatedMission) {
        const index = this.activeMissions.findIndex(m => m.id === updatedMission.id);
        if (index !== -1) {
            this.activeMissions[index] = updatedMission;
        }
    }

    updateMissionDisplays() {
        // Dispatch event for other components to update
        document.dispatchEvent(new CustomEvent('missions:updated', {
            detail: { missions: this.activeMissions }
        }));
    }

    handleMissionCompletion(mission) {
        document.dispatchEvent(new CustomEvent('mission:completed', {
            detail: { 
                mission: mission,
                reward: mission.reward || null 
            }
        }));
    }

    // Notification helpers
    showSuccessNotification(message) {
        this.showNotification(message, 'success');
    }

    showErrorNotification(message) {
        console.error(message);
        // You might want to replace this with a proper UI notification method
        UIUtils.showToast('Error', message);
    }

    showNotification(message, type) {
        // Implement notification logic here
    }
}

// Export as default
export default MissionManager;
