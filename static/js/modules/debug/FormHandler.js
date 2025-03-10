
/**
 * Form Handling Module
 * Handles form submissions and data processing
 */
import DebugUtils from './DebugUtils.js';
import DebugAPI from './DebugAPI.js';
import DebugUI from './DebugUI.js';

export default {
    /**
     * Initialize form handler
     */
    initialize() {
        console.log('Form handler initialized');
    },

    /**
     * Handle image analysis form submission
     */
    async handleImageAnalysis() {
        const imageUrl = DebugUI.elements.imageUrl.value.trim();
        if (!imageUrl) {
            DebugUtils.showToast('Error', 'Please enter an image URL', true);
            return;
        }

        try {
            DebugUtils.showToast('Processing', 'Analyzing image...');

            // Send to backend for analysis
            const response = await DebugAPI.post('/debug/analyze-image', { image_url: imageUrl });

            if (response.success) {
                // Display the result
                DebugUI.displayGeneratedContent(JSON.stringify(response.analysis, null, 2));

                // Populate edit form with data
                DebugUI.populateEditForm(response.analysis);

                // Add save button if not already present
                const saveContainer = document.querySelector('.save-button-container');
                if (!saveContainer.querySelector('#saveToDbBtn')) {
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
    },

    /**
     * Apply changes from edit form
     */
    applyChanges() {
        // Get the current content as an object
        const currentContent = DebugUI.elements.generatedContent.textContent;
        let contentObj;
        try {
            contentObj = JSON.parse(currentContent);
        } catch (e) {
            DebugUtils.showToast('Error', 'Failed to parse current content', true);
            return;
        }

        // Update with form values
        contentObj.name = document.getElementById('imageName').value;
        contentObj.type = document.getElementById('imageType').value.toUpperCase();
        contentObj.image_type = document.getElementById('imageType').value;
        contentObj.description = document.getElementById('descriptionField').value;

        // Type-specific fields
        if (contentObj.image_type === 'character') {
            contentObj.role = document.getElementById('characterRole').value;
            contentObj.personality_traits = document.getElementById('characterTraits')
                .value.split(',').map(trait => trait.trim()).filter(trait => trait);

            // For compatibility
            contentObj.character_traits = [...contentObj.personality_traits];

            contentObj.potential_plot_lines = document.getElementById('plotLines')
                .value.split('\n').map(line => line.trim()).filter(line => line);

            // For compatibility
            contentObj.plot_lines = [...contentObj.potential_plot_lines];
        } else {
            contentObj.scene_type = document.getElementById('sceneType').value;
            contentObj.setting = document.getElementById('sceneSetting').value;
            contentObj.dramatic_moments = document.getElementById('dramaticMoments')
                .value.split('\n').map(moment => moment.trim()).filter(moment => moment);
        }

        // Update the displayed content
        DebugUI.elements.generatedContent.textContent = JSON.stringify(contentObj, null, 2);
        console.log('Edited form data:', contentObj);

        DebugUtils.showToast('Success', 'Changes applied');
    },

    /**
     * Save analysis to database
     * @param {object} analysis - Analysis data
     * @param {string} imageUrl - Image URL
     */
    async saveAnalysisToDb(analysis, imageUrl) {
        try {
            // Get the current content as it might have been edited
            const currentContent = DebugUI.elements.generatedContent.textContent;
            let contentObj;
            try {
                contentObj = JSON.parse(currentContent);
            } catch (e) {
                DebugUtils.showToast('Error', 'Failed to parse current content', true);
                return;
            }

            // Prepare data to save
            const saveData = {
                image_url: imageUrl,
                analysis: contentObj
            };

            console.log('Saving analysis data:', saveData);

            // Send to backend
            const response = await DebugAPI.post('/debug/save-image', saveData);

            if (response.success) {
                DebugUtils.showToast('Success', 'Image saved to database');
                // Refresh image list
                DataHandler.loadImages();
            } else {
                DebugUtils.showToast('Error', response.message || 'Failed to save image', true);
            }
        } catch (error) {
            DebugUtils.showToast('Error', 'Failed to save image: ' + error.message, true);
        }
    }
};
