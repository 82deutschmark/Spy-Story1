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
        console.log('Generating story, showing loading indicators...');

        // Create loading overlay with percentage
        const loadingPercent = UIUtils.createLoadingOverlay('Generating your adventure...');

        // Disable the submit button
        const generateStoryBtn = document.getElementById('generateStoryBtn');
        if (generateStoryBtn) {
            generateStoryBtn.disabled = true;
            generateStoryBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Generating Story...';
        }

        // Show loading state on body
        document.body.classList.add('loading-in-progress');

        // Initialize progress tracking
        let progress = 0;
        const progressInterval = setInterval(() => {
            if (progress < 90) {
                progress += 5;
                UIUtils.updateLoadingPercent(loadingPercent, progress);
            }
        }, 500);

        // Create a detailed loading UI component
        const loadingUI = this.createLoadingUI();
        document.body.appendChild(loadingUI);

        // Update loading bar and phases
        const progressBar = loadingUI.querySelector('.progress-bar');
        const progressText = loadingUI.querySelector('.progress-text');
        const phases = loadingUI.querySelectorAll('.phase');

        const progressUpdate = setInterval(() => {
            if (progress < 90) {
                // Update progress bar
                progressBar.style.width = progress + '%';
                progressBar.setAttribute('aria-valuenow', progress);
                progressText.textContent = progress + '%';

                // Update phases based on progress
                this.updateProgressPhases(phases, progress);
            }
        }, 500);

        // Make the API request
        return fetch('/generate_story', {
            method: 'POST',
            body: formData,
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(data => {
                        throw new Error(data.error || `Server error: ${response.status}`);
                    });
                }
                return response.json();
            })
            .then(data => {
                // Clear the automatic progress update
                clearInterval(progressInterval);
                clearInterval(progressUpdate);

                if (data.success) {
                    // Update progress to 100%
                    progress = 100;

                    // Update loading percentage display
                    const loadingPercentElement = document.querySelector('.loading-percentage');
                    if (loadingPercentElement) {
                        loadingPercentElement.textContent = '100%';
                    }

                    if (progressBar) {
                        progressBar.style.width = progress + '%';
                        progressBar.setAttribute('aria-valuenow', progress);
                    }
                    if (progressText) {
                        progressText.textContent = progress + '%';
                    }

                    // Update phase indicators
                    if (phases && phases.length) {
                        for (let i = 0; i < phases.length; i++) {
                            phases[i].style.color = '#4CAF50';
                            phases[i].innerHTML = '<i class="fas fa-check-circle me-2"></i>' + phases[i].textContent;
                        }
                    }

                    // Wait a moment so user can see completion before redirect
                    setTimeout(() => {
                        // Clean up loading UI elements
                        if (loadingUI) loadingUI.remove();

                        // Remove loading overlay
                        const loadingOverlay = document.querySelector('.loading-overlay');
                        if (loadingOverlay) {
                            loadingOverlay.remove();
                        }

                        document.body.classList.remove('loading-in-progress');

                        // Redirect to the new story
                        window.location.href = data.redirect;
                    }, 1000);
                    return data;
                } else {
                    throw new Error(data.error || 'Failed to generate story');
                }
            })
            .catch(error => {
                console.error('Error generating story:', error);

                // Clean up all intervals
                clearInterval(progressInterval);
                clearInterval(progressUpdate);

                // Reset UI elements
                if (generateStoryBtn) {
                    generateStoryBtn.disabled = false;
                    generateStoryBtn.innerHTML = '<i class="fas fa-pen-fancy me-2"></i>Begin Your Adventure';
                }

                // Remove loading indicators
                UIUtils.removeLoadingOverlay(loadingPercent);
                document.body.classList.remove('loading-in-progress');

                // Remove the detailed loading UI
                if (loadingUI && loadingUI.parentNode) {
                    loadingUI.parentNode.removeChild(loadingUI);
                }

                // Show error message
                UIUtils.showToast('Error', error.message || 'Failed to generate story. Please try again.');

                throw error;
            });
    },

    /**
     * Creates the detailed loading UI component
     * @returns {HTMLElement} The loading UI element
     */
    createLoadingUI() {
        const loadingUI = document.createElement('div');
        loadingUI.className = 'loading-percentage-display';
        loadingUI.style.position = 'fixed';
        loadingUI.style.top = '50%';
        loadingUI.style.left = '50%';
        loadingUI.style.transform = 'translate(-50%, -50%)';
        loadingUI.style.width = '80%';
        loadingUI.style.maxWidth = '500px';
        loadingUI.style.backgroundColor = 'rgba(33, 37, 41, 0.95)';
        loadingUI.style.borderRadius = '10px';
        loadingUI.style.padding = '20px';
        loadingUI.style.boxShadow = '0 0 20px rgba(0, 0, 0, 0.5)';
        loadingUI.style.zIndex = '9999';
        loadingUI.style.textAlign = 'center';

        loadingUI.innerHTML = `
            <div class="loading-text mb-3" style="color: white; font-size: 18px; font-weight: bold;">
                Crafting your adventure...
            </div>
            <div class="loading-phases mb-3" style="color: #adb5bd; font-size: 14px; text-align: left;">
                <div class="phase" style="margin-bottom: 10px;">✓ Analyzing selected characters</div>
                <div class="phase" style="margin-bottom: 10px;">⋯ Generating story framework</div>
                <div class="phase" style="margin-bottom: 10px;">⋯ Building character relationships</div>
                <div class="phase" style="margin-bottom: 10px;">⋯ Creating dramatic plot points</div>
                <div class="phase" style="margin-bottom: 10px;">⋯ Finalizing your adventure</div>
            </div>
            <div class="progress">
                <div class="progress-bar progress-bar-striped progress-bar-animated" style="width:0%"></div>
            </div>
            <div class="progress-text mt-2" style="color: white; font-size: 16px;">0%</div>
        `;

        return loadingUI;
    },

    /**
     * Updates the progress phases based on current progress percentage
     * @param {NodeList} phases - The phase elements to update
     * @param {number} progress - Current progress percentage
     */
    updateProgressPhases(phases, progress) {
        if (progress > 10 && progress <= 30) {
            phases[0].innerHTML = '✓ Analyzing selected characters';
            phases[1].innerHTML = '✓ Generating story framework';
            phases[2].innerHTML = '⋯ Building character relationships';
        } else if (progress > 30 && progress <= 50) {
            phases[2].innerHTML = '✓ Building character relationships';
            phases[3].innerHTML = '⋯ Creating dramatic plot points';
        } else if (progress > 50 && progress <= 80) {
            phases[3].innerHTML = '✓ Creating dramatic plot points';
            phases[4].innerHTML = '⋯ Finalizing your adventure';
        }
    },

    /**
     * Updates the loading UI to show completion
     * @param {HTMLElement} loadingUI - The loading UI element
     */
    updateLoadingUICompletion(loadingUI) {
        if (!loadingUI) return;

        const progressBar = loadingUI.querySelector('.progress-bar');
        const progressText = loadingUI.querySelector('.progress-text');
        const phases = loadingUI.querySelectorAll('.phase');

        if (progressBar) progressBar.style.width = '100%';
        if (progressText) progressText.textContent = '100%';
        if (phases && phases.length >= 5) phases[4].innerHTML = '✓ Finalizing your adventure';
    },

    /**
     * Highlight character names in story text
     * @param {HTMLElement} storyElement - The story content container element
     * @param {Array} characters - Array of character objects with name and image_url
     */
    highlightCharacters(storyElement, characters) {
        if (!storyElement || !characters || characters.length === 0) return;

        // Create a regular expression to match all character names
        const characterNames = characters
            .map(char => char.name)
            .filter(name => name && name.length > 2) // Ignore very short names to avoid false positives
            .sort((a, b) => b.length - a.length); // Sort by length (longest first) to avoid partial matches

        if (characterNames.length === 0) return;

        const namePattern = new RegExp(`\\b(${characterNames.join('|')})\\b`, 'gi');

        // We need to work with the HTML content
        let html = storyElement.innerHTML;

        // Replace character names with highlighted spans
        html = html.replace(namePattern, (match) => {
            // Find the character that matches this name (case-insensitive)
            const character = characters.find(char =>
                char.name && char.name.toLowerCase() === match.toLowerCase());

            if (!character) return match; // Safety check

            return `<span class="character-highlight" data-character="${character.name.toLowerCase().replace(/\s+/g, '-')}">${match}</span>`;
        });

        // Set the updated HTML
        storyElement.innerHTML = html;

        // Add click event listeners to the highlighted spans
        const highlightedSpans = storyElement.querySelectorAll('.character-highlight');
        highlightedSpans.forEach(span => {
            span.addEventListener('click', (e) => {
                const characterSlug = span.getAttribute('data-character');

                // Find the character in the characters array
                const character = characters.find(char =>
                    char.name && char.name.toLowerCase().replace(/\s+/g, '-') === characterSlug);

                if (!character) return;

                // Remove any existing tooltips
                document.querySelectorAll('.character-tooltip').forEach(el => el.remove());

                // Create tooltip
                const tooltip = document.createElement('div');
                tooltip.className = 'character-tooltip';
                tooltip.innerHTML = `
                    <img src="${character.image_url}" alt="${character.name}">
                    <div class="character-name">${character.name}</div>
                    <div class="character-traits">
                        ${(character.traits || []).map(trait =>
                            `<span class="character-trait">${trait}</span>`
                        ).join('')}
                    </div>
                `;

                // Position tooltip near the character name
                const rect = span.getBoundingClientRect();
                tooltip.style.left = `${rect.left}px`;
                tooltip.style.top = `${rect.bottom + window.scrollY}px`;

                // Add to body and make visible
                document.body.appendChild(tooltip);

                // Force reflow
                tooltip.offsetHeight;

                // Show tooltip
                tooltip.classList.add('visible');

                // Close tooltip when clicking outside
                document.addEventListener('click', function closeTooltip(e) {
                    if (!tooltip.contains(e.target) && e.target !== span) {
                        tooltip.classList.remove('visible');
                        setTimeout(() => {
                            tooltip.remove();
                        }, 300);
                        document.removeEventListener('click', closeTooltip);
                    }
                });

                e.stopPropagation();
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
        if (btn.disabled) return Promise.reject(new Error('Action already in progress'));

        // Get currency requirements from data attribute
        const currencyReq = btn.dataset.currencyReq ? JSON.parse(btn.dataset.currencyReq) : null;
        const isCustomChoice = form.querySelector('.custom-choice-input') !== null;

        // Disable button and show loading state
        btn.disabled = true;
        btn.classList.add('loading');
        const originalBtnText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processing...';

        // Create loading overlay
        const loadingPercent = UIUtils.createLoadingOverlay('Processing your choice...');

        // Track progress
        let progress = 0;
        const progressInterval = setInterval(() => {
            if (progress < 90) {
                progress += 5;
                UIUtils.updateLoadingPercent(loadingPercent, progress);
            }
        }, 500);

        // Create a more detailed loading UI
        const loadingUI = this.createChoiceLoadingUI();
        document.body.appendChild(loadingUI);

        // Update the loading UI progress
        const progressBar = loadingUI.querySelector('.progress-bar');
        const progressText = loadingUI.querySelector('.progress-text');
        const progressUpdateInterval = setInterval(() => {
            if (progress < 90) {
                progressBar.style.width = progress + '%';
                progressBar.setAttribute('aria-valuenow', progress);
                if (progressText) progressText.textContent = progress + '%';

                // Update the phases text
                this.updateChoiceProgressPhases(loadingUI, progress);
            }
        }, 500);

        // Prepare form data
        const formData = new FormData(form);
        const isCustom = form.querySelector('.custom-choice-input') !== null;

        // Make the choice API call
        return this.apiMakeChoice(formData, isCustom, currencyReq)
            .then(data => {
                // Update game state with choice results
                this.updateGameState(data);

                // Generate the next part of the story
                return this.apiGenerateNextStory(formData);
            })
            .then(storyData => {
                // Clear the progress intervals
                clearInterval(progressInterval);
                clearInterval(progressUpdateInterval);

                if (storyData.success && storyData.redirect) {
                    // Show 100% completion
                    UIUtils.updateLoadingPercent(loadingPercent, 100);
                    this.updateChoiceLoadingUICompletion(loadingUI);

                    // Wait a moment before redirecting
                    setTimeout(() => {
                        // Remove loading UI elements
                        if (loadingUI) loadingUI.remove();
                        UIUtils.removeLoadingOverlay(loadingPercent);

                        // Redirect to the next part of the story
                        window.location.href = storyData.redirect;
                    }, 1000);

                    return storyData;
                } else {
                    throw new Error(storyData.error || 'Failed to generate next story part');
                }
            })
            .catch(error => {
                console.error('Error processing choice:', error);

                // Show error message
                UIUtils.showToast('Error', error.message || 'Failed to process your choice');

                // Reset the button
                btn.disabled = false;
                btn.classList.remove('loading');
                btn.innerHTML = originalBtnText;

                // Clear all intervals
                clearInterval(progressInterval);
                clearInterval(progressUpdateInterval);

                // Remove loading UI elements
                UIUtils.removeLoadingOverlay(loadingPercent);
                if (loadingUI && loadingUI.parentNode) {
                    loadingUI.parentNode.removeChild(loadingUI);
                }

                throw error;
            });
    },

    /**
     * Creates a detailed loading UI for choice processing
     * @returns {HTMLElement} The loading UI element
     */
    createChoiceLoadingUI() {
        const loadingUI = document.createElement('div');
        loadingUI.className = 'choice-loading-display';
        loadingUI.style.position = 'fixed';
        loadingUI.style.top = '50%';
        loadingUI.style.left = '50%';
        loadingUI.style.transform = 'translate(-50%, -50%)';
        loadingUI.style.width = '80%';
        loadingUI.style.maxWidth = '500px';
        loadingUI.style.backgroundColor = 'rgba(33, 37, 41, 0.95)';
        loadingUI.style.borderRadius = '10px';
        loadingUI.style.padding = '20px';
        loadingUI.style.boxShadow = '0 0 20px rgba(0, 0, 0, 0.5)';
        loadingUI.style.zIndex = '9999';
        loadingUI.style.textAlign = 'center';

        loadingUI.innerHTML = `
            <div class="loading-text mb-3" style="color: white; font-size: 18px; font-weight: bold;">
                Crafting the next part of your adventure...
            </div>
            <div class="loading-phases mb-3" style="color: #adb5bd; font-size: 14px; text-align: left;">
                <div class="phase" style="margin-bottom: 10px;">⋯ Processing your choice</div>
                <div class="phase" style="margin-bottom: 10px;">⋯ Updating character relationships</div>
                <div class="phase" style="margin-bottom: 10px;">⋯ Creating story continuation</div>
                <div class="phase" style="margin-bottom: 10px;">⋯ Finalizing your adventure</div>
            </div>
            <div class="progress">
                <div class="progress-bar progress-bar-striped progress-bar-animated" style="width:0%"></div>
            </div>
            <div class="progress-text mt-2" style="color: white; font-size: 16px;">0%</div>
        `;

        return loadingUI;
    },

    /**
     * Updates the choice loading UI phases based on progress
     * @param {HTMLElement} loadingUI - The loading UI element
     * @param {number} progress - Current progress percentage
     */
    updateChoiceProgressPhases(loadingUI, progress) {
        if (!loadingUI) return;

        const phases = loadingUI.querySelectorAll('.phase');
        if (!phases || phases.length < 4) return;

        if (progress > 10 && progress <= 30) {
            phases[0].innerHTML = '✓ Processing your choice';
            phases[1].innerHTML = '⋯ Updating character relationships';
        } else if (progress > 30 && progress <= 60) {
            phases[1].innerHTML = '✓ Updating character relationships';
            phases[2].innerHTML = '⋯ Creating story continuation';
        } else if (progress > 60 && progress <= 85) {
            phases[2].innerHTML = '✓ Creating story continuation';
            phases[3].innerHTML = '⋯ Finalizing your adventure';
        }
    },

    /**
     * Updates the choice loading UI to show completion
     * @param {HTMLElement} loadingUI - The loading UI element
     */
    updateChoiceLoadingUICompletion(loadingUI) {
        if (!loadingUI) return;

        const progressBar = loadingUI.querySelector('.progress-bar');
        const progressText = loadingUI.querySelector('.progress-text');
        const phases = loadingUI.querySelectorAll('.phase');

        if (progressBar) progressBar.style.width = '100%';
        if (progressText) progressText.textContent = '100%';

        if (phases && phases.length >= 4) {
            for (let i = 0; i < phases.length; i++) {
                phases[i].innerHTML = phases[i].innerHTML.replace('⋯', '✓');
            }
        }
    },

    /**
     * Makes an API call to process the user's choice
     * @param {FormData} formData - The form data
     * @param {boolean} isCustom - Whether this is a custom choice
     * @param {Object} currencyReq - Currency requirements for this choice
     * @returns {Promise} - Promise resolving to API response
     */
    apiMakeChoice(formData, isCustom, currencyReq) {
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
                            let errorMessage = isCustom ?
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
                return data;
            });
    },

    /**
     * Updates the game state with choice results
     * @param {Object} data - Data returned from the make_choice API
     */
    updateGameState(data) {
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
    },

    /**
     * Makes an API call to generate the next part of the story
     * @param {FormData} formData - The form data
     * @returns {Promise} - Promise resolving to API response
     */
    apiGenerateNextStory(formData) {
        return fetch('/generate_story', {
            method: 'POST',
            body: formData,
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(data => {
                        throw new Error(data.error || `Server error: ${response.status}`);
                    });
                }
                return response.json();
            });
    }
};