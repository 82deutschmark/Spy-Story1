
document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const storyMap = document.getElementById('storyMap');
    const charactersContainer = document.getElementById('charactersContainer');
    const scenesContainer = document.getElementById('scenesContainer');
    const createNodeForm = document.getElementById('createNodeForm');
    const createChoiceForm = document.getElementById('createChoiceForm');
    const createAchievementForm = document.getElementById('createAchievementForm');
    const sceneSelect = document.getElementById('sceneSelect');
    const parentNode = document.getElementById('parentNode');
    const sourceNode = document.getElementById('sourceNode');
    const targetNode = document.getElementById('targetNode');
    const characterDriven = document.getElementById('characterDriven');
    const achievementCharacters = document.getElementById('achievementCharacters');
    const suggestionCharacters = document.getElementById('suggestionCharacters');
    const getSuggestionsBtn = document.getElementById('getSuggestionsBtn');
    const suggestionsContainer = document.getElementById('suggestionsContainer');
    const suggestionsList = document.getElementById('suggestionsList');
    const resetViewBtn = document.getElementById('resetViewBtn');
    const nodeDetailsModal = new bootstrap.Modal(document.getElementById('nodeDetailsModal'));
    const deleteNodeBtn = document.getElementById('deleteNodeBtn');
    
    // Toast instance
    const toast = new bootstrap.Toast(document.getElementById('notificationToast'));

    // Data storage
    let characters = [];
    let scenes = [];
    let nodes = [];
    let choices = [];
    let currentNodeId = null;
    
    // Show toast notification
    function showToast(title, message) {
        document.getElementById('toastTitle').textContent = title;
        document.getElementById('toastMessage').textContent = message;
        toast.show();
    }
    
    // Load characters from database
    function loadCharacters() {
        fetch('/api/images/characters')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    characters = data.characters;
                    renderCharacters();
                    populateCharacterDropdowns();
                } else {
                    showToast('Error', data.error || 'Failed to load characters');
                }
            })
            .catch(error => {
                console.error('Error loading characters:', error);
                showToast('Error', 'Failed to load characters');
            });
    }
    
    // Load scenes from database
    function loadScenes() {
        fetch('/api/images/scenes')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    scenes = data.scenes;
                    renderScenes();
                    populateSceneDropdown();
                } else {
                    showToast('Error', data.error || 'Failed to load scenes');
                }
            })
            .catch(error => {
                console.error('Error loading scenes:', error);
                showToast('Error', 'Failed to load scenes');
            });
    }
    
    // Load story nodes from database
    function loadStoryNodes() {
        fetch('/api/story/nodes')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    nodes = data.nodes;
                    loadStoryChoices();
                    populateNodeDropdowns();
                } else {
                    showToast('Error', data.error || 'Failed to load story nodes');
                }
            })
            .catch(error => {
                console.error('Error loading story nodes:', error);
                showToast('Error', 'Failed to load story nodes');
            });
    }
    
    // Load story choices from database
    function loadStoryChoices() {
        fetch('/api/story/choices')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    choices = data.choices;
                    renderStoryMap();
                } else {
                    showToast('Error', data.error || 'Failed to load story choices');
                }
            })
            .catch(error => {
                console.error('Error loading story choices:', error);
                showToast('Error', 'Failed to load story choices');
            });
    }
    
    // Render characters in the UI
    function renderCharacters() {
        charactersContainer.innerHTML = '';
        
        if (characters.length === 0) {
            charactersContainer.innerHTML = '<div class="col-12 text-center">No characters found</div>';
            return;
        }
        
        characters.forEach(character => {
            const characterCard = document.createElement('div');
            characterCard.className = 'col-md-6 col-lg-4 mb-3';
            characterCard.innerHTML = `
                <div class="card h-100">
                    <img src="${character.image_url}" class="card-img-top" alt="${character.name || 'Character'}">
                    <div class="card-body">
                        <h5 class="card-title">${character.name || 'Unnamed Character'}</h5>
                        <div class="character-traits mb-2">
                            ${(character.character_traits || []).map(trait => 
                                `<span class="badge bg-secondary me-1">${trait}</span>`
                            ).join('')}
                        </div>
                        <p class="card-text">Role: ${character.character_role || 'Unknown'}</p>
                    </div>
                    <div class="card-footer">
                        <button class="btn btn-sm btn-outline-primary view-character-btn" data-id="${character.id}">
                            <i class="fas fa-eye me-1"></i>View
                        </button>
                        <button class="btn btn-sm btn-outline-success use-in-story-btn" data-id="${character.id}">
                            <i class="fas fa-plus me-1"></i>Use in Story
                        </button>
                    </div>
                </div>
            `;
            charactersContainer.appendChild(characterCard);
        });
        
        // Add event listeners for character cards
        document.querySelectorAll('.view-character-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const characterId = this.getAttribute('data-id');
                viewCharacterDetails(characterId);
            });
        });
        
        document.querySelectorAll('.use-in-story-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const characterId = this.getAttribute('data-id');
                useCharacterInStory(characterId);
            });
        });
    }
    
    // Render scenes in the UI
    function renderScenes() {
        scenesContainer.innerHTML = '';
        
        if (scenes.length === 0) {
            scenesContainer.innerHTML = '<div class="col-12 text-center">No scenes found</div>';
            return;
        }
        
        scenes.forEach(scene => {
            const sceneCard = document.createElement('div');
            sceneCard.className = 'col-md-6 col-lg-4 mb-3';
            sceneCard.innerHTML = `
                <div class="card h-100">
                    <img src="${scene.image_url}" class="card-img-top" alt="${scene.setting || 'Scene'}">
                    <div class="card-body">
                        <h5 class="card-title">${scene.setting || 'Unknown Setting'}</h5>
                        <p class="card-text">Type: ${scene.scene_type || 'Narrative'}</p>
                        <div class="dramatic-moments mb-2">
                            ${(scene.dramatic_moments || []).slice(0, 2).map(moment => 
                                `<div class="moment-item">${moment}</div>`
                            ).join('')}
                        </div>
                    </div>
                    <div class="card-footer">
                        <button class="btn btn-sm btn-outline-primary view-scene-btn" data-id="${scene.id}">
                            <i class="fas fa-eye me-1"></i>View
                        </button>
                        <button class="btn btn-sm btn-outline-success use-scene-btn" data-id="${scene.id}">
                            <i class="fas fa-plus me-1"></i>Use in Story
                        </button>
                    </div>
                </div>
            `;
            scenesContainer.appendChild(sceneCard);
        });
        
        // Add event listeners for scene cards
        document.querySelectorAll('.view-scene-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const sceneId = this.getAttribute('data-id');
                viewSceneDetails(sceneId);
            });
        });
        
        document.querySelectorAll('.use-scene-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const sceneId = this.getAttribute('data-id');
                useSceneInStory(sceneId);
            });
        });
    }
    
    // Render the story map
    function renderStoryMap() {
        storyMap.innerHTML = '';
        
        if (nodes.length === 0) {
            storyMap.innerHTML = '<div class="text-center p-5">No story nodes yet. Create your first node to start building your story!</div>';
            return;
        }
        
        // Calculate node positions
        const levelMap = {};
        const nodeMap = {};
        
        // First, create a map of nodes by id
        nodes.forEach(node => {
            nodeMap[node.id] = node;
        });
        
        // Find root nodes (nodes without parents)
        const rootNodes = nodes.filter(node => !node.parent_node_id);
        
        // Function to calculate depth of a node
        function calculateDepth(nodeId, depth = 0) {
            const node = nodeMap[nodeId];
            if (!node) return depth;
            
            if (!levelMap[depth]) {
                levelMap[depth] = [];
            }
            
            if (!levelMap[depth].includes(nodeId)) {
                levelMap[depth].push(nodeId);
            }
            
            // Find children nodes
            const childChoices = choices.filter(choice => choice.node_id === nodeId);
            childChoices.forEach((choice, index) => {
                if (choice.next_node_id) {
                    calculateDepth(choice.next_node_id, depth + 1);
                }
            });
            
            return depth;
        }
        
        // Calculate depth for all root nodes
        rootNodes.forEach(node => {
            calculateDepth(node.id);
        });
        
        // Render nodes
        Object.keys(levelMap).forEach(level => {
            const nodesInLevel = levelMap[level];
            const levelWidth = storyMap.offsetWidth;
            const nodeWidth = 120;
            const nodeSpacing = Math.min(100, levelWidth / nodesInLevel.length);
            
            nodesInLevel.forEach((nodeId, index) => {
                const node = nodeMap[nodeId];
                const nodeElement = document.createElement('div');
                nodeElement.className = 'story-node';
                nodeElement.setAttribute('data-id', node.id);
                nodeElement.style.top = `${Number(level) * 120 + 20}px`;
                nodeElement.style.left = `${(index * nodeSpacing) + 20}px`;
                
                // Add image if node has one
                let nodeContent = node.narrative_text.substring(0, 30) + '...';
                
                nodeElement.innerHTML = nodeContent;
                nodeElement.addEventListener('click', () => {
                    showNodeDetails(node.id);
                });
                
                storyMap.appendChild(nodeElement);
            });
        });
        
        // Render edges (choices)
        choices.forEach(choice => {
            const sourceNode = document.querySelector(`.story-node[data-id="${choice.node_id}"]`);
            const targetNode = document.querySelector(`.story-node[data-id="${choice.next_node_id}"]`);
            
            if (sourceNode && targetNode) {
                // Calculate positions
                const sourceRect = sourceNode.getBoundingClientRect();
                const targetRect = targetNode.getBoundingClientRect();
                const mapRect = storyMap.getBoundingClientRect();
                
                const sourceX = sourceNode.offsetLeft + sourceNode.offsetWidth / 2;
                const sourceY = sourceNode.offsetTop + sourceNode.offsetHeight;
                const targetX = targetNode.offsetLeft + targetNode.offsetWidth / 2;
                const targetY = targetNode.offsetTop;
                
                // Calculate length and angle
                const dx = targetX - sourceX;
                const dy = targetY - sourceY;
                const length = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx) * 180 / Math.PI;
                
                // Create edge
                const edge = document.createElement('div');
                edge.className = 'story-edge';
                edge.style.width = `${length}px`;
                edge.style.left = `${sourceX}px`;
                edge.style.top = `${sourceY}px`;
                edge.style.transform = `rotate(${angle}deg)`;
                
                storyMap.appendChild(edge);
            }
        });
    }
    
    // Populate node dropdown menus
    function populateNodeDropdowns() {
        // Clear existing options
        parentNode.innerHTML = '<option value="">Start of story</option>';
        sourceNode.innerHTML = '<option value="">Select source node</option>';
        targetNode.innerHTML = '<option value="">Select target node</option>';
        
        // Add nodes to dropdowns
        nodes.forEach(node => {
            const shortText = node.narrative_text.substring(0, 30) + (node.narrative_text.length > 30 ? '...' : '');
            
            const parentOption = document.createElement('option');
            parentOption.value = node.id;
            parentOption.textContent = `Node ${node.id}: ${shortText}`;
            parentNode.appendChild(parentOption);
            
            const sourceOption = document.createElement('option');
            sourceOption.value = node.id;
            sourceOption.textContent = `Node ${node.id}: ${shortText}`;
            sourceNode.appendChild(sourceOption);
            
            const targetOption = document.createElement('option');
            targetOption.value = node.id;
            targetOption.textContent = `Node ${node.id}: ${shortText}`;
            targetNode.appendChild(targetOption);
        });
    }
    
    // Populate scene dropdown
    function populateSceneDropdown() {
        // Clear existing options
        sceneSelect.innerHTML = '<option value="">No scene selected</option>';
        
        // Add scenes to dropdown
        scenes.forEach(scene => {
            const option = document.createElement('option');
            option.value = scene.id;
            option.textContent = scene.setting || `Scene ${scene.id}`;
            sceneSelect.appendChild(option);
        });
    }
    
    // Populate character dropdowns
    function populateCharacterDropdowns() {
        // Clear existing options
        characterDriven.innerHTML = '<option value="">Not character-specific</option>';
        achievementCharacters.innerHTML = '';
        suggestionCharacters.innerHTML = '';
        
        // Add characters to dropdown
        characters.forEach(character => {
            // For character-driven choices
            const option = document.createElement('option');
            option.value = character.id;
            option.textContent = character.name || `Character ${character.id}`;
            characterDriven.appendChild(option);
            
            // For achievement characters
            const achievementCheckbox = document.createElement('div');
            achievementCheckbox.className = 'form-check';
            achievementCheckbox.innerHTML = `
                <input class="form-check-input" type="checkbox" value="${character.id}" id="achievementChar${character.id}">
                <label class="form-check-label" for="achievementChar${character.id}">
                    ${character.name || `Character ${character.id}`}
                </label>
            `;
            achievementCharacters.appendChild(achievementCheckbox);
            
            // For suggestion characters
            const suggestionCheckbox = document.createElement('div');
            suggestionCheckbox.className = 'form-check';
            suggestionCheckbox.innerHTML = `
                <input class="form-check-input" type="checkbox" value="${character.id}" id="suggestionChar${character.id}">
                <label class="form-check-label" for="suggestionChar${character.id}">
                    ${character.name || `Character ${character.id}`}
                </label>
            `;
            suggestionCharacters.appendChild(suggestionCheckbox);
        });
    }
    
    // Show node details
    function showNodeDetails(nodeId) {
        currentNodeId = nodeId;
        const node = nodes.find(n => n.id == nodeId);
        
        if (!node) {
            showToast('Error', 'Node not found');
            return;
        }
        
        const nodeChoices = choices.filter(c => c.node_id == nodeId);
        
        // Get associated image if available
        let imageHtml = '';
        if (node.image_id) {
            const image = [...characters, ...scenes].find(img => img.id == node.image_id);
            if (image) {
                imageHtml = `
                    <div class="text-center mb-3">
                        <img src="${image.image_url}" class="img-fluid rounded" style="max-height: 200px;" alt="Node image">
                    </div>
                `;
            }
        }
        
        // Format choices
        let choicesHtml = '<div class="mt-3"><h5>Choices from this node:</h5>';
        if (nodeChoices.length === 0) {
            choicesHtml += '<p class="text-muted">No choices defined for this node.</p>';
        } else {
            choicesHtml += '<ul class="list-group">';
            nodeChoices.forEach(choice => {
                const targetNode = nodes.find(n => n.id == choice.next_node_id);
                choicesHtml += `
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        ${choice.choice_text}
                        <span class="badge bg-primary rounded-pill">To Node ${choice.next_node_id}</span>
                    </li>
                `;
            });
            choicesHtml += '</ul>';
        }
        choicesHtml += '</div>';
        
        // Build modal content
        const modalContent = document.getElementById('nodeDetailsContent');
        modalContent.innerHTML = `
            ${imageHtml}
            <h4>Node ${node.id}</h4>
            <div class="card mb-3">
                <div class="card-body">
                    <p>${node.narrative_text}</p>
                </div>
            </div>
            ${choicesHtml}
        `;
        
        // Show modal
        nodeDetailsModal.show();
    }
    
    // View character details
    function viewCharacterDetails(characterId) {
        const character = characters.find(c => c.id == characterId);
        if (!character) {
            showToast('Error', 'Character not found');
            return;
        }
        
        // TODO: Show character details in a modal
        showToast('Info', `Viewing character: ${character.name || 'Unnamed Character'}`);
    }
    
    // View scene details
    function viewSceneDetails(sceneId) {
        const scene = scenes.find(s => s.id == sceneId);
        if (!scene) {
            showToast('Error', 'Scene not found');
            return;
        }
        
        // TODO: Show scene details in a modal
        showToast('Info', `Viewing scene: ${scene.setting || 'Unknown Setting'}`);
    }
    
    // Use character in story
    function useCharacterInStory(characterId) {
        const character = characters.find(c => c.id == characterId);
        if (!character) {
            showToast('Error', 'Character not found');
            return;
        }
        
        // Set character-driven dropdown to this character
        characterDriven.value = characterId;
        
        showToast('Success', `Selected ${character.name || 'character'} for story use`);
    }
    
    // Use scene in story
    function useSceneInStory(sceneId) {
        const scene = scenes.find(s => s.id == sceneId);
        if (!scene) {
            showToast('Error', 'Scene not found');
            return;
        }
        
        // Set scene dropdown to this scene
        sceneSelect.value = sceneId;
        
        showToast('Success', `Selected "${scene.setting || 'scene'}" for story use`);
    }
    
    // Create a new story node
    function createNode(formData) {
        fetch('/api/story/node/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showToast('Success', 'Node created successfully');
                loadStoryNodes(); // Reload nodes
            } else {
                showToast('Error', data.error || 'Failed to create node');
            }
        })
        .catch(error => {
            console.error('Error creating node:', error);
            showToast('Error', 'Failed to create node');
        });
    }
    
    // Create a new choice
    function createChoice(formData) {
        fetch('/api/story/choice/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showToast('Success', 'Choice created successfully');
                loadStoryChoices(); // Reload choices
            } else {
                showToast('Error', data.error || 'Failed to create choice');
            }
        })
        .catch(error => {
            console.error('Error creating choice:', error);
            showToast('Error', 'Failed to create choice');
        });
    }
    
    // Create a new achievement
    function createAchievement(formData) {
        fetch('/api/story/achievement/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showToast('Success', 'Achievement created successfully');
                // Update UI as needed
            } else {
                showToast('Error', data.error || 'Failed to create achievement');
            }
        })
        .catch(error => {
            console.error('Error creating achievement:', error);
            showToast('Error', 'Failed to create achievement');
        });
    }
    
    // Get story suggestions
    function getStorySuggestions(characterIds) {
        fetch('/api/story/suggest', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ character_ids: characterIds })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                renderSuggestions(data.suggestions);
            } else {
                showToast('Error', data.error || 'Failed to get suggestions');
            }
        })
        .catch(error => {
            console.error('Error getting suggestions:', error);
            showToast('Error', 'Failed to get suggestions');
        });
    }
    
    // Render story suggestions
    function renderSuggestions(suggestions) {
        suggestionsContainer.style.display = 'block';
        suggestionsList.innerHTML = '';
        
        if (suggestions.length === 0) {
            suggestionsList.innerHTML = '<div class="alert alert-warning">No suggestions found for the selected characters.</div>';
            return;
        }
        
        suggestions.forEach(suggestion => {
            const suggestionEl = document.createElement('div');
            suggestionEl.className = 'card mb-3';
            suggestionEl.innerHTML = `
                <div class="card-body">
                    <h5 class="card-title">${suggestion.theme}</h5>
                    <p class="card-text">${suggestion.description}</p>
                    <div class="mt-2">
                        <span class="badge bg-primary">Suggested Conflict: ${suggestion.suggested_conflict}</span>
                    </div>
                </div>
            `;
            suggestionsList.appendChild(suggestionEl);
        });
    }
    
    // Delete node
    function deleteNode(nodeId) {
        if (confirm('Are you sure you want to delete this node? This will also delete all choices connected to it.')) {
            fetch(`/api/story/node/${nodeId}`, {
                method: 'DELETE',
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showToast('Success', 'Node deleted successfully');
                    nodeDetailsModal.hide();
                    loadStoryNodes(); // Reload nodes
                } else {
                    showToast('Error', data.error || 'Failed to delete node');
                }
            })
            .catch(error => {
                console.error('Error deleting node:', error);
                showToast('Error', 'Failed to delete node');
            });
        }
    }
    
    // Event Listeners
    
    // Create node form
    if (createNodeForm) {
        createNodeForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = {
                narrative_text: document.getElementById('nodeText').value,
                image_id: document.getElementById('sceneSelect').value || null,
                parent_node_id: document.getElementById('parentNode').value || null
            };
            
            createNode(formData);
        });
    }
    
    // Create choice form
    if (createChoiceForm) {
        createChoiceForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = {
                node_id: document.getElementById('sourceNode').value,
                choice_text: document.getElementById('choiceText').value,
                next_node_id: document.getElementById('targetNode').value,
                character_id: document.getElementById('characterDriven').value || null
            };
            
            createChoice(formData);
        });
    }
    
    // Create achievement form
    if (createAchievementForm) {
        createAchievementForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get selected characters
            const characterIds = [];
            document.querySelectorAll('#achievementCharacters input:checked').forEach(checkbox => {
                characterIds.push(checkbox.value);
            });
            
            const formData = {
                name: document.getElementById('achievementName').value,
                description: document.getElementById('achievementDesc').value,
                points: document.getElementById('achievementPoints').value,
                character_ids: characterIds
            };
            
            createAchievement(formData);
        });
    }
    
    // Get suggestions button
    if (getSuggestionsBtn) {
        getSuggestionsBtn.addEventListener('click', function() {
            // Get selected characters
            const characterIds = [];
            document.querySelectorAll('#suggestionCharacters input:checked').forEach(checkbox => {
                characterIds.push(checkbox.value);
            });
            
            if (characterIds.length === 0) {
                showToast('Warning', 'Please select at least one character for suggestions');
                return;
            }
            
            getStorySuggestions(characterIds);
        });
    }
    
    // Delete node button
    if (deleteNodeBtn) {
        deleteNodeBtn.addEventListener('click', function() {
            if (currentNodeId) {
                deleteNode(currentNodeId);
            }
        });
    }
    
    // Reset view button
    if (resetViewBtn) {
        resetViewBtn.addEventListener('click', function() {
            renderStoryMap();
        });
    }
    
    // Load initial data
    loadCharacters();
    loadScenes();
    loadStoryNodes();
});
