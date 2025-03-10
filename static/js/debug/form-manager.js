/**
 * Form management module for debugging interface
 */
import { api } from '../utils/api.js';
import { dom } from '../utils/dom.js';

export const formManager = {
    currentAnalysis: null,

    /**
     * Initialize form handlers and state
     * @param {Object} analysisData - Current analysis data if any
     */
    init: function(analysisData) {
        // Store initial analysis data
        this.currentAnalysis = analysisData;

        // Initialize edit mode switch
        const editModeSwitch = document.getElementById('editModeSwitch');
        const editContainer = document.getElementById('editContainer');

        if (editModeSwitch && editContainer) {
            editModeSwitch.addEventListener('change', () => {
                editContainer.style.display = editModeSwitch.checked ? 'block' : 'none';
                if (editModeSwitch.checked && this.currentAnalysis) {
                    this.populateEditForm(this.currentAnalysis);
                }
            });
        }

        // Initialize image type toggle
        const imageType = document.getElementById('imageType');
        if (imageType) {
            imageType.addEventListener('change', () => this.toggleTypeFields());
        }

        // Initialize save button
        const saveBtn = document.getElementById('saveToDbBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveToDatabase(saveBtn));
        }
    },

    /**
     * Toggle form fields based on image type
     */
    toggleTypeFields: function() {
        const imageType = document.getElementById('imageType');
        const characterFields = document.getElementById('characterFields');
        const sceneFields = document.getElementById('sceneFields');

        if (!imageType || !characterFields || !sceneFields) return;

        const isCharacter = imageType.value === 'character';
        characterFields.style.display = isCharacter ? 'block' : 'none';
        sceneFields.style.display = isCharacter ? 'none' : 'block';
    },

    /**
     * Populate the edit form with analysis data
     * @param {Object} analysisData - Analysis data to populate form with
     */
    populateEditForm: function(analysisData) {
        if (!analysisData) return;
        console.log('Populating form with data:', analysisData);

        // Store the original data for reference
        this.currentAnalysis = analysisData;

        // Determine if this is a character based on the structure of the data
        // Character has either a nested character object or specific character fields
        const isCharacter = (analysisData.character && typeof analysisData.character === 'object') ||
            (analysisData.name && !analysisData.scene_type && !analysisData.setting);

        // Set form type and toggle fields
        const imageType = document.getElementById('imageType');
        if (imageType) {
            imageType.value = isCharacter ? 'character' : 'scene';
            this.toggleTypeFields();
        }

        if (isCharacter) {
            // Handle character data - could be in character object or at top level
            const characterData = analysisData.character || analysisData;
            
            // Set form fields
            document.getElementById('imageName').value = characterData.name || '';
            document.getElementById('codeName').value = characterData.code_name || '';
            
            // Select appropriate role or default to undetermined
            const roleSelect = document.getElementById('characterRole');
            if (roleSelect) {
                const role = characterData.role || 'undetermined';
                // Make sure the option exists
                if ([...roleSelect.options].some(opt => opt.value === role)) {
                    roleSelect.value = role;
                } else {
                    roleSelect.value = 'undetermined';
                }
            }
            
            document.getElementById('characterStyle').value = characterData.style || '';
            document.getElementById('backstory').value = characterData.backstory || '';
            
            // Format arrays with appropriate separators
            if (document.getElementById('characterTraits')) {
                const traitsValue = Array.isArray(characterData.character_traits) 
                    ? characterData.character_traits.join(', ') 
                    : '';
                document.getElementById('characterTraits').value = traitsValue;
            }
            
            if (document.getElementById('plotLines')) {
                const plotLinesValue = Array.isArray(characterData.plot_lines) 
                    ? characterData.plot_lines.join('\n') 
                    : '';
                document.getElementById('plotLines').value = plotLinesValue;
            }
        } else {
            // Handle scene data
            document.getElementById('imageName').value = analysisData.name || '';
            
            // Set scene type
            const sceneTypeSelect = document.getElementById('sceneType');
            if (sceneTypeSelect) {
                const sceneType = analysisData.scene_type || 'narrative';
                // Make sure the option exists
                if ([...sceneTypeSelect.options].some(opt => opt.value === sceneType)) {
                    sceneTypeSelect.value = sceneType;
                } else {
                    sceneTypeSelect.value = 'narrative';
                }
            }
            
            document.getElementById('sceneSetting').value = analysisData.setting || '';
            
            // Format dramatic moments as newline-separated list
            const dramaticMomentsField = document.getElementById('dramaticMoments');
            if (dramaticMomentsField) {
                const momentsValue = Array.isArray(analysisData.dramatic_moments) 
                    ? analysisData.dramatic_moments.join('\n') 
                    : '';
                dramaticMomentsField.value = momentsValue;
            }
        }
    },

    /**
     * Save form changes directly to database
     * @param {HTMLButtonElement} saveBtn - The save button element
     * @returns {Promise<boolean>} Success status
     */
    saveToDatabase: async function(saveBtn) {
        try {
            if (!this.currentAnalysis) {
                throw new Error('No analysis data found to update');
            }

            console.log('Starting save operation with current analysis:', this.currentAnalysis);
            
            // Show loading state
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';

            // Get form data
            const imageType = document.getElementById('imageType').value;
            const name = document.getElementById('imageName').value;
            
            // Create a new analysis object while preserving metadata from original
            let updatedAnalysis = { ...this.currentAnalysis };
            
            // Make sure image_metadata is preserved if present
            if (this.currentAnalysis.image_metadata) {
                updatedAnalysis.image_metadata = this.currentAnalysis.image_metadata;
            }

            // Update with user-edited data
            if (imageType === 'character') {
                // For character type images
                if (updatedAnalysis.character && typeof updatedAnalysis.character === 'object') {
                    // Update nested character structure
                    updatedAnalysis.name = name;
                    updatedAnalysis.image_type = 'character';
                    updatedAnalysis.character = {
                        ...updatedAnalysis.character,
                        name: name,
                        code_name: document.getElementById('codeName').value,
                        role: document.getElementById('characterRole').value,
                        style: document.getElementById('characterStyle').value,
                        backstory: document.getElementById('backstory').value,
                        character_traits: document.getElementById('characterTraits').value
                            .split(',')
                            .map(t => t.trim())
                            .filter(Boolean),
                        plot_lines: document.getElementById('plotLines').value
                            .split('\n')
                            .map(p => p.trim())
                            .filter(Boolean)
                    };
                } else {
                    // Create a character object if it doesn't exist
                    updatedAnalysis = {
                        ...updatedAnalysis,
                        name: name,
                        image_type: 'character',
                        character: {
                            name: name,
                            code_name: document.getElementById('codeName').value,
                            role: document.getElementById('characterRole').value,
                            style: document.getElementById('characterStyle').value,
                            backstory: document.getElementById('backstory').value,
                            character_traits: document.getElementById('characterTraits').value
                                .split(',')
                                .map(t => t.trim())
                                .filter(Boolean),
                            plot_lines: document.getElementById('plotLines').value
                                .split('\n')
                                .map(p => p.trim())
                                .filter(Boolean)
                        }
                    };
                }
            } else {
                // For scene type images
                updatedAnalysis = {
                    ...updatedAnalysis,
                    name: name,
                    image_type: 'scene',
                    scene_type: document.getElementById('sceneType').value,
                    setting: document.getElementById('sceneSetting').value,
                    dramatic_moments: document.getElementById('dramaticMoments').value
                        .split('\n')
                        .map(m => m.trim())
                        .filter(Boolean)
                };
                
                // Remove any character data if switching from character to scene
                if (updatedAnalysis.character) {
                    delete updatedAnalysis.character;
                }
            }

            console.log('Saving updated analysis:', updatedAnalysis);

            // If we don't have an ID, we need to save as a new record using save_analysis
            if (!this.currentAnalysis.id) {
                // Make sure we have the image URL
                const dataElement = document.getElementById('analysisData');
                if (!dataElement || !dataElement.dataset.imageUrl) {
                    throw new Error('Image URL not found for new record');
                }
                
                const imageUrl = dataElement.dataset.imageUrl;
                
                // Save as new record using save_analysis endpoint
                const response = await api.post('/save_analysis', {
                    image_url: imageUrl,
                    analysis: updatedAnalysis
                });
                
                if (response.error) {
                    throw new Error(response.error);
                }
                
            } else {
                // Update existing record
                const response = await api.post('/api/image/update', {
                    id: this.currentAnalysis.id,
                    analysis: updatedAnalysis
                });

                if (response.error) {
                    throw new Error(response.error);
                }
            }

            // Show success message
            dom.showToast('Success', 'Analysis saved successfully');
            saveBtn.innerHTML = '<i class="fas fa-check me-2"></i>Saved';
            
            console.log('Save operation completed successfully');

            // Refresh the page after a short delay
            setTimeout(() => {
                location.reload();
            }, 1500);

            return true; // Explicitly return true to indicate success
        } catch (error) {
            console.error('Error saving to database:', error);
            dom.showToast('Error', error.message, true);
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-save me-2"></i>Save to Database';
            return false;
        }
    }
};