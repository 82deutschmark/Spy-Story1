/**
 * CharacterMentions.js - Character Highlighting Module
 * =================================================
 * 
 * This module handles the highlighting of character names in story text
 * and manages the interaction between highlighted names and character portraits.
 * 
 * Key Features:
 * ------------
 * - Highlights character names in story text
 * - Adds tooltips with character images
 * - Handles click interactions to highlight portraits
 * - Manages character name sorting for proper highlighting
 * 
 * Integration Points:
 * -----------------
 * - HTML: Expects '.story-content' and '.character-portrait-mini' elements
 * - CSS: Uses 'character-mention' and 'character-mini-highlight' classes
 * 
 * Usage:
 * -----
 * 1. Initialize with CharacterMentions.initialize()
 * 2. Module automatically handles all character highlighting
 * 3. Clicking highlighted names will highlight corresponding portraits
 */

class CharacterMentions {
    constructor() {
        this.storyContent = null;
        this.characterPortraits = [];
        this.handleMentionClick = this.handleMentionClick.bind(this);
    }

    /**
     * Initialize the character mentions module
     */
    initialize() {
        this.storyContent = document.querySelector('.story-content');
        if (!this.storyContent) return;

        // Get character data from the cards
        const portraitElements = document.querySelectorAll('.character-select-card');
        this.characterPortraits = Array.from(portraitElements).map(portrait => ({
            name: portrait.querySelector('.character-name').textContent.trim(),
            image: portrait.querySelector('img').src,
            element: portrait,
            id: portrait.dataset.characterName
        }));

        // Sort names by length (longest first) to avoid partial matches
        this.characterPortraits.sort((a, b) => b.name.length - a.name.length);

        // Create a temporary container
        const tempContainer = document.createElement('div');
        tempContainer.innerHTML = this.storyContent.innerHTML;

        // Process all text nodes
        const walker = document.createTreeWalker(
            tempContainer,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        let node;
        while (node = walker.nextNode()) {
            let text = node.textContent;
            let changed = false;

            this.characterPortraits.forEach(character => {
                const escapedName = character.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(`\\b${escapedName}\\b`, 'g');

                if (regex.test(text)) {
                    changed = true;
                    text = text.replace(regex, (match) => {
                        const mention = document.createElement('span');
                        mention.className = 'character-mention';
                        mention.dataset.character = character.id;
                        mention.textContent = match;

                        const tooltip = document.createElement('span');
                        tooltip.className = 'character-tooltip';

                        const img = document.createElement('img');
                        img.src = character.image;
                        img.alt = match;

                        const nameDiv = document.createElement('div');
                        nameDiv.textContent = match;

                        tooltip.appendChild(img);
                        tooltip.appendChild(nameDiv);
                        mention.appendChild(tooltip);

                        return mention.outerHTML;
                    });
                }
            });

            if (changed) {
                const span = document.createElement('span');
                span.innerHTML = text;
                node.parentNode.replaceChild(span, node);
            }
        }

        // Update the content
        this.storyContent.innerHTML = tempContainer.innerHTML;

        // Add click handlers
        this.storyContent.querySelectorAll('.character-mention').forEach(mention => {
            mention.addEventListener('click', this.handleMentionClick);
        });
    }

    /**
     * Handle click events on character mentions
     * @param {Event} event - The click event
     */
    handleMentionClick(event) {
        const mention = event.currentTarget;
        const characterId = mention.dataset.character;
        const targetPortrait = document.querySelector(`.character-select-card[data-character-name="${characterId}"]`);

        // Remove highlight from all portraits
        document.querySelectorAll('.character-image').forEach(img => {
            img.classList.remove('character-mini-highlight');
        });

        // Highlight target portrait
        if (targetPortrait) {
            const portraitImg = targetPortrait.querySelector('.character-image');
            portraitImg.classList.add('character-mini-highlight');
            targetPortrait.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            
            // Remove highlight after delay
            setTimeout(() => {
                portraitImg.classList.remove('character-mini-highlight');
            }, 3000);
        }
    }
}

// Export the CharacterMentions class
export default CharacterMentions; 