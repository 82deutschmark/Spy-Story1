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
        this.bindUIEvents();
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
            const response = await fetch('/api/missions/active');
            if (!response.ok) throw new Error('Failed to load missions');
            
            this.activeMissions = await response.json();
            this.updateMissionDisplays();
            return this.activeMissions;
        } catch (error) {
            console.error('Mission load error:', error);
            this.showErrorNotification('Failed to load missions');
            return [];
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

        return fetch(`/api/missions/${missionId}/complete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        })
            .then(response => response.json())
            .then(response => {
                if (response.success) {
                    // Close the modal
                    const missionModal = bootstrap.Modal.getInstance(document.getElementById('missionDetailsModal'));
                    if (missionModal) {
                        missionModal.hide();
                    }
                    
                    UIUtils.showToast('Success', 'Mission completed successfully!');

                    // Update currency display if provided
                    if (response.new_balances) {
                        CurrencyManager.updateCurrencyDisplays(response.new_balances);
                    }
                    
                    // Update user progress data if provided
                    if (response.experience_points && response.level) {
                        UserProgress.updateUserProgress(response.level, response.experience_points);
                    }
                    
                    // Reload page to refresh mission list
                    setTimeout(function() {
                        location.reload();
                    }, 2000);
                    
                    return response;
                } else {
                    throw new Error(response.error || 'Failed to complete mission');
                }
            })
            .catch(error => {
                console.error('Error completing mission:', error);
                UIUtils.showToast('Error', 'Failed to complete mission');
                throw error;
            });
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
        this.activeMissions = this.activeMissions.map(mission => 
            mission.id === updatedMission.id ? updatedMission : mission
        );
    }

    updateMissionDisplays() {
        this.missionUpdateHandlers.forEach(handler => handler(this.activeMissions));
    }

    handleMissionCompletion(mission) {
        // Show completion notification
        this.showSuccessNotification(`Mission completed: ${mission.title}`);
        
        // Remove from active missions
        this.activeMissions = this.activeMissions.filter(m => m.id !== mission.id);
        
        // Update UI
        this.updateMissionDisplays();
    }

    // Notification helpers
    showSuccessNotification(message) {
        this.showNotification(message, 'success');
    }

    showErrorNotification(message) {
        this.showNotification(message, 'danger');
    }

    showNotification(message, type) {
        // Implement notification logic here
    }
};

function extractStoryData(responseData) {
    const narrative = responseData.narrative_text || (responseData.stories && responseData.stories.narrative_text) || "";
    const choices = responseData.choices || (responseData.stories && responseData.stories.choices) || [];
    return { narrative, choices };
}

export default new MissionManager();
