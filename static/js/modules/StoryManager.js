/**
 * StoryManager.js - Manages story generation and continuation
 */
import DOMUtils from './DOMUtils.js';
import UIUtils from './UIUtils.js';
import EventManager from './EventManager.js';

class StoryManager {
    constructor() {
        console.log('StoryManager initialized');
        this.storyData = null;
        this.loadingContext = null;
    }

    /**
     * Begin story generation
     * @param {HTMLFormElement} form The form containing story parameters
     * @returns {Promise<boolean>} Whether the generation was successful
     */
    beginStoryGeneration(form) {
        console.log('Beginning story generation...');

        // Show loading overlay for the entire form
        this.loadingContext = UIUtils.createLoadingOverlay('Crafting your adventure...', form);

        // Disable form and Begin button
        const beginButton = DOMUtils.getElement('#beginAdventureBtn');
        const restoreButton = beginButton ? UIUtils.showButtonLoading(beginButton, 'Creating...') : null;

        // Initialize progress updates
        let progress = 0;
        const progressInterval = setInterval(() => {
            if (progress < 90) {
                progress += 5;
                UIUtils.updateLoadingPercent(this.loadingContext, progress);

                // Update message at certain thresholds
                if (progress === 20) {
                    UIUtils.updateLoadingMessage(this.loadingContext, 'Creating characters...');
                } else if (progress === 40) {
                    UIUtils.updateLoadingMessage(this.loadingContext, 'Building the world...');
                } else if (progress === 60) {
                    UIUtils.updateLoadingMessage(this.loadingContext, 'Crafting the narrative...');
                } else if (progress === 80) {
                    UIUtils.updateLoadingMessage(this.loadingContext, 'Almost ready...');
                }
            }
        }, 500);

        // Submit the form using fetch API
        return fetch('/generate_story', {
            method: 'POST',
            body: new FormData(form)
        })
        .then(response => {
            clearInterval(progressInterval);

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            return response.json();
        })
        .then(data => {
            UIUtils.updateLoadingPercent(this.loadingContext, 100);
            UIUtils.updateLoadingMessage(this.loadingContext, 'Story ready!');

            console.log('Story generation successful:', data);

            // Process the response
            if (data.success) {
                this.storyData = data;

                // Small delay for visual polish
                setTimeout(() => {
                    UIUtils.removeLoadingOverlay(this.loadingContext, () => {
                        // Redirect to the story page
                        window.location.href = `/story/${data.story_id}`;
                    });
                }, 500);

                return true;
            } else {
                UIUtils.removeLoadingOverlay(this.loadingContext);
                if (restoreButton) restoreButton('Begin Your Adventure');

                UIUtils.showToast('Error', data.error || 'Failed to generate story', 'error');
                return false;
            }
        })
        .catch(error => {
            clearInterval(progressInterval);
            console.error('Error generating story:', error);

            UIUtils.removeLoadingOverlay(this.loadingContext);
            if (restoreButton) restoreButton('Begin Your Adventure');

            UIUtils.showToast('Error', 'Failed to generate story. Please try again.', 'error');
            return false;
        });
    }

