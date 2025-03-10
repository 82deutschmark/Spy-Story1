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

        // Initialize save to database button
        const saveToDbBtn = document.getElementById('saveToDbBtn');
        if (saveToDbBtn) {
            saveToDbBtn.addEventListener('click', () => this.saveToDatabase());
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

        const form = {
            imageType: document.getElementById('imageType'),
            imageName: document.getElementById('imageName'),
            codeName: document.getElementById('codeName'),
            characterRole: document.getElementById('characterRole'),
            characterStyle: document.getElementById('characterStyle'),
            backstory: document.getElementById('backstory'),
            characterTraits: document.getElementById('characterTraits'),
            plotLines: document.getElementById('plotLines'),
            sceneType: document.getElementById('sceneType'),
            sceneSetting: document.getElementById('sceneSetting'),
            dramaticMoments: document.getElementById('dramaticMoments')
        };

        // Determine if this is a character
        const isCharacter = analysisData.character && typeof analysisData.character === 'object' ||
            (!analysisData.scene_type && !analysisData.setting);

        // Set form type and toggle fields
        form.imageType.value = isCharacter ? 'character' : 'scene';
        this.toggleTypeFields();

        if (isCharacter) {
            const characterData = analysisData.character || {};
            form.imageName.value = characterData.name || analysisData.name || '';
            form.codeName.value = characterData.code_name || '';
            form.characterRole.value = characterData.role || 'undetermined';
            form.characterStyle.value = characterData.style || '';
            form.backstory.value = characterData.backstory || '';
            form.characterTraits.value = Array.isArray(characterData.character_traits) 
                ? characterData.character_traits.join(', ') 
                : '';
            form.plotLines.value = Array.isArray(characterData.plot_lines) 
                ? characterData.plot_lines.join('\n') 
                : '';
        } else {
            form.imageName.value = analysisData.name || '';
            form.sceneType.value = analysisData.scene_type || 'narrative';
            form.sceneSetting.value = analysisData.setting || '';
            form.dramaticMoments.value = Array.isArray(analysisData.dramatic_moments) 
                ? analysisData.dramatic_moments.join('\n') 
                : '';
        }
    },

    /**
     * Save form changes directly to database
     * @returns {Promise<boolean>} Success status
     */
    saveToDatabase: async function() {
        try {
            if (!this.currentAnalysis) {
                throw new Error('No analysis data found');
            }

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

            // Refresh the page to show updated data
            location.reload();
            return true;
        } catch (error) {
            console.error('Error saving to database:', error);
            dom.showToast('Error', error.message, true);
            return false;
        }
    }
};