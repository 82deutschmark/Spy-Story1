/**
 * Form management module for debugging interface
 */
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

        // Initialize apply changes button
        const applyChangesBtn = document.getElementById('applyChangesBtn');
        if (applyChangesBtn) {
            applyChangesBtn.addEventListener('click', () => this.applyChanges());
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
     * Apply form changes to the analysis
     * @returns {Object} Updated analysis data
     */
    applyChanges: function() {
        try {
            const generatedContent = document.getElementById('generatedContent');
            if (!generatedContent || !this.currentAnalysis) {
                throw new Error('No analysis data found');
            }

            const analysis = { ...this.currentAnalysis };
            const imageType = document.getElementById('imageType').value;
            const name = document.getElementById('imageName').value;

            if (imageType === 'character') {
                if (!analysis.character) {
                    analysis.character = {};
                }

                // Update character fields
                analysis.character.name = name;
                analysis.name = name;
                analysis.character_name = name;
                analysis.character.code_name = document.getElementById('codeName').value;
                analysis.character.role = document.getElementById('characterRole').value;
                analysis.character.style = document.getElementById('characterStyle').value;
                analysis.character.backstory = document.getElementById('backstory').value;

                // Parse traits and plot lines
                analysis.character.character_traits = document.getElementById('characterTraits').value
                    .split(',')
                    .map(t => t.trim())
                    .filter(Boolean);

                analysis.character.plot_lines = document.getElementById('plotLines').value
                    .split('\n')
                    .map(p => p.trim())
                    .filter(Boolean);

                // Clean up scene fields
                delete analysis.scene_type;
                delete analysis.setting;
                delete analysis.dramatic_moments;
            } else {
                // Update scene fields
                analysis.name = name;
                analysis.scene_type = document.getElementById('sceneType').value;
                analysis.setting = document.getElementById('sceneSetting').value;
                analysis.dramatic_moments = document.getElementById('dramaticMoments').value
                    .split('\n')
                    .map(m => m.trim())
                    .filter(Boolean);

                // Clean up character fields
                delete analysis.character;
                delete analysis.character_name;
                delete analysis.character_traits;
                delete analysis.role;
                delete analysis.plot_lines;
            }

            // Update the display and stored data
            generatedContent.textContent = JSON.stringify(analysis, null, 2);
            this.currentAnalysis = analysis;
            dom.showToast('Success', 'Changes applied successfully');
            return analysis;
        } catch (error) {
            console.error('Error applying changes:', error);
            dom.showToast('Error', error.message, true);
            return null;
        }
    },
    /**
     * Get updated analysis data from form
     * @param {Object} originalAnalysis - Original analysis data
     * @returns {Object} Updated analysis data
     */
    getUpdatedAnalysis: (originalAnalysis) => {
        return this.applyChanges();
    }
};