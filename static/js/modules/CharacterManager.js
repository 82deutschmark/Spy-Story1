
/**
 * Character Manager Module
 * Handles character selection, highlighting, and related functionality
 */
export const CharacterManager = {
    /**
     * Initialize character manager
     */
    initialize() {
        console.log('Character manager initialized');
        this.highlightCharactersInStory();
    },

    /**
     * Highlights character names in story content
     */
    highlightCharactersInStory() {
        console.log('Highlighting characters in story');
        
        // Get story content and character images
        const storyContent = document.querySelector('.story-content');
        if (!storyContent) {
            console.log('No story content found');
            return;
        }
        
        const characterElements = document.querySelectorAll('.character-image[data-character-name]');
        if (!characterElements.length) {
            console.log('No character elements found');
            return;
        }
        
        // Get character names from DOM elements
        const characterNames = Array.from(characterElements).map(el => {
            return {
                name: el.dataset.characterName,
                id: el.dataset.characterId,
                imageUrl: el.src
            };
        });
        
        // Also check for character-images with alt text if none found with data attributes
        if (!characterNames.length) {
            const characterImgs = document.querySelectorAll('.character-image, .character-thumbnail');
            characterNames.push(...Array.from(characterImgs)
                .filter(img => img.alt && img.alt.trim() !== '')
                .map(img => {
                    return {
                        name: img.alt,
                        id: img.dataset.characterId || '',
                        imageUrl: img.src
                    };
                }));
        }
        
        // Get character data from page if available
        const characterData = window.characterData || [];
        if (characterData.length > 0) {
            characterNames.push(...characterData
                .filter(char => char.name && !characterNames.some(n => n.name === char.name))
                .map(char => {
                    return {
                        name: char.name,
                        id: char.id || '',
                        imageUrl: char.image_url || ''
                    };
                }));
        }
        
        // Highlight character names in text
        let storyHtml = storyContent.innerHTML;
        
        // Sort character names by length (longest first) to avoid partial replacements
        characterNames.sort((a, b) => b.name.length - a.name.length);
        
        characterNames.forEach(character => {
            if (!character.name) return;
            
            // Create regex that matches whole words only
            const nameRegex = new RegExp(`\\b${character.name}\\b`, 'gi');
            
            // Create character highlight HTML
            const highlightHtml = `<span class="character-highlight" data-character-id="${character.id}">
                ${character.name}
                <img src="${character.imageUrl}" class="character-tooltip-image" alt="${character.name}">
            </span>`;
            
            // Replace all occurrences in the story HTML
            storyHtml = storyHtml.replace(nameRegex, highlightHtml);
        });
        
        // Update story content
        storyContent.innerHTML = storyHtml;
        
        // Add event listeners for character highlights
        document.querySelectorAll('.character-highlight').forEach(highlight => {
            highlight.addEventListener('mouseenter', function() {
                const tooltipImage = this.querySelector('.character-tooltip-image');
                if (tooltipImage) {
                    tooltipImage.style.display = 'block';
                }
            });
            
            highlight.addEventListener('mouseleave', function() {
                const tooltipImage = this.querySelector('.character-tooltip-image');
                if (tooltipImage) {
                    tooltipImage.style.display = 'none';
                }
            });
        });
    },

    /**
     * Gets selected character data for story generation
     * @returns {Array} Array of selected character objects
     */
    getSelectedCharacters() {
        const selectedCards = document.querySelectorAll('.character-select-card.selected');
        const characters = [];
        
        selectedCards.forEach(card => {
            const characterId = card.dataset.id;
            const characterName = card.querySelector('.card-title')?.textContent || '';
            const characterImage = card.querySelector('.character-image')?.src || '';
            
            characters.push({
                id: characterId,
                name: characterName,
                image_url: characterImage
            });
        });
        
        return characters;
    }
};
