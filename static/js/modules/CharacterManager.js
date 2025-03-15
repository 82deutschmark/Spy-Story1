/**
 * Character Manager Module
 * Handles character selection, highlighting, and related functionality
 */
const CharacterManager = {
    /**
     * Initialize character manager
     */
    initialize() {
        console.log('Character manager initialized');
        this.highlightCharactersInStory();
    },

    /**
     * Highlight character mentions in story text
     */
    highlightCharactersInStory() {
        console.log('Highlighting characters in story');
        const storyContent = document.querySelector('.story-content');
        if (!storyContent) {
            console.log('No story content found');
            return;
        }

        // Get all character names from character portraits or gallery
        let characterNames = [];

        // Try to get names from character portraits in storyboard
        const portraitNames = Array.from(document.querySelectorAll('.character-mini-name'))
            .map(el => el.textContent.trim())
            .filter(name => name.length > 0);

        // Also try character names from selection page
        const selectionNames = Array.from(document.querySelectorAll('.character-name'))
            .map(el => el.textContent.trim())
            .filter(name => name.length > 0);

        // Combine both sources
        characterNames = [...new Set([...portraitNames, ...selectionNames])];

        if (!characterNames.length) {
            console.log('No character names found for highlighting');
            return;
        }

        console.log('Found character names for highlighting:', characterNames);

        // Replace character names with highlighted versions
        let contentHtml = storyContent.innerHTML;
        characterNames.forEach(name => {
            // Escape special regex characters in the name
            const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`\\b${escapedName}\\b`, 'gi');
            contentHtml = contentHtml.replace(regex, match => {
                return `<span class="character-highlight">${match}</span>`;
            });
        });

        storyContent.innerHTML = contentHtml;
        console.log('Character highlighting complete');
    }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CharacterManager;
}

// For browser use, attach to window object
if (typeof window !== 'undefined') {
    // Only assign to window if not already defined
    if (!window.CharacterManager) {
        window.CharacterManager = CharacterManager;
    }
}