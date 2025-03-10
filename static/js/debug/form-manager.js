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

        // Determine if this is a character
        const isCharacter = analysisData.character && typeof analysisData.character === 'object' ||
            (!analysisData.scene_type && !analysisData.setting);

        // Set form type and toggle fields
        const imageType = document.getElementById('imageType');
        if (imageType) {
            imageType.value = isCharacter ? 'character' : 'scene';
            this.toggleTypeFields();
        }

        if (isCharacter) {
            const characterData = analysisData.character || {};
            document.getElementById('imageName').value = characterData.name || analysisData.name || '';
            document.getElementById('codeName').value = characterData.code_name || '';
            document.getElementById('characterRole').value = characterData.role || 'undetermined';
            document.getElementById('characterStyle').value = characterData.style || '';
            document.getElementById('backstory').value = characterData.backstory || '';
            document.getElementById('characterTraits').value = Array.isArray(characterData.character_traits) 
                ? characterData.character_traits.join(', ') 
                : '';
            document.getElementById('plotLines').value = Array.isArray(characterData.plot_lines) 
                ? characterData.plot_lines.join('\n') 
                : '';
        } else {
            document.getElementById('imageName').value = analysisData.name || '';
            document.getElementById('sceneType').value = analysisData.scene_type || 'narrative';
            document.getElementById('sceneSetting').value = analysisData.setting || '';
            document.getElementById('dramaticMoments').value = Array.isArray(analysisData.dramatic_moments) 
                ? analysisData.dramatic_moments.join('\n') 
                : '';
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
                throw new Error('No analysis data found');
            }

            // Show loading state
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';

            const imageType = document.getElementById('imageType').value;
            const name = document.getElementById('imageName').value;
            let updatedAnalysis = {};

            if (imageType === 'character') {
                // Build character analysis
                updatedAnalysis = {
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
            } else {
                // Build scene analysis
                updatedAnalysis = {
                    name: name,
                    image_type: 'scene',
                    scene_type: document.getElementById('sceneType').value,
                    setting: document.getElementById('sceneSetting').value,
                    dramatic_moments: document.getElementById('dramaticMoments').value
                        .split('\n')
                        .map(m => m.trim())
                        .filter(Boolean)
                };
            }

            // Save updated analysis to database
            const response = await api.post('/api/image/update', {
                id: this.currentAnalysis.id,
                analysis: updatedAnalysis
            });

            if (response.error) {
                throw new Error(response.error);
            }

            // Show success message
            dom.showToast('Success', 'Changes saved successfully');
            saveBtn.innerHTML = '<i class="fas fa-check me-2"></i>Saved';

            // Refresh the page after a short delay
            setTimeout(() => {
                location.reload();
            }, 1500);

            return true;
        } catch (error) {
            console.error('Error saving to database:', error);
            dom.showToast('Error', error.message, true);
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-save me-2"></i>Save to Database';
            return false;
        }
    }
};