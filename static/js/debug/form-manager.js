/**
 * Form management module for debugging interface
 */
import { dom } from '../utils/dom.js';

export const formManager = {
    /**
     * Initialize form handlers
     * @param {Object} analysisData - Current analysis data
     */
    init: (analysisData) => {
        const imageType = document.getElementById('imageType');
        const characterFields = document.getElementById('characterFields');
        const sceneFields = document.getElementById('sceneFields');

        if (imageType) {
            imageType.addEventListener('change', () => {
                formManager.toggleTypeFields();
            });
        }

        // Initialize edit mode switch
        const editModeSwitch = document.getElementById('editModeSwitch');
        const editContainer = document.getElementById('editContainer');
        
        if (editModeSwitch && editContainer) {
            editModeSwitch.addEventListener('change', function() {
                editContainer.style.display = this.checked ? 'block' : 'none';
                if (this.checked) {
                    formManager.populateEditForm(analysisData);
                }
            });
        }
    },

    /**
     * Toggle form fields based on image type
     */
    toggleTypeFields: () => {
        const imageType = document.getElementById('imageType');
        const characterFields = document.getElementById('characterFields');
        const sceneFields = document.getElementById('sceneFields');

        if (!imageType || !characterFields || !sceneFields) return;

        if (imageType.value === 'character') {
            characterFields.style.display = 'block';
            sceneFields.style.display = 'none';
        } else {
            characterFields.style.display = 'none';
            sceneFields.style.display = 'block';
        }
    },

    /**
     * Populate the edit form with analysis data
     * @param {Object} analysisData - Analysis data to populate form with
     */
    populateEditForm: (analysisData) => {
        if (!analysisData) return;

        const isCharacter = analysisData.character && 
            typeof analysisData.character === 'object' ||
            (!analysisData.scene_type && !analysisData.setting);

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

        if (isCharacter) {
            const characterData = analysisData.character || {};
            form.imageType.value = 'character';
            form.imageName.value = characterData.code_name || analysisData.name || '';
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
            form.imageType.value = 'scene';
            form.imageName.value = analysisData.setting || '';
            form.sceneType.value = analysisData.scene_type || '';
            form.sceneSetting.value = analysisData.setting || '';
            form.dramaticMoments.value = Array.isArray(analysisData.dramatic_moments) 
                ? analysisData.dramatic_moments.join('\n') 
                : '';
        }

        formManager.toggleTypeFields();
    },

    /**
     * Get updated analysis data from form
     * @param {Object} originalAnalysis - Original analysis data
     * @returns {Object} Updated analysis data
     */
    getUpdatedAnalysis: (originalAnalysis) => {
        const analysis = JSON.parse(JSON.stringify(originalAnalysis));
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

        const nameVal = form.imageName.value;
        analysis.image_type = form.imageType.value;
        
        if (form.imageType.value === 'character') {
            analysis.name = nameVal;
            analysis.character = analysis.character || {};
            analysis.character.name = nameVal;
            analysis.character.code_name = form.codeName.value;
            analysis.character.role = form.characterRole.value;
            analysis.character.style = form.characterStyle.value;
            analysis.character.backstory = form.backstory.value;
            
            const traitsArr = form.characterTraits.value.split(',')
                .map(t => t.trim())
                .filter(Boolean);
            analysis.character.character_traits = traitsArr;
            analysis.character_traits = traitsArr;
            
            const plotArr = form.plotLines.value.split('\n')
                .map(p => p.trim())
                .filter(Boolean);
            analysis.character.plot_lines = plotArr;
            analysis.plot_lines = plotArr;
            
            // Remove scene-related fields
            delete analysis.scene_type;
            delete analysis.setting;
            delete analysis.dramatic_moments;
        } else {
            analysis.name = nameVal;
            analysis.scene_type = form.sceneType.value;
            analysis.setting = form.sceneSetting.value;
            
            const momentsArr = form.dramaticMoments.value.split('\n')
                .map(m => m.trim())
                .filter(Boolean);
            analysis.dramatic_moments = momentsArr;
            
            // Remove character-related fields
            delete analysis.character;
            delete analysis.character_name;
            delete analysis.character_traits;
            delete analysis.role;
            delete analysis.plot_lines;
        }
        
        return analysis;
    }
};
