/**
 * ModalHandler.js - Modal dialog management for the debug interface
 */
export default {
    initialize() {
        const detailsModal = document.getElementById('detailsModal');
        if (detailsModal) {
            detailsModal.addEventListener('hidden.bs.modal', () => {
                const detailsModalLabel = document.getElementById('detailsModalLabel');
                if (detailsModalLabel) {
                    detailsModalLabel.innerHTML = '<i class="fas fa-edit me-2"></i>Image Details';
                }

                const modalImage = document.getElementById('modalImage');
                if (modalImage) modalImage.style.display = '';

                const modalEditModeSwitch = document.getElementById('modalEditModeSwitch');
                if (modalEditModeSwitch) modalEditModeSwitch.style.display = '';

                const reanalyzeImageBtn = document.getElementById('reanalyzeImageBtn');
                if (reanalyzeImageBtn) reanalyzeImageBtn.style.display = '';
            });
        }
        console.log('Modal handler initialized');
    },

    // Enable editing mode in the modal
    enableEditMode() {
        const modalContent = document.getElementById('modalContent');
        let data;

        try {
            // Parse the JSON data from the modal content
            data = JSON.parse(modalContent.textContent);
        } catch (error) {
            console.error('Error parsing JSON data:', error);
            return;
        }

        // Populate form fields with fallbacks for different field naming
        document.getElementById('modalImageName').value = data.character_name || data.name || '';
        document.getElementById('modalImageType').value = data.image_type || data.type?.toLowerCase() || 'character';
        document.getElementById('modalDescriptionField').value = data.description || '';

        // Show/hide appropriate fields
        this.toggleModalFieldsByType(data.image_type || data.type?.toLowerCase());

        if ((data.image_type === 'character') || (data.type?.toUpperCase() === 'CHARACTER')) {
            // Populate character fields with multiple fallbacks
            const role = data.character_role || data.role || 'neutral';
            document.getElementById('modalCharacterRole').value = role;

            const traits = data.character_traits || data.personality_traits || [];
            document.getElementById('modalCharacterTraits').value = this.formatArrayField(traits);

            const plotLines = data.plot_lines || data.potential_plot_lines || [];
            document.getElementById('modalPlotLines').value = this.formatArrayField(plotLines);
        } else {
            // Populate scene fields
            document.getElementById('modalSceneType').value = data.scene_type || 'action';
            document.getElementById('modalSceneSetting').value = data.setting || '';
            document.getElementById('modalDramaticMoments').value = this.formatArrayField(data.dramatic_moments || []);
        }

        // Show edit container and save button
        document.getElementById('modalEditContainer').style.display = 'block';
        document.getElementById('saveAnalysisBtn').style.display = 'block';
    },

    // Save edited analysis from modal
    saveAnalysis() {
        const imageId = this.currentImageId;
        if (!imageId) {
            console.error('No image ID found for saving');
            return;
        }

        const isCharacter = document.getElementById('modalImageType').value === 'character';

        // Build the analysis data from form fields
        const updatedAnalysis = {
            name: document.getElementById('modalImageName').value,
            image_type: document.getElementById('modalImageType').value,
            type: document.getElementById('modalImageType').value.toUpperCase(),
            description: document.getElementById('modalDescriptionField').value
        };

        // Add character-specific fields
        if (isCharacter) {
            // Set role with both field names for compatibility
            const role = document.getElementById('modalCharacterRole').value;
            updatedAnalysis.character_role = role;
            updatedAnalysis.role = role;

            // Set traits with both field names for compatibility
            const traits = this.parseArrayField(document.getElementById('modalCharacterTraits').value);
            updatedAnalysis.character_traits = traits;
            updatedAnalysis.personality_traits = traits;

            // Set plot lines with both field names for compatibility
            const plotLines = this.parseArrayField(document.getElementById('modalPlotLines').value);
            updatedAnalysis.plot_lines = plotLines;
            updatedAnalysis.potential_plot_lines = plotLines;

            // Keep character_name consistent with name
            updatedAnalysis.character_name = updatedAnalysis.name;
        } else {
            // Add scene-specific fields
            updatedAnalysis.scene_type = document.getElementById('modalSceneType').value;
            updatedAnalysis.setting = document.getElementById('modalSceneSetting').value;
            updatedAnalysis.dramatic_moments = this.parseArrayField(document.getElementById('modalDramaticMoments').value);
        }

        //This section needs to be implemented to actually save the data
        //Example using fetch
        // fetch(`/api/images/${imageId}`, {
        //     method: 'PUT',
        //     headers: {
        //         'Content-Type': 'application/json'
        //     },
        //     body: JSON.stringify(updatedAnalysis)
        // })
        // .then(response => response.json())
        // .then(data => {
        //     // Handle successful update
        //     console.log('Analysis updated successfully:', data);
        // })
        // .catch(error => {
        //     // Handle errors
        //     console.error('Error updating analysis:', error);
        // });
    },

    /**
     * Populates the modal with image data from database
     * @param {Object} imageData - The full image data from the database
     * @param {number} imageId - The ID of the image
     */
    populateModalWithAnalysis(imageData, imageId) {
        if (!imageData || !imageId) {
            console.error('Missing image data or image ID');
            return;
        }

        // Store the current image ID
        this.currentImageId = imageId;

        // Get JSON editor - only display the analysis JSON, don't use it for form fields
        const analysisJsonEditor = document.getElementById('analysisJson');
        if (imageData.analysis) {
            const prettyJson = JSON.stringify(imageData.analysis, null, 2);
            analysisJsonEditor.value = prettyJson;
        }

        // Update form fields with database record fields, not analysis data
        this.populateFormFromDBRecord(imageData);

        // Show edit/save buttons
        document.getElementById('editAnalysisBtn').style.display = 'inline-block';
        document.getElementById('saveAnalysisBtn').style.display = 'none';
    },
    
    /**
     * Populates form fields from the actual database record
     * @param {Object} dbRecord - The database record for this image
     */
    populateFormFromDBRecord(dbRecord) {
        // Populate form fields with direct database columns, not from the analysis JSON
        document.getElementById('modalImageName').value = dbRecord.name || '';
        document.getElementById('modalImageType').value = dbRecord.image_type || 'character';
        document.getElementById('modalDescriptionField').value = dbRecord.description || '';

        // Show/hide appropriate fields
        this.toggleModalFieldsByType(dbRecord.image_type);

        if (dbRecord.image_type === 'character') {
            // Populate character fields from actual DB columns
            document.getElementById('modalCharacterRole').value = dbRecord.role || 'neutral';
            
            const traits = dbRecord.traits || [];
            document.getElementById('modalCharacterTraits').value = this.formatArrayField(traits);
            
            const plotLines = dbRecord.plot_lines || [];
            document.getElementById('modalPlotLines').value = this.formatArrayField(plotLines);
        } else {
            // Populate scene fields
            document.getElementById('modalSceneType').value = dbRecord.scene_type || 'action';
            document.getElementById('modalSceneSetting').value = dbRecord.setting || '';
            
            const dramaticMoments = dbRecord.dramatic_moments || [];
            document.getElementById('modalDramaticMoments').value = this.formatArrayField(dramaticMoments);
        }
    },
    toggleEditMode() {
        const isEditing = document.getElementById('analysisJson').getAttribute('contenteditable') === 'true';

        if (isEditing) {
            // Turn off editing
            document.getElementById('analysisJson').setAttribute('contenteditable', 'false');
            document.getElementById('editAnalysisBtn').textContent = 'Edit JSON';
            document.getElementById('saveAnalysisBtn').style.display = 'none';
        } else {
            // Turn on editing
            document.getElementById('analysisJson').setAttribute('contenteditable', 'true');
            document.getElementById('editAnalysisBtn').textContent = 'Cancel Edit';
            document.getElementById('saveAnalysisBtn').style.display = 'inline-block';
        }
    },

    updateFormFields(analysis) {
        // This method updates the form fields with new analysis data after reanalysis
        if (!analysis) return;

        try {
            // Update basic fields that might be in the modal form
            if (analysis.name) {
                const nameField = document.getElementById('character_name');
                if (nameField) nameField.value = analysis.name;
            }

            if (analysis.character_name) {
                const nameField = document.getElementById('character_name');
                if (nameField) nameField.value = analysis.character_name;
            }

            if (analysis.role) {
                const roleField = document.getElementById('character_role');
                if (roleField) roleField.value = analysis.role;
            }

            if (analysis.character_traits && Array.isArray(analysis.character_traits)) {
                const traitsField = document.getElementById('character_traits');
                if (traitsField) traitsField.value = analysis.character_traits.join(', ');
            }

            if (analysis.description) {
                const descField = document.getElementById('description');
                if (descField) descField.value = analysis.description;
            }

            // If it's a scene, populate scene fields
            if (analysis.setting) {
                const settingField = document.getElementById('setting');
                if (settingField) settingField.value = analysis.setting;
            }

            if (analysis.scene_type) {
                const sceneTypeField = document.getElementById('scene_type');
                if (sceneTypeField) sceneTypeField.value = analysis.scene_type;
            }
        } catch (error) {
            console.error('Error updating form fields:', error);
        }
    },
    //Helper functions (assume these are defined elsewhere or added as needed)
    toggleModalFieldsByType: function(type){},
    formatArrayField: function(arr){},
    parseArrayField: function(str){},
    toggleFormSections: function(isCharacter) {}
};