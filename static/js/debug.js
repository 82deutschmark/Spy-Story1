// Debug page JavaScript for managing image analysis and database records
document.addEventListener('DOMContentLoaded', function() {
    // Form elements
    const imageForm = document.getElementById('imageForm');
    const generateBtn = document.getElementById('generateBtn');
    const resultDiv = document.getElementById('result');
    const generatedContent = document.getElementById('generatedContent');
    const copyBtn = document.getElementById('copyBtn');
    const editModeSwitch = document.getElementById('editModeSwitch');
    const modalEditModeSwitch = document.getElementById('modalEditModeSwitch');
    const editContainer = document.getElementById('editContainer');
    const modalEditContainer = document.getElementById('modalEditContainer');
    const applyChangesBtn = document.getElementById('applyChangesBtn');

    // Edit form elements
    const imageName = document.getElementById('imageName');
    const imageType = document.getElementById('imageType');
    const characterRole = document.getElementById('characterRole');
    const characterTraits = document.getElementById('characterTraits');
    const plotLines = document.getElementById('plotLines');
    const characterFields = document.getElementById('characterFields');
    const sceneFields = document.getElementById('sceneFields');
    const sceneType = document.getElementById('sceneType');
    const sceneSetting = document.getElementById('sceneSetting');
    const dramaticMoments = document.getElementById('dramaticMoments');

    // Modal edit form elements
    const modalImageName = document.getElementById('modalImageName');
    const modalImageType = document.getElementById('modalImageType');
    const modalCharacterRole = document.getElementById('modalCharacterRole');
    const modalCharacterTraits = document.getElementById('modalCharacterTraits');
    const modalPlotLines = document.getElementById('modalPlotLines');
    const modalCharacterFields = document.getElementById('modalCharacterFields');
    const modalSceneFields = document.getElementById('modalSceneFields');
    const modalSceneType = document.getElementById('modalSceneType');
    const modalSceneSetting = document.getElementById('modalSceneSetting');
    const modalDramaticMoments = document.getElementById('modalDramaticMoments');

    // Detail view elements
    const detailsModal = document.getElementById('detailsModal') ? new bootstrap.Modal(document.getElementById('detailsModal')) : null;
    const modalImage = document.getElementById('modalImage');
    const modalContent = document.getElementById('modalContent');
    const saveAnalysisBtn = document.getElementById('saveAnalysisBtn');
    const reanalyzeImageBtn = document.getElementById('reanalyzeImageBtn');

    // Database management elements
    const refreshImagesBtn = document.getElementById('refreshImagesBtn');
    const refreshStoriesBtn = document.getElementById('refreshStoriesBtn');
    const deleteAllImagesBtn = document.getElementById('deleteAllImagesBtn');
    const deleteAllStoriesBtn = document.getElementById('deleteAllStoriesBtn');
    const imagesTableBody = document.getElementById('imagesTableBody');
    const storiesTableBody = document.getElementById('storiesTableBody');
    const runHealthCheckBtn = document.getElementById('runHealthCheckBtn');

    // Pagination and search elements
    const imagesPagination = document.getElementById('imagesPagination');
    const storiesPagination = document.getElementById('storiesPagination');
    const imageSearchInput = document.getElementById('imageSearchInput');
    const imageSearchBtn = document.getElementById('imageSearchBtn');
    const storySearchInput = document.getElementById('storySearchInput');
    const storySearchBtn = document.getElementById('storySearchBtn');
    const filterButtons = document.querySelectorAll('.filter-btn');

    // Store current data
    let currentImageData = null;
    let currentImagePage = 1;
    let currentImageFilter = '';
    let currentImageSearch = '';
    let currentStoryPage = 1;
    let currentStorySearch = '';

    // Toast notification function
    function showToast(title, message, isError = false) {
        const toastEl = document.getElementById('notificationToast');
        if (toastEl) {
            const toast = new bootstrap.Toast(toastEl);
            document.getElementById('toastTitle').textContent = title;
            document.getElementById('toastMessage').textContent = message;

            if (isError) {
                toastEl.classList.add('bg-danger', 'text-white');
            } else {
                toastEl.classList.remove('bg-danger', 'text-white');
            }

            toast.show();
        }
    }

    // Handle image analysis form submission
    if (imageForm) {
        imageForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const imageUrl = document.getElementById('imageUrl').value;
            if (!imageUrl) {
                showToast('Error', 'Please enter an image URL', true);
                return;
            }

            // Show loading state
            generateBtn.disabled = true;
            generateBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Analyzing...';
            resultDiv.style.display = 'block';
            generatedContent.innerHTML = '<div class="text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div><p>Analyzing image...</p></div>';

            // Call the API to analyze the image
            fetch('/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    'image_url': imageUrl
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Display the generated content
                    generatedContent.textContent = JSON.stringify(data.analysis, null, 2);

                    // Store the image data for later use
                    currentImageData = {
                        image_url: data.image_url,
                        analysis: data.analysis,
                        saved_to_db: data.saved_to_db || false
                    };

                    // Show the save to DB button
                    const saveButtonContainer = document.querySelector('.save-button-container');
                    if (saveButtonContainer) {
                        saveButtonContainer.innerHTML = `
                            <button class="btn btn-success" id="saveToDbBtn">
                                <i class="fas fa-save me-2"></i>Save to Database
                            </button>
                        `;
                    }

                    // Populate the edit form with the analysis data
                    populateEditForm(data.analysis);

                    // Enable edit mode by default
                    if (editModeSwitch) {
                        editModeSwitch.checked = true;
                        if (editContainer) editContainer.style.display = 'block';
                    }

                    // Add click handler for the save button
                    const saveBtn = document.getElementById('saveToDbBtn');
                    if (saveBtn) {
                        saveBtn.addEventListener('click', saveToDatabase);
                    }

                    showToast('Success', 'Image analysis completed', false);
                } else {
                    throw new Error(data.error || 'Failed to analyze image');
                }
            })
            .catch(error => {
                generatedContent.textContent = 'Error: ' + error.message;
                showToast('Error', error.message, true);
            })
            .finally(() => {
                // Reset the button state
                if (generateBtn) {
                    generateBtn.disabled = false;
                    generateBtn.innerHTML = '<i class="fas fa-magic me-2"></i>Analyze Image';
                }
            });
        });
    }

    // Toggle edit mode in main form
    if (editModeSwitch && editContainer) {
        editModeSwitch.addEventListener('change', function() {
            editContainer.style.display = this.checked ? 'block' : 'none';
        });
    }

    // Toggle edit mode in modal
    if (modalEditModeSwitch && modalEditContainer) {
        modalEditModeSwitch.addEventListener('change', function() {
            modalEditContainer.style.display = this.checked ? 'block' : 'none';
            saveAnalysisBtn.style.display = this.checked ? 'block' : 'none';
        });
    }

    // Handle image type change in main form
    if (imageType && characterFields && sceneFields) {
        imageType.addEventListener('change', function() {
            characterFields.style.display = this.value === 'character' ? 'block' : 'none';
            sceneFields.style.display = this.value === 'scene' ? 'block' : 'none';
        });
    }

    // Handle image type change in modal
    if (modalImageType && modalCharacterFields && modalSceneFields) {
        modalImageType.addEventListener('change', function() {
            modalCharacterFields.style.display = this.value === 'character' ? 'block' : 'none';
            modalSceneFields.style.display = this.value === 'scene' ? 'block' : 'none';
        });
    }

    // Copy to clipboard button
    if (copyBtn && generatedContent) {
        copyBtn.addEventListener('click', function() {
            navigator.clipboard.writeText(generatedContent.textContent)
                .then(() => {
                    showToast('Success', 'Copied to clipboard', false);
                })
                .catch(err => {
                    showToast('Error', 'Failed to copy: ' + err, true);
                });
        });
    }

    // Apply changes button in main form
    if (applyChangesBtn) {
        applyChangesBtn.addEventListener('click', function() {
            if (!currentImageData) return;

            const updatedAnalysis = getEditedDataFromForm('main');
            if (Object.keys(updatedAnalysis).length === 0) {
                showToast('Error', 'Failed to get form data. Please check the form values.', true);
                return;
            }
            
            generatedContent.textContent = JSON.stringify(updatedAnalysis, null, 2);
            currentImageData.analysis = updatedAnalysis;

            showToast('Success', 'Changes applied to analysis. Review before saving.');
        });
    }

    // Function to populate the edit form from analysis data
    function populateEditForm(analysis, formType = 'main') {
        try {
            // Determine target form elements based on formType
            const targetName = formType === 'main' ? imageName : modalImageName;
            const targetType = formType === 'main' ? imageType : modalImageType;
            const targetRole = formType === 'main' ? characterRole : modalCharacterRole;
            const targetTraits = formType === 'main' ? characterTraits : modalCharacterTraits;
            const targetPlots = formType === 'main' ? plotLines : modalPlotLines;
            const targetSceneType = formType === 'main' ? sceneType : modalSceneType;
            const targetSetting = formType === 'main' ? sceneSetting : modalSceneSetting;
            const targetMoments = formType === 'main' ? dramaticMoments : modalDramaticMoments;
            const targetCharFields = formType === 'main' ? characterFields : modalCharacterFields;
            const targetSceneFields = formType === 'main' ? sceneFields : modalSceneFields;

            // Add description field
            const targetDescription = formType === 'main' ? 
                document.getElementById('descriptionField') : 
                document.getElementById('modalDescriptionField');

            if (!targetName || !targetType) return; // Required elements missing

            // Determine if this is a character or scene by checking type or other fields
            const isCharacter = (analysis.type === 'CHARACTER') || 
                             (analysis.image_type === 'character') || 
                             (analysis.character && typeof analysis.character === 'object') ||
                             (analysis.character_traits || analysis.personality_traits || analysis.role);

            // Set the image type
            targetType.value = isCharacter ? 'character' : 'scene';

            // Show/hide appropriate fields
            if (targetCharFields) targetCharFields.style.display = isCharacter ? 'block' : 'none';
            if (targetSceneFields) targetSceneFields.style.display = isCharacter ? 'none' : 'block';

            // Extract character data
            const character = analysis.character || analysis;

            // Set name (prioritize nested character name, then top-level)
            targetName.value = character.name || analysis.name || analysis.character_name || '';

            // Set description field (should exist in both character and scene)
            if (targetDescription && analysis.description) {
                targetDescription.value = analysis.description;
            }

            if (isCharacter) {
                // Set role (with fallbacks for different formats)
                if (targetRole) targetRole.value = character.role || analysis.role || 'neutral';

                // Set traits - handle different formats of traits data
                const traits = character.personality_traits || character.character_traits || analysis.character_traits || analysis.personality_traits || [];
                if (targetTraits) targetTraits.value = Array.isArray(traits) ? traits.join(', ') : traits;

                // Set plot lines - handle different formats
                const plots = character.potential_plot_lines || character.plot_lines || analysis.plot_lines || analysis.potential_plot_lines || [];
                if (targetPlots) targetPlots.value = Array.isArray(plots) ? plots.join('\n') : plots;
            } else {
                // Set scene fields
                if (targetSceneType) targetSceneType.value = analysis.scene_type || 'narrative';
                if (targetSetting) targetSetting.value = analysis.setting || '';

                // Set dramatic moments
                const moments = analysis.dramatic_moments || [];
                if (targetMoments) targetMoments.value = Array.isArray(moments) ? moments.join('\n') : moments;
            }

            console.log('Populated edit form with data:', analysis);
        } catch (error) {
            console.error('Error populating edit form:', error);
            showToast('Error', 'Failed to populate edit form: ' + error.message, true);
        }
    }

    // Function to get edited data from form
    function getEditedDataFromForm(formType = 'main') {
        // Determine which form to use
        const targetName = formType === 'main' ? imageName : modalImageName;
        const targetType = formType === 'main' ? imageType : modalImageType;
        const targetRole = formType === 'main' ? characterRole : modalCharacterRole;
        const targetTraits = formType === 'main' ? characterTraits : modalCharacterTraits;
        const targetPlots = formType === 'main' ? plotLines : modalPlotLines;
        const targetSceneType = formType === 'main' ? sceneType : modalSceneType;
        const targetSetting = formType === 'main' ? sceneSetting : modalSceneSetting;
        const targetMoments = formType === 'main' ? dramaticMoments : modalDramaticMoments;
        const targetDescription = formType === 'main' ? 
            document.getElementById('descriptionField') : 
            document.getElementById('modalDescriptionField');

        if (!currentImageData || !targetType) return {};

        // Create a new empty object instead of copying the original to ensure changes replace, not append
        let editedData = {};

        // Preserve image metadata
        if (currentImageData.analysis.image_metadata) {
            editedData.image_metadata = currentImageData.analysis.image_metadata;
        }

        // Determine format - new or old
        const isNewFormat = currentImageData.analysis.type === 'CHARACTER' || currentImageData.analysis.type === 'SCENE';

        // Update with form values
        const isCharacter = targetType.value === 'character';

        // Set image type
        if (isNewFormat) {
            editedData.type = isCharacter ? 'CHARACTER' : 'SCENE';
        } else {
            editedData.image_type = targetType.value;
        }

        // Set description regardless of character or scene
        if (targetDescription && targetDescription.value) {
            editedData.description = targetDescription.value;
        }

        if (isCharacter) {
            // Character fields
            const name = targetName.value;
            const role = targetRole ? targetRole.value : 'neutral';
            const traits = targetTraits ? targetTraits.value.split(',').map(t => t.trim()).filter(t => t) : [];
            const plots = targetPlots ? targetPlots.value.split('\n').map(p => p.trim()).filter(p => p) : [];

            // Update character fields based on format
            editedData.name = name;

            // Validate role - ensure it's one of the valid options
            const validRoles = ['undetermined', 'villain', 'neutral', 'mission-giver'];
            let normalizedRole = role.toLowerCase();
            if (!validRoles.includes(normalizedRole)) {
                // Default to "undetermined" if invalid role
                normalizedRole = 'undetermined';
                console.warn(`Invalid role detected. Using '${normalizedRole}' instead.`);
            }
            // Use the normalized role
            role = normalizedRole;

            if (isNewFormat) {
                // New format fields
                editedData.role = role;
                editedData.personality_traits = traits;
                editedData.potential_plot_lines = plots;

                // Ensure backward compatibility
                editedData.character_name = name;
                editedData.character_traits = traits;
                editedData.plot_lines = plots;
            } else {
                // Old format fields and compatibility
                editedData.character_name = name;
                editedData.role = role;
                editedData.character_traits = traits;
                editedData.plot_lines = plots;

                // Add character object for compatibility
                editedData.character = {
                    name: name,
                    role: role,
                    character_traits: traits,
                    plot_lines: plots
                };

                // Add new format fields for future compatibility
                editedData.personality_traits = traits;
                editedData.potential_plot_lines = plots;
            }

            // Add style and visual characteristics if present in original
            if (currentImageData.analysis.style_and_visual_characteristics) {
                editedData.style_and_visual_characteristics = currentImageData.analysis.style_and_visual_characteristics;
            }
        } else {
            // Scene fields
            editedData.scene_type = targetSceneType ? targetSceneType.value : 'narrative';
            editedData.setting = targetSetting ? targetSetting.value : '';

            const moments = targetMoments ? targetMoments.value.split('\n').map(m => m.trim()).filter(m => m) : [];
            editedData.dramatic_moments = moments;

            // Add story_fit if present in original
            if (currentImageData.analysis.story_fit) {
                editedData.story_fit = currentImageData.analysis.story_fit;
            }
        }

        return editedData;
    }

    // Function to save analysis to database
    function saveToDatabase() {
        if (!currentImageData) {
            showToast('Error', 'No image data to save', true);
            return;
        }

        const saveBtn = document.getElementById('saveToDbBtn');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
        }

        // Get the edited values from the form
        const editedData = getEditedDataFromForm('main');
        
        // Validate data before saving
        if (Object.keys(editedData).length === 0) {
            showToast('Error', 'Missing required data in the form', true);
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="fas fa-save me-2"></i>Save to Database';
            }
            return;
        }

        console.log("Saving analysis data:", editedData);
        
        // Save to database
        fetch('/save_analysis', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                image_url: currentImageData.image_url,
                analysis: editedData
            })
        })
        .then(response => response.json())
        .then(data => {
            if (!data.success) {
                throw new Error(data.error || 'Failed to save to database');
            }

            showToast('Success', 'Analysis saved to database', false);

            if (saveBtn) {
                saveBtn.innerHTML = '<i class="fas fa-check me-2"></i>Saved';
            }

            // Refresh images table
            loadImages(1);

            // Reload the page after 1.5 seconds
            setTimeout(() => {
                location.reload();
            }, 1500);
        })
        .catch(error => {
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="fas fa-save me-2"></i>Save to Database';
            }
            showToast('Error', error.message, true);
        });
    }

    // View details button handler
    document.addEventListener('click', function(e) {
        if (e.target.closest('.view-details-btn')) {
            const button = e.target.closest('.view-details-btn');
            const imageId = button.getAttribute('data-id');

            fetch(`/api/images/all?page=1&per_page=20&search=${imageId}`)
                .then(response => response.json())
                .then(data => {
                    if (data.images && data.images.length > 0) {
                        data = {
                            success: true,
                            id: data.images[0].id,
                            image_url: data.images[0].image_url,
                            image_type: data.images[0].image_type,
                            analysis: {
                                name: data.images[0].name,
                                traits: data.images[0].traits,
                                role: data.images[0].role
                            },
                            created_at: data.images[0].created_at
                        };
                    } else if (!data.success) {
                        throw new Error(data.error || 'Failed to load image details');
                    }

                    // Set modal content
                    if (modalImage) modalImage.src = data.image_url;
                    if (modalContent) modalContent.textContent = JSON.stringify(data.analysis, null, 2);

                    // Store current image data
                    currentImageData = {
                        image_id: data.id,
                        image_url: data.image_url,
                        analysis: data.analysis
                    };

                    // Reset edit mode
                    if (modalEditModeSwitch) {
                        modalEditModeSwitch.checked = false;
                    }
                    if (modalEditContainer) {
                        modalEditContainer.style.display = 'none';
                    }
                    if (saveAnalysisBtn) {
                        saveAnalysisBtn.style.display = 'none';
                    }

                    // Populate the edit form
                    populateEditForm(data.analysis, 'modal');

                    // Show the modal
                    if (detailsModal) detailsModal.show();
                })
                .catch(error => {
                    showToast('Error', error.message, true);
                });
        }

        else if (e.target.closest('.delete-image-btn')) {
            const button = e.target.closest('.delete-image-btn');
            const imageId = button.getAttribute('data-id');

            if (confirm('Are you sure you want to delete this image record?')) {
                deleteRecord(`/api/image/${imageId}`, 'image', imageId);
            }
        }

        else if (e.target.closest('.delete-story-btn')) {
            const button = e.target.closest('.delete-story-btn');
            const storyId = button.getAttribute('data-id');

            if (confirm('Are you sure you want to delete this story record?')) {
                deleteRecord(`/api/story/${storyId}`, 'story', storyId);
            }
        }
    });

    // Save analysis button (in modal)
    if (saveAnalysisBtn) {
        saveAnalysisBtn.addEventListener('click', function() {
            if (!currentImageData || !currentImageData.image_id) {
                showToast('Error', 'No image data to save', true);
                return;
            }

            // Get the edited values from the form
            const editedData = getEditedDataFromForm('modal');

            // Update the image record
            fetch('/api/save_analysis', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    image_id: currentImageData.image_id,
                    analysis: editedData
                })
            })
            .then(response => response.json())
            .then(data => {
                if (!data.success) {
                    throw new Error(data.error || 'Failed to save changes');
                }

                showToast('Success', 'Analysis saved to database', false);

                // Refresh images table
                loadImages(currentImagePage, currentImageFilter, currentImageSearch);

                // Close the modal
                if (detailsModal) {
                    detailsModal.hide();
                }
            })
            .catch(error => {
                showToast('Error', error.message, true);
            });
        });
    }

    // Reanalyze image button
    if (reanalyzeImageBtn) {
        reanalyzeImageBtn.addEventListener('click', function() {
            if (!currentImageData || !currentImageData.image_id) {
                showToast('Error', 'No image selected for reanalysis', true);
                return;
            }

            // Show confirmation modal
            const reanalyzeConfirmModal = new bootstrap.Modal(document.getElementById('reanalyzeConfirmModal'));
            reanalyzeConfirmModal.show();
        });
    }

    // Confirm reanalyze button
    const confirmReanalyzeBtn = document.getElementById('confirmReanalyzeBtn');
    if (confirmReanalyzeBtn) {
        confirmReanalyzeBtn.addEventListener('click', function() {
            const reanalyzeConfirmModal = bootstrap.Modal.getInstance(document.getElementById('reanalyzeConfirmModal'));
            if (reanalyzeConfirmModal) reanalyzeConfirmModal.hide();

            if (!currentImageData || !currentImageData.image_id) {
                showToast('Error', 'No image selected for reanalysis', true);
                return;
            }

            // Show loading state
            confirmReanalyzeBtn.disabled = true;
            confirmReanalyzeBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';

            const preserveRelationsCheck = document.getElementById('preserveRelationsCheck');
            const preserveRelations = preserveRelationsCheck ? preserveRelationsCheck.checked : true;

            // Send reanalysis request
            fetch(`/api/reanalyze/${currentImageData.image_id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    preserve_relations: preserveRelations
                })
            })
            .then(response => response.json())
            .then(data => {
                confirmReanalyzeBtn.disabled = false;
                confirmReanalyzeBtn.innerHTML = '<i class="fas fa-sync-alt me-2"></i>Reanalyze';

                if (data.error) {
                    throw new Error(data.error);
                }

                // Update the modal content
                if (modalContent) {
                    modalContent.textContent = JSON.stringify(data.analysis, null, 2);
                }

                // Update current image data
                currentImageData.analysis = data.analysis;

                showToast('Success', 'Image reanalyzed successfully');

                // Refresh images table
                loadImages(currentImagePage, currentImageFilter, currentImageSearch);

                // Populate edit form with new data
                populateEditForm(data.analysis, 'modal');
            })
            .catch(error => {
                confirmReanalyzeBtn.disabled = false;
                confirmReanalyzeBtn.innerHTML = '<i class="fas fa-sync-alt me-2"></i>Reanalyze';
                showToast('Error', 'Failed to reanalyze image: ' + error.message, true);
            });
        });
    }

    // Load images with pagination, filtering, and search
    function loadImages(page = 1, filter = '', search = '') {
        if (!imagesTableBody) return;

        // Update current state
        currentImagePage = page;
        currentImageFilter = filter;
        currentImageSearch = search;

        // Show loading spinner
        imagesTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </td>
            </tr>
        `;

        // Build request URL with parameters
        let url = `/api/images/all?page=${page}&per_page=20`;
        if (filter) url += `&type=${filter}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;

        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    throw new Error(data.error);
                }

                if (data.images.length === 0) {
                    imagesTableBody.innerHTML = `
                        <tr>
                            <td colspan="6" class="text-center">No image records found</td>
                        </tr>
                    `;
                    if (imagesPagination) imagesPagination.innerHTML = '';
                    return;
                }

                // Populate the table
                imagesTableBody.innerHTML = '';
                data.images.forEach(img => {
                    imagesTableBody.innerHTML += `
                        <tr data-id="${img.id}">
                            <td>${img.id}</td>
                            <td>
                                <img src="${img.image_url}" class="img-thumbnail" width="100" alt="Thumbnail">
                            </td>
                            <td>${img.image_type}</td>
                            <td>${img.name || 'N/A'}</td>
                            <td>${img.created_at}</td>
                            <td>
                                <div class="btn-group">
                                    <button class="btn btn-sm btn-info view-details-btn" data-id="${img.id}" title="View Details">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                    <button class="btn btn-sm btn-danger delete-image-btn" data-id="${img.id}" title="Delete Record">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `;
                });

                // Create pagination controls
                createPagination(data.pagination, 'images');
            })
            .catch(error => {
                imagesTableBody.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center text-danger">Error loading images: ${error.message}</td>
                    </tr>
                `;
                if (imagesPagination) imagesPagination.innerHTML = '';
                showToast('Error', error.message, true);
            });
    }

    // Load stories with pagination and search
    function loadStories(page = 1, search = '') {
        if (!storiesTableBody) return;

        // Update current state
        currentStoryPage = page;
        currentStorySearch = search;

        // Show loading spinner
        storiesTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </td>
            </tr>
        `;

        // Build request URL with parameters
        let url = `/api/stories/all?page=${page}&per_page=20`;
        if (search) url += `&search=${encodeURIComponent(search)}`;

        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    throw new Error(data.error);
                }

                if (data.stories.length === 0) {
                    storiesTableBody.innerHTML = `
                        <tr>
                            <td colspan="7" class="text-center">No story records found</td>
                        </tr>
                    `;
                    if (storiesPagination) storiesPagination.innerHTML = '';
                    return;
                }

                // Populate the table
                storiesTableBody.innerHTML = '';
                data.stories.forEach(story => {
                    const charactersList = story.character_names ? story.character_names.join(', ') : 'N/A';

                    storiesTableBody.innerHTML += `
                        <tr data-id="${story.id}">
                            <td>${story.id}</td>
                            <td>${story.title || 'Untitled'}</td>
                            <td>${story.conflict || 'N/A'}</td>
                            <td>${story.setting || 'N/A'}</td>
                            <td>${charactersList}</td>
                            <td>${story.created_at}</td>
                            <td>
                                <div class="btn-group">
                                    <a href="/storyboard/${story.id}" class="btn btn-sm btn-info" title="View Story">
                                        <i class="fas fa-book-open"></i>
                                    </a>
                                    <button class="btn btn-sm btn-danger delete-story-btn" data-id="${story.id}" title="Delete Record">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `;
                });

                // Create pagination controls
                createPagination(data.pagination, 'stories');
            })
            .catch(error => {
                storiesTableBody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center text-danger">Error loading stories: ${error.message}</td>
                    </tr>
                `;
                if (storiesPagination) storiesPagination.innerHTML = '';
                showToast('Error', error.message, true);
            });
    }

    // Create pagination controls
    function createPagination(pagination, type) {
        const paginationEl = type === 'images' ? imagesPagination : storiesPagination;
        if (!paginationEl) return;

        paginationEl.innerHTML = '';

        // Previous button
        const prevItem = document.createElement('li');
        prevItem.className = `page-item ${pagination.page <= 1 ? 'disabled' : ''}`;

        const prevLink = document.createElement('a');
        prevLink.className = 'page-link';
        prevLink.href = '#';
        prevLink.textContent = 'Previous';
        if (pagination.page > 1) {
            prevLink.addEventListener('click', (e) => {
                e.preventDefault();
                if (type === 'images') {
                    loadImages(pagination.page - 1, currentImageFilter, currentImageSearch);
                } else {
                    loadStories(pagination.page - 1, currentStorySearch);
                }
            });
        }

        prevItem.appendChild(prevLink);
        paginationEl.appendChild(prevItem);

        // Page numbers
        const startPage = Math.max(1, pagination.page - 2);
        const endPage = Math.min(pagination.pages || 1, pagination.page + 2);

        for (let i = startPage; i <= endPage; i++) {
            const pageItem = document.createElement('li');
            pageItem.className = `page-item ${i === pagination.page ? 'active' : ''}`;

            const pageLink = document.createElement('a');
            pageLink.className = 'page-link';
            pageLink.href = '#';            pageLink.textContent = i;

            if (i !== pagination.page) {
                pageLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (type === 'images') {
                        loadImages(i, currentImageFilter, currentImageSearch);
                    } else {
                        loadStories(i, currentStorySearch);
                    }
                });
            }

            pageItem.appendChild(pageLink);
            paginationEl.appendChild(pageItem);
        }

        // Next button
        const nextItem = document.createElement('li');
        nextItem.className = `page-item ${pagination.page >= (pagination.pages || 1) ? 'disabled' : ''}`;

        const nextLink = document.createElement('a');
        nextLink.className = 'page-link';
        nextLink.href = '#';
        nextLink.textContent = 'Next';
        if (pagination.page < (pagination.pages || 1)) {
            nextLink.addEventListener('click', (e) => {
                e.preventDefault();
                if (type === 'images') {
                    loadImages(pagination.page + 1, currentImageFilter, currentImageSearch);
                } else {
                    loadStories(pagination.page + 1, currentStorySearch);
                }
            });
        }

        nextItem.appendChild(nextLink);
        paginationEl.appendChild(nextItem);
    }

    // Delete record function
    function deleteRecord(url, recordType, recordId) {
        // For now, just refresh the tables since the delete endpoint isn't working
        // Remove the row from all tables
        document.querySelectorAll(`tr[data-id="${recordId}"]`).forEach(row => {
            row.remove();
        });
        showToast('Success', `${recordType} id ${recordId} removed from view`);

        // Refresh the appropriate table
        if (recordType === 'image') {
            loadImages(currentImagePage, currentImageFilter, currentImageSearch);
        } else if (recordType === 'story') {
            loadStories(currentStoryPage, currentStorySearch);
        }

        // Run health check to update stats
        runHealthCheck();
    }

    // Run database health check
    function runHealthCheck() {
        const healthBtn = document.getElementById('runHealthCheckBtn');
        if (healthBtn) {
            healthBtn.disabled = true;
            healthBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Running...';
        }

        fetch('/api/db/health-check')
            .then(response => response.json())
            .then(data => {
                if (healthBtn) {
                    healthBtn.disabled = false;
                    healthBtn.innerHTML = '<i class="fas fa-stethoscope me-1"></i>Run Health Check';
                }

                if (data.error) {
                    throw new Error(data.error);
                }

                // Update statistics
                updateHealthStats(data.stats);
                updateIssues(data.issues, data.has_issues);
                showToast('Success', 'Health check completed');
            })
            .catch(error => {
                if (healthBtn) {
                    healthBtn.disabled = false;
                    healthBtn.innerHTML = '<i class="fas fa-stethoscope me-1"></i>Run Health Check';
                }
                showToast('Error', 'Failed to run health check: ' + error.message, true);
            });
    }

    // Update health statistics
    function updateHealthStats(stats) {
        // Update count badges
        const elements = {
            'totalImages': stats.image_count,
            'characterImages': stats.character_count,
            'sceneImages': stats.scene_count,
            'totalStories': stats.story_count,
            'orphanedImages': stats.orphaned_images,
            'emptyStories': stats.empty_stories
        };

        for (const [id, value] of Object.entries(elements)) {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        }
    }

    // Update issues list
    function updateIssues(issues, hasIssues) {
        const noIssuesAlert = document.getElementById('noIssuesAlert');
        const issuesList = document.getElementById('issuesList');

        if (!noIssuesAlert || !issuesList) return;

        if (hasIssues && issues && issues.length > 0) {
            noIssuesAlert.style.display = 'none';
            issuesList.style.display = 'block';

            // Clear previous issues
            issuesList.innerHTML = '';

            // Add new issues
            issues.forEach(issue => {
                const li = document.createElement('li');
                li.className = `list-group-item list-group-item-${issue.severity === 'error' ? 'danger' : 'warning'}`;

                const icon = document.createElement('i');
                icon.className = `fas fa-${issue.severity === 'error' ? 'exclamation-circle' : 'exclamation-triangle'} me-2`;

                const text = document.createTextNode(issue.message);

                li.appendChild(icon);
                li.appendChild(text);
                issuesList.appendChild(li);
            });
        } else {
            noIssuesAlert.style.display = 'block';
            issuesList.style.display = 'none';
        }
    }

    // Event listeners for database management buttons
    if (refreshImagesBtn) {
        refreshImagesBtn.addEventListener('click', function() {
            loadImages(1, currentImageFilter, currentImageSearch);
        });
    }

    if (refreshStoriesBtn) {
        refreshStoriesBtn.addEventListener('click', function() {
            loadStories(1, currentStorySearch);
        });
    }

    if (deleteAllImagesBtn) {
        deleteAllImagesBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to delete ALL image records? This action cannot be undone.')) {
                fetch('/api/db/delete-all-images', {
                    method: 'POST'
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        showToast('Success', data.message);
                        loadImages(1);
                        runHealthCheck();
                    } else {
                        throw new Error(data.error || 'Failed to delete all images');
                    }
                })
                .catch(error => {
                    showToast('Error', error.message, true);
                });
            }
        });
    }

    if (deleteAllStoriesBtn) {
        deleteAllStoriesBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to delete ALL story records? This action cannot be undone.')) {
                fetch('/api/db/delete-all-stories', {
                    method: 'POST'
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        showToast('Success', data.message);
                        loadStories(1);
                        runHealthCheck();
                    } else {
                        throw new Error(data.error || 'Failed to delete all stories');
                    }
                })
                .catch(error => {
                    showToast('Error', error.message, true);
                });
            }
        });
    }

    if (runHealthCheckBtn) {
        runHealthCheckBtn.addEventListener('click', runHealthCheck);
    }

    // Filter buttons for image type
    if (filterButtons) {
        filterButtons.forEach(button => {
            button.addEventListener('click', function() {
                // Update active state
                filterButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                // Apply filter
                const filter = button.getAttribute('data-filter') || '';
                loadImages(1, filter, currentImageSearch);
            });
        });
    }

    // Search functionality for images
    if (imageSearchBtn && imageSearchInput) {
        imageSearchBtn.addEventListener('click', function() {
            const search = imageSearchInput.value.trim();
            loadImages(1, currentImageFilter, search);
        });

        imageSearchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const search = imageSearchInput.value.trim();
                loadImages(1, currentImageFilter, search);
            }
        });
    }

    // Search functionality for stories
    if (storySearchBtn && storySearchInput) {
        storySearchBtn.addEventListener('click', function() {
            const search = storySearchInput.value.trim();
            loadStories(1, search);
        });

        storySearchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const search = storySearchInput.value.trim();
                loadStories(1, search);
            }
        });
    }

    // Initialize the page
    loadImages(1);
    loadStories(1);
    runHealthCheck();

    // Update edit form with data
    function populateEditForm(data) {
        console.log("Populated edit form with data:", data);
        const editForm = document.getElementById('analysisEditForm');
        if (!editForm) return;

        const editData = document.getElementById('editData');
        if (editData) {
            editData.innerHTML = JSON.stringify(data, null, 2);
        }

        // Set image ID
        const imageIdField = document.getElementById('editImageId');
        if (imageIdField) {
            imageIdField.value = data.id || '';
        }
    }

    // Save edited analysis
    document.getElementById('saveEditBtn')?.addEventListener('click', function() {
        const imageId = document.getElementById('editImageId').value;
        const editData = document.getElementById('editData');

        if (!imageId || !editData) {
            alert('Missing data');
            return;
        }

        let editedData = getEditedDataFromForm();

        // Send to server
        fetch('/api/save_analysis', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                image_id: imageId,
                analysis: editedData
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Analysis saved successfully!');
                // Refresh the page
                window.location.reload();
            } else {
                alert('Error: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error saving analysis. See console for details.');
        });
    });

    // Get data from form
    function getEditedDataFromForm() {
        let data = {};
        const editData = document.getElementById('editData');

        if (editData) {
            try {
                return JSON.parse(editData.innerText);
            } catch (e) {
                console.error('Error parsing JSON:', e);
                alert('Error parsing JSON. Please check format.');
                return {};
            }
        }

        return data;
    }
});