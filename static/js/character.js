/**
 * Character highlighting and interaction module
 */
import { dom } from './utils/dom.js';

export const character = {
    /**
     * Initialize character highlighting in story text
     */
    initializeHighlighting: () => {
        const storyContent = document.querySelector('.story-content');
        if (!storyContent) {
            return;
        }

        const characterPortraits = document.querySelectorAll('.character-portrait-mini');
        if (characterPortraits.length === 0) {
            return;
        }

        // Collect character data from portraits
        const characterNames = Array.from(characterPortraits).map(portrait => {
            const nameElement = portrait.querySelector('.character-mini-name');
            const imageElement = portrait.querySelector('img');

            if (!nameElement || !imageElement) return null;

            const name = nameElement.textContent.trim();
            if (!name) return null;

            return {
                name: name,
                image: imageElement.src,
                dataName: portrait.getAttribute('data-character-name') || 
                         name.toLowerCase().replace(/\s/g, '-')
            };
        }).filter(Boolean);

        if (characterNames.length === 0) {
            return;
        }

        // Sort names by length (longest first) to avoid partial matches
        characterNames.sort((a, b) => b.name.length - a.name.length);

        // Get the story text content
        let storyHTML = storyContent.innerHTML;
        const originalHTML = storyHTML;

        // Replace character names with highlighted spans
        characterNames.forEach(character => {
            const escapedName = character.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`\\b${escapedName}\\b(?![^<]*>)`, 'gi');

            storyHTML = storyHTML.replace(regex, match => 
                `<span class="character-mention" data-character="${character.dataName}">` +
                `${match}<span class="character-tooltip"><img src="${character.image}" ` +
                `alt="${match}">${match}</span></span>`
            );
        });

        // Only update if changes were made
        if (storyHTML !== originalHTML) {
            storyContent.innerHTML = storyHTML;

            // Add click event listeners
            document.querySelectorAll('.character-mention').forEach(mention => {
                mention.addEventListener('click', function() {
                    const characterId = this.dataset.character;
                    if (!characterId) return;

                    // Remove highlight from all portraits
                    document.querySelectorAll('.character-mini-img')
                        .forEach(img => img.classList.remove('character-mini-highlight'));

                    // Add highlight to this portrait
                    const targetPortrait = document.querySelector(
                        `.character-portrait-mini[data-character-name="${characterId}"]`
                    );
                    if (targetPortrait) {
                        const portraitImg = targetPortrait.querySelector('.character-mini-img');
                        if (portraitImg) {
                            portraitImg.classList.add('character-mini-highlight');
                            targetPortrait.scrollIntoView({ 
                                behavior: 'smooth', 
                                block: 'nearest' 
                            });

                            // Remove highlight after 3 seconds
                            setTimeout(() => {
                                portraitImg.classList.remove('character-mini-highlight');
                            }, 3000);
                        }
                    }
                });
            });
        }
    }
};

// Initialize character highlighting when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    character.initializeHighlighting();
});
