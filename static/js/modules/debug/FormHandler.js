/**
 * FormHandler.js - Form handling for the debug interface
 */
import DebugUtils from './DebugUtils.js';
import DebugAPI from './DebugAPI.js';

export default class FormHandler {
    constructor(debugUI, dataHandler) {
        this.debugUI = debugUI;
        this.dataHandler = dataHandler;
        console.log('Form handler initialized');
    }

    async handleImageAnalysis() {
        const imageUrl = this.debugUI.elements.imageUrl.value.trim();
        if (!imageUrl) {
            DebugUtils.showToast('Error', 'Please enter an image URL', true);
            return;
        }

        try {
            DebugUtils.showToast('Processing', 'Analyzing image...');
            const response = await DebugAPI.analyzeImage(imageUrl); // Use the new analyzeImage method

            if (response.success) {
                this.debugUI.displayGeneratedContent(JSON.stringify(response.analysis, null, 2));
                this.debugUI.populateEditForm(response.analysis);
                const saveContainer = document.querySelector('.save-button-container');
                if (saveContainer && !saveContainer.querySelector('#saveToDbBtn')) {
                    const saveBtn = document.createElement('button');
                    saveBtn.id = 'saveToDbBtn';
                    saveBtn.className = 'btn btn-primary';
                    saveBtn.innerHTML = '<i class="fas fa-save me-2"></i>Save to Database';
                    saveBtn.addEventListener('click', () => this.saveAnalysisToDb(response.analysis, imageUrl));
                    saveContainer.appendChild(saveBtn);
                }
            } else {
                DebugUtils.showToast('Error', response.message || 'Failed to analyze image', true);
            }
        } catch (error) {
            DebugUtils.showToast('Error', 'Failed to analyze image: ' + error.message, true);
        }
    }

    applyChanges() {
        // Create a clean object with only the form values
        const contentObj = {};

        // Start with the image metadata from the existing content
        const originalContent = JSON.parse(this.debugUI.elements.generatedContent.textContent);
        contentObj.image_metadata = originalContent.image_metadata || {};

        // Update content object with form values
        contentObj.name = document.getElementById('imageName').value;
        contentObj.type = document.getElementById('imageType').value.toUpperCase();
        contentObj.image_type = document.getElementById('imageType').value;
        contentObj.description = document.getElementById('descriptionField').value;

        if (contentObj.image_type === 'character') {
            contentObj.role = document.getElementById('characterRole').value;
            contentObj.personality_traits = document.getElementById('characterTraits')
                .value.split(',').map(trait => trait.trim()).filter(trait => trait);
            contentObj.character_traits = [...contentObj.personality_traits];
            contentObj.character_name = contentObj.name; // Ensure character_name is set
            contentObj.potential_plot_lines = document.getElementById('plotLines')
                .value.split('\n').map(line => line.trim()).filter(line => line);
            contentObj.plot_lines = [...contentObj.potential_plot_lines];

            // Copy backstory if it exists in the original
            if (originalContent.backstory) {
                contentObj.backstory = originalContent.backstory;
            }
        } else {
            contentObj.scene_type = document.getElementById('sceneType').value;
            contentObj.setting = document.getElementById('sceneSetting').value;
            contentObj.dramatic_moments = document.getElementById('dramaticMoments')
                .value.split('\n').map(moment => moment.trim()).filter(moment => moment);
        }

        this.debugUI.elements.generatedContent.textContent = JSON.stringify(contentObj, null, 2);
        console.log('Edited form data:', contentObj);
        DebugUtils.showToast('Success', 'Changes applied');
    }

    async saveAnalysisToDb(analysis, imageUrl) {
        try {
            const currentContent = this.debugUI.elements.generatedContent.textContent;
            let contentObj;
            try {
                contentObj = JSON.parse(currentContent);
            } catch (e) {
                DebugUtils.showToast('Error', 'Failed to parse current content', true);
                return;
            }
            const saveData = {
                image_url: imageUrl,
                analysis: contentObj
            };
            console.log('Saving analysis data:', saveData);
            const response = await DebugAPI.post('/debug/save_analysis', saveData);

            if (response.success) {
                DebugUtils.showToast('Success', 'Image saved to database');
                this.dataHandler.loadImages();
            } else {
                DebugUtils.showToast('Error', response.message || 'Failed to save image', true);
            }
        } catch (error) {
            DebugUtils.showToast('Error', 'Failed to save image: ' + error.message, true);
        }
    }
    _parseArrayField(value) {
        return value.split(',').map(item => item.trim()).filter(item => item);
    }

    handleApplyChanges() {
        const isCharacter = document.getElementById('imageType').value === 'character';

        // Build the analysis data from form fields
        const data = {
            name: document.getElementById('imageName').value,
            type: document.getElementById('imageType').value.toUpperCase(),
            image_type: document.getElementById('imageType').value,
            description: document.getElementById('descriptionField').value
        };

        // Add character-specific fields
        if (isCharacter) {
            // Add all variations of field names for maximum compatibility
            data.role = document.getElementById('characterRole').value;
            data.character_role = document.getElementById('characterRole').value;

            const traits = this._parseArrayField(document.getElementById('characterTraits').value);
            data.character_traits = traits;
            data.personality_traits = traits;

            const plotLines = this._parseArrayField(document.getElementById('plotLines').value);
            data.plot_lines = plotLines;
            data.potential_plot_lines = plotLines;

            // Keep character_name consistent with name
            data.character_name = data.name;
        } else {
            // Add scene-specific fields
            data.scene_type = document.getElementById('sceneType').value;
            data.setting = document.getElementById('sceneSetting').value;
            data.dramatic_moments = this._parseArrayField(document.getElementById('dramaticMoments').value);
        }

        console.log("Edited form data:", data);

        // Update the analysis viewer
        this.uiModule.updateAnalysisView(data);

        // Close edit form
        document.getElementById('editModeSwitch').checked = false;
        document.getElementById('editContainer').style.display = 'none';

        // Show save button
        this.uiModule.showSaveButton();

        return false; // Prevent form submission
    }
}