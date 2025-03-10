/**
 * Story Generation Module
 * Handles story generation and choice processing
 */
import UIUtils from './UIUtils.js';
import CurrencyManager from './CurrencyManager.js';
import UserProgress from './UserProgress.js';

export default {
    /**
     * Generates a new story based on form data
     * @param {FormData} formData - Form data for story generation
     * @returns {Promise} - Promise resolving to story generation result
     */
    generateStory(formData) {
        // Create loading overlay with percentage
        const loadingPercent = UIUtils.createLoadingOverlay('Generating your adventure...');

        const generateStoryBtn = document.getElementById('generateStoryBtn');
        if (generateStoryBtn) {
            generateStoryBtn.disabled = true;
            generateStoryBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Generating Story...';
        }

        let progress = 0;
        const progressInterval = setInterval(() => {
            if (progress < 90) {
                progress += 5;
                UIUtils.updateLoadingPercent(loadingPercent, progress);
            }
        }, 500);
        
        // Add loading UI element to show percentage
        const loadingUI = document.createElement('div');
        loadingUI.className = 'loading-percentage-display';
        loadingUI.innerHTML = '<div class="loading-text">Crafting your adventure...</div><div class="progress"><div class="progress-bar progress-bar-striped progress-bar-animated" style="width:0%"></div></div>';
        document.body.appendChild(loadingUI);
        
        // Update loading bar
        const progressBar = loadingUI.querySelector('.progress-bar');
        const progressUpdate = setInterval(() => {
            if (progress < 90) {
                progressBar.style.width = progress + '%';
                progressBar.setAttribute('aria-valuenow', progress);
            }
        }, 500);

        return fetch('/generate_story', {
            method: 'POST',
            body: formData,
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
            .then(response => response.json())
            .then(data => {
                clearInterval(progressInterval);

                if (data.success && data.redirect) {
                    UIUtils.updateLoadingPercent(loadingPercent, 100);
                    if (progressBar) {
                        progressBar.style.width = '100%';
                        progressBar.setAttribute('aria-valuenow', 100);
                    }
                    setTimeout(() => {
                        if (loadingUI && loadingUI.parentNode) {
                            loadingUI.parentNode.removeChild(loadingUI);
                        }
                        window.location.href = data.redirect;
                    }, 500);
                    return data;
                } else {
                    throw new Error(data.error || 'Failed to generate story');
                }
            })
            .catch(error => {
                console.error('Error generating story:', error);
                UIUtils.showToast('Error', error.message || 'Failed to generate story. Please try again.');
                clearInterval(progressInterval);
                clearInterval(progressUpdate);

                if (generateStoryBtn) {
                    generateStoryBtn.disabled = false;
                    generateStoryBtn.innerHTML = '<i class="fas fa-pen-fancy me-2"></i>Begin Your Adventure';
                }

                UIUtils.removeLoadingOverlay(loadingPercent);
                if (loadingUI && loadingUI.parentNode) {
                    loadingUI.parentNode.removeChild(loadingUI);
                }
                throw error;
            });
    },

    /**
     * Processes a story choice
     * @param {HTMLFormElement} form - The choice form
     * @returns {Promise} - Promise resolving to choice processing result
     */
    processChoice(form) {
        const btn = form.querySelector('button');

        // Prevent double-submission by checking if button is disabled
        if (btn.disabled) return Promise.reject('Button is disabled');

        // Get currency requirements from data attribute
        const currencyReq = btn.dataset.currencyReq ? JSON.parse(btn.dataset.currencyReq) : null;
        const isCustomChoice = form.querySelector('.custom-choice-input') !== null;

        btn.disabled = true;
        btn.classList.add('loading');

        const loadingPercent = UIUtils.createLoadingOverlay('Processing your choice...');
        let progress = 0;
        const progressInterval = setInterval(() => {
            if (progress < 90) {
                progress += 5;
                UIUtils.updateLoadingPercent(loadingPercent, progress);
            }
        }, 500);
        
        // Add loading UI element to show percentage
        const loadingUI = document.createElement('div');
        loadingUI.className = 'choice-loading-display';
        loadingUI.innerHTML = '<div class="loading-text">Crafting the next part of your adventure...</div><div class="progress"><div class="progress-bar progress-bar-striped progress-bar-animated" style="width:0%"></div></div>';
        document.body.appendChild(loadingUI);
        
        // Update loading bar
        const progressBar = loadingUI.querySelector('.progress-bar');
        const progressBarUpdate = setInterval(() => {
            if (progress < 90) {
                progressBar.style.width = progress + '%';
                progressBar.setAttribute('aria-valuenow', progress);
            }
        }, 500);

        // Prepare form data
        const formData = new FormData(form);
        const isCustom = form.querySelector('.custom-choice-input') !== null;

        return fetch('/make_choice', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({
                choice_id: formData.get('choice_id'),
                custom_choice: isCustom ? formData.get('custom_choice') : null,
                currency_requirements: currencyReq,
                story_id: document.querySelector('input[name="story_id"]')?.value || null
            })
        })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(data => {
                        if (response.status === 400 && data.error && data.error.includes('Insufficient')) {
                            let errorMessage = isCustomChoice ?
                                `Insufficient diamonds. You need 100 💎 but only have ${data.current_balance} 💎.` :
                                'Insufficient funds for this choice.';

                            throw new Error(errorMessage);
                        }
                        throw new Error(data.error || 'Failed to process choice');
                    });
                }
                return response.json();
            })
            .then(data => {
                if (!data.success) {
                    throw new Error(data.error || 'Failed to process choice');
                }

                // Update currency displays with new balances
                if (data.new_balances) {
                    CurrencyManager.updateCurrencyDisplays(data.new_balances);
                }

                // Update user level and XP if provided
                if (data.level && data.experience) {
                    UserProgress.updateUserProgress(data.level, data.experience);
                }

                // Record character encounters if any
                if (data.characters) {
                    data.characters.forEach(character => {
                        if (character.id && character.name) {
                            // Record character encounter
                            import('./CharacterManager.js').then(module => {
                                const CharacterManager = module.default;
                                CharacterManager.recordCharacterEncounter(
                                    character.id,
                                    character.name,
                                    character.initial_relationship || 0
                                ).catch(err => console.error('Error recording character encounter:', err));
                            });
                        }
                    });
                }


                // Generate next part of the story
                return fetch('/generate_story', {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });
            })
            .then(response => response.json())
            .then(storyData => {
                clearInterval(progressInterval);

                if (storyData.success && storyData.redirect) {
                    UIUtils.updateLoadingPercent(loadingPercent, 100);
                    if (progressBar) {
                        progressBar.style.width = '100%';
                        progressBar.setAttribute('aria-valuenow', 100);
                    }
                    setTimeout(() => {
                        if (loadingUI && loadingUI.parentNode) {
                            loadingUI.parentNode.removeChild(loadingUI);
                        }
                        window.location.href = storyData.redirect;
                    }, 500);
                    return storyData;
                } else {
                    throw new Error(storyData.error || 'Failed to generate next story part');
                }
            })
            .catch(error => {
                console.error('Error processing choice:', error);
                UIUtils.showToast('Error', error.message || 'Failed to process your choice');
                btn.disabled = false;
                btn.classList.remove('loading');
                clearInterval(progressInterval);
                clearInterval(progressBarUpdate);
                UIUtils.removeLoadingOverlay(loadingPercent);
                if (loadingUI && loadingUI.parentNode) {
                    loadingUI.parentNode.removeChild(loadingUI);
                }
                throw error;
            });
    }
};