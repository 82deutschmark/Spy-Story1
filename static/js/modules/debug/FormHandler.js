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
        const content = this.debugUI.elements.generatedContent.textContent;
        let contentObj;
        try {
            contentObj = JSON.parse(content);
        } catch (e) {
            DebugUtils.showToast('Error', 'Failed to parse current content', true);
            return;
        }

        contentObj.name = document.getElementById('imageName').value;
        contentObj.type = document.getElementById('imageType').value.toUpperCase();
        contentObj.image_type = document.getElementById('imageType').value;
        contentObj.description = document.getElementById('descriptionField').value;

        if (contentObj.image_type === 'character') {
            contentObj.role = document.getElementById('characterRole').value;
            contentObj.personality_traits = document.getElementById('characterTraits')
                .value.split(',').map(trait => trait.trim()).filter(trait => trait);
            contentObj.character_traits = [...contentObj.personality_traits];
            contentObj.potential_plot_lines = document.getElementById('plotLines')
                .value.split('\n').map(line => line.trim()).filter(line => line);
            contentObj.plot_lines = [...contentObj.potential_plot_lines];
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
}