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
     * Populates the modal with analysis data
     * @param {Object} analysis - The analysis data
     * @param {number} imageId - The ID of the image
     */
    populateModalWithAnalysis(analysis, imageId) {
        // Set current image ID
        this.currentImageId = imageId;

        // Get image type
        const isCharacter = analysis.type === 'CHARACTER' || 
                           analysis.image_type === 'character';

        // Show the appropriate form sections
        this.toggleFormSections(isCharacter);

        // Populate common fields
        document.getElementById('modalImageId').value = imageId;
        document.getElementById('modalDescription').value = analysis.description || '';

        if (isCharacter) {
            // Populate character fields
            document.getElementById('modalCharacterName').value = analysis.name || analysis.character_name || '';

            // Handle traits
            const traits = analysis.personality_traits || analysis.character_traits || [];
            document.getElementById('modalCharacterTraits').value = Array.isArray(traits) ? 
                traits.join('\n') : traits;

            // Handle role
            document.getElementById('modalCharacterRole').value = analysis.role || analysis.character_role || 'undetermined';

            // Handle plot lines
            const plotLines = analysis.potential_plot_lines || analysis.plot_lines || [];
            document.getElementById('modalPlotLines').value = Array.isArray(plotLines) ? 
                plotLines.join('\n') : plotLines;

            // Handle backstory if it exists
            if (analysis.backstory) {
                const backstory = Array.isArray(analysis.backstory) ? 
                    analysis.backstory.join('\n') : analysis.backstory;
                document.getElementById('modalBackstory').value = backstory;
            }
        } else {
            // Populate scene fields
            document.getElementById('modalSceneType').value = analysis.scene_type || '';
            document.getElementById('modalSceneSetting').value = analysis.setting || '';

            // Handle dramatic moments
            const dramaticMoments = analysis.dramatic_moments || [];
            document.getElementById('modalDramaticMoments').value = Array.isArray(dramaticMoments) ? 
                dramaticMoments.join('\n') : dramaticMoments;
        }

        // Show the save button
        const saveButton = document.getElementById('saveAnalysisBtn');
        if (saveButton) saveButton.style.display = 'inline-block';
    },
    //Helper functions (assume these are defined elsewhere or added as needed)
    toggleModalFieldsByType: function(type){},
    formatArrayField: function(arr){},
    parseArrayField: function(str){},
    toggleFormSections: function(isCharacter) {}
};