    /**
     * Continue the story with a choice
     * @param {string} choiceId The ID of the selected choice
     * @param {number} storyId The ID of the current story
     * @returns {Promise<boolean>} Whether the continuation was successful
     */
    continueStory(choiceId, storyId) {
        console.log(`Continuing story ${storyId} with choice ${choiceId}`);

        // Get the choice button
        const choiceButton = DOMUtils.getElement(`#choice-${choiceId}`);

        // Disable all choice buttons
        const allChoiceButtons = DOMUtils.getElements('.choice-btn');
        allChoiceButtons.forEach(btn => {
            btn.disabled = true;
        });

        // Show loading state on the selected button
        const restoreButton = choiceButton ? 
            UIUtils.showButtonLoading(choiceButton, 'Selecting...') : null;

        // Create loading overlay for the story container
        const storyContainer = DOMUtils.getElement('#story-container');
        this.loadingContext = UIUtils.createLoadingOverlay('Continuing your adventure...', storyContainer);

        // Initialize progress updates
        let progress = 0;
        const progressInterval = setInterval(() => {
            if (progress < 90) {
                progress += 10;
                UIUtils.updateLoadingPercent(this.loadingContext, progress);

                // Update message at certain thresholds
                if (progress === 30) {
                    UIUtils.updateLoadingMessage(this.loadingContext, 'Exploring new paths...');
                } else if (progress === 60) {
                    UIUtils.updateLoadingMessage(this.loadingContext, 'Crafting the next chapter...');
                }
            }
        }, 600);

        // Make the API request
        return fetch('/api/continue_story', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                choice_id: choiceId,
                story_id: storyId
            })
        })
        .then(response => {
            clearInterval(progressInterval);

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            return response.json();
        })
        .then(data => {
            UIUtils.updateLoadingPercent(this.loadingContext, 100);
            UIUtils.updateLoadingMessage(this.loadingContext, 'Story updated!');

            console.log('Story continuation successful:', data);

            // Process the response
            if (data.success) {
                // Small delay for visual polish
                setTimeout(() => {
                    UIUtils.removeLoadingOverlay(this.loadingContext, () => {
                        // Reload the page to show the updated story
                        window.location.reload();
                    });
                }, 500);

                return true;
            } else {
                UIUtils.removeLoadingOverlay(this.loadingContext);

                // Re-enable all choice buttons
                allChoiceButtons.forEach(btn => {
                    btn.disabled = false;
                });

                if (restoreButton) restoreButton('Select');

                UIUtils.showToast('Error', data.error || 'Failed to continue story', 'error');
                return false;
            }
        })
        .catch(error => {
            clearInterval(progressInterval);
            console.error('Error continuing story:', error);

            UIUtils.removeLoadingOverlay(this.loadingContext);

            // Re-enable all choice buttons
            allChoiceButtons.forEach(btn => {
                btn.disabled = false;
            });

            if (restoreButton) restoreButton('Select');

            UIUtils.showToast('Error', 'Failed to continue story. Please try again.', 'error');
            return false;
        });
    }

    /**
     * Highlight character names in the story text
     * @param {Object} encounteredCharacters Map of character names to data
     */
    highlightCharacters(encounteredCharacters) {
        if (!encounteredCharacters) return;

        const storyText = DOMUtils.getElement('#story-text');
        if (!storyText) return;

        // Process the text
        const originalText = storyText.innerHTML;
        const highlightedText = UIUtils.highlightCharacterNames(originalText, encounteredCharacters);
        storyText.innerHTML = highlightedText;

        // Add event listeners for character highlights
        const highlights = DOMUtils.getElements('.character-highlight');
        highlights.forEach(highlight => {
            highlight.addEventListener('mouseenter', () => {
                const name = highlight.dataset.characterName;
                const character = encounteredCharacters[name];
                if (character && character.image_url) {
                    this.showCharacterTooltip(highlight, character);
                }
            });

            highlight.addEventListener('mouseleave', () => {
                this.hideCharacterTooltip();
            });
        });
    }

    /**
     * Show a tooltip with character info
     * @param {Element} element The element to show the tooltip near
     * @param {Object} character The character data
     */
    showCharacterTooltip(element, character) {
        // Remove any existing tooltip
        this.hideCharacterTooltip();

        // Create tooltip
        const tooltip = DOMUtils.createElement('div', {
            className: 'character-tooltip',
            dataset: {
                characterId: character.id || ''
            }
        });

        tooltip.innerHTML = `
            <div class="character-tooltip-content">
                <img src="${character.image_url}" alt="${character.name}" class="character-tooltip-img">
                <div class="character-tooltip-info">
                    <div class="character-tooltip-name">${character.name}</div>
                    <div class="character-tooltip-relationship">
                        Relationship: ${character.relationship || 'Neutral'}
                    </div>
                </div>
            </div>
        `;

        // Position the tooltip
        const rect = element.getBoundingClientRect();
        tooltip.style.position = 'absolute';
        tooltip.style.top = `${window.scrollY + rect.bottom + 10}px`;
        tooltip.style.left = `${window.scrollX + rect.left}px`;
        tooltip.style.zIndex = '1000';

        // Add to DOM
        document.body.appendChild(tooltip);
    }

    /**
     * Hide the character tooltip
     */
    hideCharacterTooltip() {
        const tooltip = DOMUtils.getElement('.character-tooltip');
        if (tooltip && tooltip.parentNode) {
            tooltip.parentNode.removeChild(tooltip);
        }
    }
}

// Create a global instance
const storyManager = new StoryManager();

// Export to global scope for now
window.StoryManager = storyManager;
export default storyManager;