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
        
        document.body.appendChild(loadingUI);
        
        // Update loading bar and phases
        const progressBar = loadingUI.querySelector('.progress-bar');
        const progressText = loadingUI.querySelector('.progress-text');
        const phases = loadingUI.querySelectorAll('.phase');
        
        const progressUpdate = setInterval(() => {
            if (progress < 90) {
                progressBar.style.width = progress + '%';
                progressBar.setAttribute('aria-valuenow', progress);
                progressText.textContent = progress + '%';
                
                // Update phases based on progress
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