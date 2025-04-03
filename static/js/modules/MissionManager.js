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

export default {
    /**
     * Loads mission details
     * @param {string} missionId - Mission ID to load
     * @returns {Promise} - Promise resolving to mission data
     */
    loadMissionDetails(missionId) {
        // Reset modal content
        document.querySelector('#missionDetailsModal .mission-content').style.display = 'none';
        document.querySelector('#missionDetailsModal .mission-loading').style.display = 'block';
        document.querySelector('#progressUpdatesList').innerHTML = '';

        // Show modal
        const missionModal = new bootstrap.Modal(document.getElementById('missionDetailsModal'));
        missionModal.show();

        // Fetch mission details
        return fetch(`/api/missions/${missionId}`)
            .then(response => response.json())
            .then(response => {
                if (response.success && response.mission) {
                    const mission = response.mission;

                    // Fill in mission details
                    document.getElementById('missionDetailTitle').textContent = mission.title;
                    document.getElementById('missionObjective').textContent = mission.objective;
                    document.getElementById('missionDescription').textContent = mission.description;
                    document.getElementById('missionDifficulty').textContent = mission.difficulty;
                    document.getElementById('missionStatus').textContent = mission.status;
                    document.getElementById('missionDeadline').textContent = mission.deadline;
                    document.getElementById('missionReward').textContent = `${mission.reward_currency} ${mission.reward_amount}`;

                    // Update progress bar
                    const progress = mission.progress || 0;
                    const progressBar = document.getElementById('missionProgressBar');
                    progressBar.style.width = `${progress}%`;
                    progressBar.setAttribute('aria-valuenow', progress);
                    progressBar.textContent = `${progress}%`;

                    // Set character information
                    document.getElementById('missionGiver').textContent = mission.giver?.name || 'Unknown';
                    document.getElementById('missionTarget').textContent = mission.target?.name || 'Unknown';

                    // Set up button actions
                    document.getElementById('completeBtn').dataset.missionId = mission.id;
                    document.getElementById('failBtn').dataset.missionId = mission.id;

                    // Show/hide buttons based on mission status
                    document.getElementById('missionActions').style.display = 
                        mission.status !== 'active' ? 'none' : 'block';

                    // Add progress updates
                    const updatesList = document.getElementById('progressUpdatesList');
                    if (mission.progress_updates && mission.progress_updates.length > 0) {
                        mission.progress_updates.forEach(function(update) {
                            const date = new Date(update.timestamp);
                            const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();

                            let updateHtml = `
                                <div class="list-group-item">
                                    <div class="d-flex w-100 justify-content-between">
                                        <h6 class="mb-1">Progress: ${update.progress}%</h6>
                                        <small>${formattedDate}</small>
                                    </div>
                            `;

                            if (update.description) {
                                updateHtml += `<p class="mb-1">${update.description}</p>`;
                            }

                            if (update.status) {
                                updateHtml += `<span class="badge ${update.status === 'completed' ? 'bg-success' : 'bg-danger'}">${update.status}</span>`;
                            }

                            updateHtml += `</div>`;
                            updatesList.innerHTML += updateHtml;
                        });
                    } else {
                        updatesList.innerHTML = '<p class="text-muted">No progress updates yet.</p>';
                    }

                    // Show content, hide loading
                    document.querySelector('#missionDetailsModal .mission-loading').style.display = 'none';
                    document.querySelector('#missionDetailsModal .mission-content').style.display = 'block';
                    
                    return mission;
                } else {
                    throw new Error(response.error || 'Failed to load mission details');
                }
            })
            .catch(error => {
                console.error('Error loading mission details:', error);
                missionModal.hide();
                UIUtils.showToast('Error', 'Failed to load mission details');
                throw error;
            });
    },

    /**
     * Completes a mission
     * @param {string} missionId - Mission ID to complete
     * @returns {Promise} - Promise resolving to completion result
     */
    completeMission(missionId) {
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
    },

    /**
     * Marks a mission as failed
     * @param {string} missionId - Mission ID to fail
     * @returns {Promise} - Promise resolving to failure result
     */
    failMission(missionId) {
        const reason = prompt('Please provide a reason for failing the mission (optional):');
        
        if (!confirm('Are you sure you want to mark this mission as failed?')) {
            return Promise.reject('User cancelled');
        }

        return fetch(`/api/missions/${missionId}/fail`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ reason: reason })
        })
            .then(response => response.json())
            .then(response => {
                if (response.success) {
                    // Close the modal
                    const missionModal = bootstrap.Modal.getInstance(document.getElementById('missionDetailsModal'));
                    if (missionModal) {
                        missionModal.hide();
                    }
                    
                    UIUtils.showToast('Info', 'Mission marked as failed');

                    // Reload page to refresh mission list
                    setTimeout(function() {
                        location.reload();
                    }, 2000);
                    
                    return response;
                } else {
                    throw new Error(response.error || 'Failed to fail mission');
                }
            })
            .catch(error => {
                console.error('Error failing mission:', error);
                UIUtils.showToast('Error', 'Failed to update mission status');
                throw error;
            });
    },

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
    },
    
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
};

function extractStoryData(responseData) {
    const narrative = responseData.narrative_text || (responseData.stories && responseData.stories.narrative_text) || "";
    const choices = responseData.choices || (responseData.stories && responseData.stories.choices) || [];
    return { narrative, choices };
}
