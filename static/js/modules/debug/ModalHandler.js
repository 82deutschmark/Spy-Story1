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

            // Ensure the modal is fully initialized before adding event listeners
            detailsModal.addEventListener('shown.bs.modal', () => {
                // Add event listener to the edit mode switch
                const modalEditModeSwitch = document.getElementById('modalEditModeSwitch');
                if (modalEditModeSwitch) {
                    modalEditModeSwitch.addEventListener('change', this.enableEditMode.bind(this));
                    console.log('Added event listener to edit mode switch');
                }
            });
        }
        console.log('Modal handler initialized');
    },

    // Enable editing mode in the modal
    enableEditMode() {
        const editSwitch = document.getElementById('modalEditModeSwitch');
        const modalContent = document.getElementById('modalContent');

        console.log('Enable edit mode triggered, checked:', editSwitch.checked);

        if (editSwitch.checked) {
            // Make the text area editable
            modalContent.setAttribute('contenteditable', 'true');
            modalContent.classList.add('editable-content');
            console.log('Made content editable');

            // Show save button
            document.getElementById('saveAnalysisBtn').style.display = 'block';
        } else {
            // Turn off editing
            modalContent.setAttribute('contenteditable', 'false');
            modalContent.classList.remove('editable-content');

            // Hide save button
            document.getElementById('saveAnalysisBtn').style.display = 'none';
        }
    },

    // Save edited analysis from modal
    saveAnalysis() {
        const modalContent = document.getElementById('modalContent');
        const currentId = modalContent.getAttribute('data-id');

        try {
            // Get the content as text first
            let contentText = modalContent.textContent.trim();

            // Log for debugging purposes
            console.log('Saving content:', contentText);

            // Try to parse the JSON content
            const jsonContent = JSON.parse(contentText);

            console.log('Parsed JSON:', jsonContent);

            // Send the updated content to the server
            DebugAPI.put(`/debug/images/${currentId}`, {
                analysis: jsonContent
            })
            .then(response => {
                if (response.success) {
                    // Show success message
                    DebugUtils.showToast('Success', 'Analysis saved successfully');

                    // Reset edit mode
                    document.getElementById('modalEditModeSwitch').checked = false;
                    this.enableEditMode();

                    // Refresh the image list
                    document.dispatchEvent(new CustomEvent('refreshImages'));
                } else {
                    // Show error message
                    DebugUtils.showToast('Error', response.error || 'Failed to save analysis', true);
                }
            });
        } catch (error) {
            // Show error if JSON is invalid
            DebugUtils.showToast('Error', 'Invalid JSON format. Please check your edits.', true);
            console.error('JSON parse error:', error);

            // Display more detailed error information for debugging
            console.error('Error details:', error.message);
            console.error('Error position:', error.stack);
        }
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
    saveImageData(imageId, updatedAnalysis) {
        const imageData = {
            analysis: updatedAnalysis
        };

        console.log('Saving image data:', imageData);

        // Call API to update image
        fetch(`/debug/images/${imageId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(imageData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Show success message
                DebugUtils.showToast('Success', 'Image updated successfully');

                // Refresh the image list to show the updated data
                document.getElementById('refreshImagesBtn').click();

                // Close the modal
                const modalElement = document.getElementById('detailsModal');
                const modal = bootstrap.Modal.getInstance(modalElement);
                if (modal) {
                    modal.hide();
                }
            } else {
                DebugUtils.showToast('Error', data.error || 'Failed to update image', true);
            }
        })
        .catch(error => {
            console.error('Error saving image:', error);
            DebugUtils.showToast('Error', 'Failed to update image: ' + error.message, true);
        });
    },
    //Helper functions (assume these are defined elsewhere or added as needed)
    toggleModalFieldsByType: function(type){},
    formatArrayField: function(arr){},
    parseArrayField: function(str){},
    toggleFormSections: function(isCharacter) {}
};