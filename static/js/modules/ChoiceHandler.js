/**
 * ChoiceHandler.js - Choice Management Module
 * =========================================
 * 
 * This module handles the flow of story choices and
 * communication between the frontend and backend.
 */

import LoadingManager from './LoadingManager.js';
import ErrorHandler from './ErrorHandler.js';
import CharacterMentions from './CharacterMentions.js';
import UserProgress from './UserProgress.js';

class ChoiceHandler {
    constructor() {
        this.loadingManager = new LoadingManager();
        this.errorHandler = new ErrorHandler();
        this.characterMentions = null;
    }

    /**
     * Initialize the choice handler
     */
    initialize() {
        this.loadingManager.initialize();
        this.errorHandler.initialize();
        
        // Initialize character mentions if we're on a story page
        if (document.querySelector('.story-content')) {
            this.characterMentions = new CharacterMentions();
            this.characterMentions.initialize();
        }
        
        // Use event delegation for form submissions
        document.addEventListener('submit', (event) => {
            if (event.target.matches('.choice-form')) {
                this.handleChoiceSubmit(event);
            }
        });
    }

    /**
     * Handle choice form submission
     * @param {Event} event - The submit event
     */
    async handleChoiceSubmit(event) {
        event.preventDefault();
        const form = event.target;
        const submitButton = form.querySelector('button[type="submit"]');
        let loadingState = null;
        try {
            // Disable all choice buttons
            document.querySelectorAll('.choice-btn').forEach(btn => {
                btn.disabled = true;
            });

            // Start loading state
            loadingState = this.loadingManager.startButtonLoading(
                submitButton,
                submitButton.dataset.loadingText || 'Processing your choice...'
            );

            // Create a form data object and merge in story parameters from data attributes
            let formDataObj = Object.fromEntries(new FormData(form));
            // Append story parameters if available as data attributes on the form
            if (form.dataset.conflict) {
                formDataObj.conflict = form.dataset.conflict;
                formDataObj.setting = form.dataset.setting;
                formDataObj.narrative_style = form.dataset.narrativeStyle;
                formDataObj.mood = form.dataset.mood;
            }

            // Submit the form data with the additional story parameters
            const response = await fetch(form.action, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(formDataObj)
            });

            const result = await response.json();

            console.log("Full response received:", result);

            if (!response.ok || result.error) {
                throw new Error(result.error || `HTTP error! status: ${response.status}`);
            }

            // Handle different response formats
            if (result.redirect_url) {
                // Direct redirect provided
                console.log("Redirecting via redirect_url:", result.redirect_url);
                window.location.href = result.redirect_url;
            } else if (result.success && result.story_id) {
                // Original response format with success flag and story_id
                console.log("Redirecting via story_id:", `/storyboard/${result.story_id}`);
                window.location.href = `/storyboard/${result.story_id}`;
            } else if (result.current_node && result.current_node.id) {
                console.log("Processing current_node response:", result.current_node);
                // GameEngine.make_choice format with current_node details
                // Update the page content with the new node data
                if (result.current_node.narrative_text) {
                    this.updateStoryContent(result.current_node.narrative_text);
                }
                
                // Update choices if available
                const choicesContainer = document.querySelector('.choices-container');
                if (choicesContainer && result.available_choices) {
                    choicesContainer.innerHTML = "";
                    result.available_choices.forEach(choice => {
                        const choiceForm = document.createElement('form');
                        choiceForm.className = 'choice-form';
                        choiceForm.method = 'POST';
                        choiceForm.action = form.action;
                        
                        // Hidden inputs to carry state
                        const storyIdInput = document.createElement('input');
                        storyIdInput.type = 'hidden';
                        storyIdInput.name = 'story_id';
                        storyIdInput.value = formDataObj.story_id;
                        choiceForm.appendChild(storyIdInput);
                        
                        const choiceIdInput = document.createElement('input');
                        choiceIdInput.type = 'hidden';
                        choiceIdInput.name = 'choice_id';
                        choiceIdInput.value = choice.choice_id || choice.id;
                        choiceForm.appendChild(choiceIdInput);
                        
                        // Create submit button
                        const btn = document.createElement('button');
                        btn.type = 'submit';
                        btn.className = "choice-btn";
                        btn.innerHTML = choice.text || "Option";
                        choiceForm.appendChild(btn);
                        
                        choicesContainer.appendChild(choiceForm);
                    });
                }
                
                // Handle mission updates if available
                if (result.mission_updates && result.mission_updates.length > 0) {
                    result.mission_updates.forEach(update => {
                        if (update && update.id) {
                            // Use UserProgress module to handle mission updates
                            UserProgress.updateMissionProgress(update);
                            
                            // Update mission list if needed
                            const missionList = document.querySelector('.mission-list');
                            if (missionList) {
                                // Refresh mission list
                                fetch('/api/missions')
                                    .then(response => response.json())
                                    .then(data => {
                                        if (data.success) {
                                            // Update mission list UI
                                            missionList.innerHTML = data.missions.map(mission => `
                                                <div class="mission-item" data-mission-id="${mission.id}">
                                                    <div class="mission-title">${mission.title}</div>
                                                    <div class="mission-progress" style="width: ${mission.progress}%"></div>
                                                    <div class="mission-status">${mission.status}</div>
                                                    ${mission.reward_currency ? `<div class="mission-reward">Reward: ${mission.reward_amount} ${mission.reward_currency}</div>` : ''}
                                                </div>
                                            `).join('');
                                        }
                                    })
                                    .catch(error => console.error('Error updating mission list:', error));
                            }
                        }
                    });
                }
                
                // Stop loading state and re-enable buttons
                if (submitButton && loadingState) {
                    this.loadingManager.stopButtonLoading(submitButton);
                }
                
                // Re-enable all choice buttons
                document.querySelectorAll('.choice-btn').forEach(btn => {
                    btn.disabled = false;
                });
                
                // Reinitialize character mentions for the new content
                if (this.characterMentions) {
                    this.characterMentions.initialize();
                }
            } else if (result.redirect) {
                // NEW: Add specific handling for 'redirect' key
                console.log("Redirecting via 'redirect' key:", result.redirect);
                window.location.href = result.redirect;
            } else {
                console.error("Invalid response format:", result);
                throw new Error('Invalid response format from server');
            }

        } catch (error) {
            this.errorHandler.logError(error, 'choice submission');
            this.errorHandler.showError(error.message || 'Failed to process your choice. Please try again.');
            
            if (submitButton && loadingState) {
                this.loadingManager.stopButtonLoading(submitButton);
            }

            // Re-enable choice buttons
            document.querySelectorAll('.choice-btn').forEach(btn => {
                btn.disabled = false;
            });
        }
    }

    /**
     * Update story content with parsed narrative text
     * @param {string} narrativeText - The narrative text to update
     */
    updateStoryContent(narrativeText) {
        const storyContent = document.querySelector('.story-content');
        if (storyContent) {
            storyContent.innerHTML = narrativeText;
            if (this.characterMentions) {
                this.characterMentions.initialize();
            }
        }
    }
}

function extractStoryData(responseData) {
    const narrative = responseData.narrative_text || (responseData.stories && responseData.stories.narrative_text) || "";
    const choices = responseData.choices || (responseData.stories && responseData.stories.choices) || [];
    return { narrative, choices };
}

function handleChoiceResponse(responseData) {
    const { narrative, choices } = extractStoryData(responseData);
    const storyContent = document.querySelector('.story-content');
    if (storyContent) {
        storyContent.innerHTML = narrative;
    }
    const choicesContainer = document.querySelector('.choices-container');
    if (choicesContainer) {
        choicesContainer.innerHTML = "";
        choices.forEach(choice => {
            const btn = document.createElement('button');
            btn.className = "choice-btn";
            btn.innerText = choice.text || "Option";
            btn.dataset.choiceId = choice.choice_id || choice.id;
            choicesContainer.appendChild(btn);
        });
    }
}

export default ChoiceHandler;