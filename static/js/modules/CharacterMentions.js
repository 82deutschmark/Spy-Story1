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
        // Ensure initialization happens after full page load
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
        const parser = new DOMParser();
        const doc = parser.parseFromString(this.storyContent.innerHTML, 'text/html');
        this.processNode(doc.body);

        // Update the story content
        this.storyContent.innerHTML = doc.body.innerHTML;

        // Add click handlers to mentions
        this.storyContent.querySelectorAll('.character-mention').forEach(mention => {
            mention.addEventListener('click', this.handleMentionClick);
        });
    }

    /**
     * Method to reinitialize the highlights when story content updates
     */
    refresh() {
        this.initialize();
    }

    /**
     * Process a DOM node recursively
     * @param {Node} node - The node to process
     */
    processNode(node) {
        // Skip processing if node is already inside a character mention
        if (node.parentNode && node.parentNode.closest('.character-mention')) return;

        if (node.nodeType === Node.TEXT_NODE) {
            let text = node.textContent;
            let lastIndex = 0;
            let fragments = [];

            this.characterPortraits.forEach(character => {
                const regex = new RegExp(`\\b${character.name}\\b`, 'g');
                let match;

                while ((match = regex.exec(text)) !== null) {
                    // Add text before match
                    if (match.index > lastIndex) {
                        fragments.push(text.substring(lastIndex, match.index));
                    }

                    // Add highlighted character name
                    fragments.push(`<span class="character-mention" data-character="${character.id}">${match[0]}<span class="character-tooltip"><img src="${character.image}" alt="${match[0]}"><div>${match[0]}</div></span></span>`);

                    lastIndex = regex.lastIndex;
                }
            });

            // Add remaining text
            if (lastIndex < text.length) {
                fragments.push(text.substring(lastIndex));
            }

            if (fragments.length > 1) {
                const span = document.createElement('span');
                span.innerHTML = fragments.join('');
                node.parentNode.replaceChild(span, node);
            }
        } else {
            // Process child nodes
            Array.from(node.childNodes).forEach(child => this.processNode(child));
        }
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

// Change initialization to run on load
window.addEventListener('load', () => {
    const cm = new CharacterMentions();
    cm.initialize();
});

// Export the CharacterMentions class
export default CharacterMentions;