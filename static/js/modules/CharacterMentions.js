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
     * Sets up character highlighting and click handlers
     */
    initialize() {
        try {
            this.storyContent = document.querySelector('.story-content');
            if (!this.storyContent) {
                console.log("No story content found for character mentions");
                return;
            }

            // Get all character names from the mini-portraits
            const portraitElements = document.querySelectorAll('.character-portrait-mini');
            this.characterPortraits = Array.from(portraitElements).map(portrait => ({
                name: portrait.querySelector('.character-mini-name').textContent.trim(),
                image: portrait.querySelector('img').src,
                element: portrait
            }));

            // Sort names by length (longest first) to avoid partial matches
            this.characterPortraits.sort((a, b) => b.name.length - a.name.length);

            // Process story text
            this.processStoryText();

            console.log(`Initialized ${this.characterPortraits.length} character mentions`);
        } catch (error) {
            console.error("Error initializing character mentions:", error);
        }
    }

    /**
     * Process the story text to add character highlighting
     */
    processStoryText() {
        let storyText = this.storyContent.innerHTML;

        // Replace character names with highlighted spans
        this.characterPortraits.forEach(character => {
            const regex = new RegExp(`\\b${character.name}\\b`, 'gi');
            storyText = storyText.replace(regex, match => {
                return `<span class="character-mention" data-character="${character.name.toLowerCase().replace(/\s/g, '-')}">${match}<span class="character-tooltip"><img src="${character.image}" alt="${match}"><div>${match}</div></span></span>`;
            });
        });

        // Update the story content
        this.storyContent.innerHTML = storyText;

        // Add click event to highlighted mentions
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
        const targetPortrait = document.querySelector(`.character-portrait-mini[data-character-name="${characterId}"]`);

        // Remove highlight from all portraits
        document.querySelectorAll('.character-mini-img').forEach(img => {
            img.classList.remove('character-mini-highlight');
        });

        // Highlight target portrait
        if (targetPortrait) {
            const portraitImg = targetPortrait.querySelector('.character-mini-img');
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