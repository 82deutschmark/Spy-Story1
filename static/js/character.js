
/**
 * Character selection and management for Choose Your Own Adventure
 */
export const character = {
    /**
     * Initialize character selection functionality
     */
    initialize() {
        console.log('Initializing character selection...');
        
        // Add click handlers to character cards
        document.querySelectorAll('.character-select-card').forEach(card => {
            card.addEventListener('click', () => {
                this.selectCharacter(card.dataset.id);
            });
        });
        
        // Add click handlers for select buttons
        document.querySelectorAll('.select-character-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent event bubbling
                this.selectCharacter(btn.dataset.characterId);
            });
        });
        
        // Add handlers for reroll buttons
        document.querySelectorAll('.reroll-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent event bubbling
                this.rerollCharacter(btn.dataset.id);
            });
        });
    },
    
    /**
     * Select or deselect a character
     * @param {string} id - Character ID
     */
    selectCharacter(id) {
        if (!id) return;
        
        const card = document.querySelector(`.character-select-card[data-id="${id}"]`);
        const checkbox = document.getElementById(`character${id}`);
        
        if (!card || !checkbox) return;
        
        // Toggle selected state
        card.classList.toggle('selected');
        checkbox.checked = card.classList.contains('selected');
        
        // Update selection indicator visibility
        const indicator = card.querySelector('.selection-indicator');
        if (indicator) {
            indicator.style.display = checkbox.checked ? 'block' : 'none';
        }
        
        // Update the selected characters list
        this.updateSelectedCharactersList();
    },
    
    /**
     * Update the list of selected characters displayed to the user
     */
    updateSelectedCharactersList() {
        const selectedContainer = document.querySelector('.selected-characters-container');
        const selectedList = document.querySelector('.selected-characters-list');
        
        if (!selectedContainer || !selectedList) return;
        
        // Get all selected characters
        const selectedCharacters = Array.from(document.querySelectorAll('.character-checkbox:checked'));
        
        // Only show container if we have selections
        selectedContainer.style.display = selectedCharacters.length > 0 ? 'block' : 'none';
        
        // Clear existing list
        selectedList.innerHTML = '';
        
        // Add each selected character to the list
        selectedCharacters.forEach(checkbox => {
            const id = checkbox.value;
            const card = document.querySelector(`.character-select-card[data-id="${id}"]`);
            
            if (!card) return;
            
            const img = card.querySelector('img');
            const name = card.closest('.character-container')?.querySelector('.character-name')?.textContent || 'Character';
            
            const characterItem = document.createElement('div');
            characterItem.className = 'selected-character-item';
            characterItem.innerHTML = `
                <img src="${img?.src || ''}" alt="${name}" class="selected-character-img">
                <span>${name}</span>
                <button type="button" class="btn btn-sm btn-outline-danger remove-character-btn" data-id="${id}">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            // Add remove button handler
            const removeBtn = characterItem.querySelector('.remove-character-btn');
            removeBtn?.addEventListener('click', () => this.selectCharacter(id));
            
            selectedList.appendChild(characterItem);
        });
    },
    
    /**
     * Update hidden inputs with selected character IDs
     */
    updateSelectedImagesInput() {
        const form = document.getElementById('storyForm');
        if (!form) return;
        
        // Remove any existing dynamic inputs
        form.querySelectorAll('input[name="selected_images[]"].dynamic').forEach(input => {
            input.remove();
        });
        
        // Get all selected character IDs
        const selectedCharacters = Array.from(document.querySelectorAll('.character-checkbox:checked'));
        
        // No need to add if none selected
        if (selectedCharacters.length === 0) return;
        
        // Add hidden inputs for each selected character
        selectedCharacters.forEach(checkbox => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = 'selected_images[]';
            input.value = checkbox.value;
            input.className = 'dynamic';
            form.appendChild(input);
        });
    },
    
    /**
     * Initialize character highlighting in story
     */
    initializeHighlighting() {
        const characterPortraits = document.querySelectorAll('.character-portrait-mini');
        
        if (characterPortraits.length === 0) return;
        
        // Find all character names in story text
        const storyContent = document.querySelector('.story-content');
        
        if (!storyContent) {
            console.log('Story content element not found');
            return;
        }
        
        characterPortraits.forEach(portrait => {
            const characterName = portrait.dataset.characterName;
            if (!characterName) return;
            
            // Highlight character name mentions in the story
            portrait.addEventListener('mouseenter', () => {
                const regex = new RegExp(`\\b${characterName}\\b`, 'gi');
                storyContent.innerHTML = storyContent.innerHTML.replace(
                    regex, 
                    '<span class="character-highlight">$&</span>'
                );
            });
            
            // Remove highlights when mouse leaves
            portrait.addEventListener('mouseleave', () => {
                const highlights = storyContent.querySelectorAll('.character-highlight');
                highlights.forEach(el => {
                    const parent = el.parentNode;
                    if (parent) {
                        parent.replaceChild(document.createTextNode(el.textContent), el);
                    }
                });
            });
        });
    },
    
    /**
     * Reroll a character (get a new random character)
     * @param {string} id - Character ID to reroll
     */
    rerollCharacter(id) {
        if (!id) return;
        
        // Show loading state
        const btn = document.querySelector(`.reroll-btn[data-id="${id}"]`);
        const container = document.querySelector(`.character-container:has(.character-select-card[data-id="${id}"])`);
        
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Rerolling...';
        }
        
        // Make AJAX request to get new character
        fetch('/api/random_character')
            .then(response => response.json())
            .then(data => {
                if (data.success && container) {
                    // Update character data
                    const card = container.querySelector('.character-select-card');
                    const img = container.querySelector('img');
                    const name = container.querySelector('.character-name');
                    const traitsList = container.querySelector('.character-traits-list');
                    
                    if (card) card.dataset.id = data.id;
                    if (img) img.src = data.image_url;
                    if (name) name.textContent = data.name;
                    
                    // Update traits
                    if (traitsList && data.character_traits) {
                        traitsList.innerHTML = '';
                        data.character_traits.forEach(trait => {
                            const span = document.createElement('span');
                            span.className = 'trait-badge';
                            span.textContent = trait;
                            traitsList.appendChild(span);
                        });
                    }
                    
                    // Update checkbox
                    const checkbox = document.getElementById(`character${id}`);
                    if (checkbox) {
                        checkbox.value = data.id;
                        checkbox.id = `character${data.id}`;
                    }
                    
                    // Update reroll button
                    if (btn) {
                        btn.dataset.id = data.id;
                    }
                }
            })
            .catch(error => {
                console.error('Error rerolling character:', error);
            })
            .finally(() => {
                // Reset button
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-dice me-1"></i> Reroll Character';
                }
            });
    }
};
