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
     * @param {FormData|Object} formData - Form data or object for story generation
     * @returns {Promise} - Promise resolving to story generation result
     */
    generateStory(formData) {
        return new Promise((resolve, reject) => {
            // Show loading indicator
            const loadingOverlay = UIUtils.createLoadingOverlay('Generating your adventure...');
            const loadingPercent = loadingOverlay.querySelector('.loading-percent');

            // Simulate progress
            let progress = 0;
            const progressInterval = setInterval(() => {
                if (progress < 90) {
                    progress += 5;
                    UIUtils.updateLoadingPercent(loadingPercent, progress);
                }
            }, 500);

            // Handle FormData and plain objects differently
            let jsonData;
            if (formData instanceof FormData) {
                jsonData = {};
                // Create an object from FormData
                for (const [key, value] of formData.entries()) {
                    // Handle array fields (like selected_images[])
                    if (key.endsWith('[]')) {
                        const actualKey = key.slice(0, -2); // Remove [] suffix
                        if (!jsonData[actualKey]) {
                            jsonData[actualKey] = [];
                        }
                        jsonData[actualKey].push(value);
                    } else {
                        jsonData[key] = value;
                    }
                }
            } else {
                jsonData = formData;
            }

            // Log the data being sent
            console.log('Sending story generation data:', jsonData);

            // Handle redirect responses (story already generated)
            if (jsonData.redirect && jsonData.success) {
                return Promise.resolve(jsonData);
            }

            // Validate required parameters
            const missingParams = [];
            if (!jsonData.conflict) missingParams.push('conflict');
            if (!jsonData.setting) missingParams.push('setting');
            if (!jsonData.narrative_style) missingParams.push('narrative_style');
            if (!jsonData.mood) missingParams.push('mood');

            // Check for selected_images
            if (!jsonData.selected_images || 
                (Array.isArray(jsonData.selected_images) && jsonData.selected_images.length < 1)) {
                missingParams.push('selected_images');
            }

            if (missingParams.length > 0) {
                console.error('Missing required parameters:', missingParams);
                return Promise.reject(new Error(`Missing required story parameters: ${missingParams.join(', ')}`));
            }

            // Make API request
            fetch('/generate_story', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(jsonData)
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(errorData => {
                        throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
                    }).catch(e => {
                        if (e instanceof SyntaxError) {
                            throw new Error(`HTTP error! Status: ${response.status}`);
                        }
                        throw e;
                    });
                }
                return response.json();
            })
            .then(data => {
                clearInterval(progressInterval);
                UIUtils.updateLoadingPercent(loadingPercent, 100);

                // Handle a successful redirect response
                if (data.success && data.redirect) {
                    console.log("Received redirect to:", data.redirect);
                    // Redirect the browser to the new URL
                    window.location.href = data.redirect;
                    return data;
                }

                if (!data || (data.error && !data.success)) {
                    throw new Error(data.error || 'Invalid story data received');
                }

                // Handle successful response
                setTimeout(() => {
                    if (loadingOverlay) {
                        loadingOverlay.remove();
                    }
                    resolve(data);
                }, 500);
            })
            .catch(error => {
                console.error('Story generation failed:', error);
                clearInterval(progressInterval);
                if (loadingOverlay) {
                    loadingOverlay.remove();
                }
                reject(error);
            });
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
                story_id: document.querySelector('input[name="story_id"]')?.value || null,
                node_id: document.querySelector('input[name="node_id"]')?.value || null,
                characters: Array.from(document.querySelectorAll('input[name="characters[]"]')).map(el => el.value)
            })
        })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(data => {
                        if (response.status === 400 && data.error && data.error.includes('Insufficient')) {
                            let errorMessage = isCustomChoice ?
                                `Insufficient diamonds. Writing a custom choice costs 100 💎 but you only have ${data.current_balance} 💎.` :
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

                // Generate next part of the story
                const continueFormData = new FormData(form);
                return this.generateStory(continueFormData); // Use generateStory with FormData
            })
            .then(storyData => {
                clearInterval(progressInterval);

                if (storyData.success && storyData.redirect) {
                    UIUtils.updateLoadingPercent(loadingPercent, 100);
                    setTimeout(() => {
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
                UIUtils.removeLoadingOverlay(loadingPercent);
                throw error;
            });
    }
};