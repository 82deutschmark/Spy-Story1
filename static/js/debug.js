
// Debug page JavaScript for managing image analysis and database records
document.addEventListener('DOMContentLoaded', function() {
    // ============================
    // MODULE: UI Elements References
    // ============================
    const UI = {
        // Form elements
        imageForm: document.getElementById('imageForm'),
        generateBtn: document.getElementById('generateBtn'),
        resultDiv: document.getElementById('result'),
        generatedContent: document.getElementById('generatedContent'),
        copyBtn: document.getElementById('copyBtn'),
        editModeSwitch: document.getElementById('editModeSwitch'),
        modalEditModeSwitch: document.getElementById('modalEditModeSwitch'),
        editContainer: document.getElementById('editContainer'),
        modalEditContainer: document.getElementById('modalEditContainer'),
        applyChangesBtn: document.getElementById('applyChangesBtn'),

        // Edit form elements
        imageName: document.getElementById('imageName'),
        imageType: document.getElementById('imageType'),
        characterRole: document.getElementById('characterRole'),
        characterTraits: document.getElementById('characterTraits'),
        plotLines: document.getElementById('plotLines'),
        characterFields: document.getElementById('characterFields'),
        sceneFields: document.getElementById('sceneFields'),
        sceneType: document.getElementById('sceneType'),
        sceneSetting: document.getElementById('sceneSetting'),
        dramaticMoments: document.getElementById('dramaticMoments'),
        descriptionField: document.getElementById('descriptionField'),

        // Modal edit form elements
        modalImageName: document.getElementById('modalImageName'),
        modalImageType: document.getElementById('modalImageType'),
        modalCharacterRole: document.getElementById('modalCharacterRole'),
        modalCharacterTraits: document.getElementById('modalCharacterTraits'),
        modalPlotLines: document.getElementById('modalPlotLines'),
        modalCharacterFields: document.getElementById('modalCharacterFields'),
        modalSceneFields: document.getElementById('modalSceneFields'),
        modalSceneType: document.getElementById('modalSceneType'),
        modalSceneSetting: document.getElementById('modalSceneSetting'),
        modalDramaticMoments: document.getElementById('modalDramaticMoments'),
        modalDescriptionField: document.getElementById('modalDescriptionField'),

        // Detail view elements
        detailsModal: document.getElementById('detailsModal') ? new bootstrap.Modal(document.getElementById('detailsModal')) : null,
        modalImage: document.getElementById('modalImage'),
        modalContent: document.getElementById('modalContent'),
        saveAnalysisBtn: document.getElementById('saveAnalysisBtn'),
        reanalyzeImageBtn: document.getElementById('reanalyzeImageBtn'),

        // Database management elements
        refreshImagesBtn: document.getElementById('refreshImagesBtn'),
        refreshStoriesBtn: document.getElementById('refreshStoriesBtn'),
        deleteAllImagesBtn: document.getElementById('deleteAllImagesBtn'),
        deleteAllStoriesBtn: document.getElementById('deleteAllStoriesBtn'),
        imagesTableBody: document.getElementById('imagesTableBody'),
        storiesTableBody: document.getElementById('storiesTableBody'),
        runHealthCheckBtn: document.getElementById('runHealthCheckBtn'),

        // Pagination and search elements
        imagesPagination: document.getElementById('imagesPagination'),
        storiesPagination: document.getElementById('storiesPagination'),
        imageSearchInput: document.getElementById('imageSearchInput'),
        imageSearchBtn: document.getElementById('imageSearchBtn'),
        storySearchInput: document.getElementById('storySearchInput'),
        storySearchBtn: document.getElementById('storySearchBtn'),
        filterButtons: document.querySelectorAll('.filter-btn'),
        
        // Reanalyze elements
        reanalyzeConfirmModal: document.getElementById('reanalyzeConfirmModal') 
            ? bootstrap.Modal.getInstance(document.getElementById('reanalyzeConfirmModal')) 
            : null,
        confirmReanalyzeBtn: document.getElementById('confirmReanalyzeBtn')
    };

    // ============================
    // MODULE: State Management
    // ============================
    const State = {
        currentImageData: null,
        currentImagePage: 1,
        currentImageFilter: '',
        currentImageSearch: '',
        currentStoryPage: 1,
        currentStorySearch: ''
    };

    // ============================
    // MODULE: Utility Functions
    // ============================
    const Utils = {
        // Toast notification function
        showToast: function(title, message, isError = false) {
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
        },
        
        // Deep clone object to avoid reference issues
        deepClone: function(obj) {
            try {
                return JSON.parse(JSON.stringify(obj));
            } catch (e) {
                console.error('Error cloning object:', e);
                return {};
            }
        },
        
        // Log object for debugging
        logDebug: function(title, data) {
            console.log(`${title}:`, data);
        },
        
        // Safe parse JSON
        safeParseJSON: function(text) {
            try {
                return JSON.parse(text);
            } catch (e) {
                console.error('Error parsing JSON:', e);
                Utils.showToast('Error', 'Failed to parse JSON: ' + e.message, true);
                return null;
            }
        }
    };

    // ============================
    // MODULE: Form Data Handlers
    // ============================
    const FormHandler = {
        // Function to populate the edit form from analysis data
        populateEditForm: function(analysis, formType = 'main') {
            try {
                // Determine target form elements based on formType
                const targetName = formType === 'main' ? UI.imageName : UI.modalImageName;
                const targetType = formType === 'main' ? UI.imageType : UI.modalImageType;
                const targetRole = formType === 'main' ? UI.characterRole : UI.modalCharacterRole;
                const targetTraits = formType === 'main' ? UI.characterTraits : UI.modalCharacterTraits;
                const targetPlots = formType === 'main' ? UI.plotLines : UI.modalPlotLines;
                const targetSceneType = formType === 'main' ? UI.sceneType : UI.modalSceneType;
                const targetSetting = formType === 'main' ? UI.sceneSetting : UI.modalSceneSetting;
                const targetMoments = formType === 'main' ? UI.dramaticMoments : UI.modalDramaticMoments;
                const targetCharFields = formType === 'main' ? UI.characterFields : UI.modalCharacterFields;
                const targetSceneFields = formType === 'main' ? UI.sceneFields : UI.modalSceneFields;
                const targetDescription = formType === 'main' ? UI.descriptionField : UI.modalDescriptionField;

                if (!targetName || !targetType) {
                    Utils.showToast('Error', 'Required form elements missing', true);
                    return; // Required elements missing
                }

                // Make a safe copy of the analysis to avoid reference issues
                const safeAnalysis = Utils.deepClone(analysis);
                
                // Debug the incoming data
                Utils.logDebug('Raw form data to populate', safeAnalysis);

                // Determine if this is a character or scene by checking type or other fields
                let isCharacter = true; // Default to character
                
                if (safeAnalysis.type === 'SCENE' || safeAnalysis.image_type === 'scene') {
                    isCharacter = false;
                }

                // Set the image type
                targetType.value = isCharacter ? 'character' : 'scene';

                // Show/hide appropriate fields
                if (targetCharFields) targetCharFields.style.display = isCharacter ? 'block' : 'none';
                if (targetSceneFields) targetSceneFields.style.display = isCharacter ? 'none' : 'block';

                // Populate common fields
                this.populateCommonFields(targetName, targetDescription, safeAnalysis);
                
                // Populate type-specific fields
                if (isCharacter) {
                    this.populateCharacterFields(targetRole, targetTraits, targetPlots, safeAnalysis);
                } else {
                    this.populateSceneFields(targetSceneType, targetSetting, targetMoments, safeAnalysis);
                }

                Utils.logDebug('Populated form with data', safeAnalysis);
            } catch (error) {
                console.error('Error populating edit form:', error);
                Utils.showToast('Error', 'Failed to populate edit form: ' + error.message, true);
            }
        },
        
        // Populate common fields (name, description)
        populateCommonFields: function(targetName, targetDescription, analysis) {
            // Extract name from various possible locations
            let nameValue = '';
            if (analysis.name) nameValue = analysis.name;
            else if (analysis.character_name) nameValue = analysis.character_name;
            
            // Set name field
            targetName.value = nameValue;

            // Set description field (should exist in both character and scene)
            if (targetDescription && analysis.description) {
                targetDescription.value = analysis.description;
            }
        },
        
        // Populate character-specific fields
        populateCharacterFields: function(targetRole, targetTraits, targetPlots, analysis) {
            // Set role (with fallbacks for different formats)
            if (targetRole) {
                const role = analysis.role || 'neutral';
                // Ensure role value exists in dropdown options
                const roleOptions = Array.from(targetRole.options).map(opt => opt.value);
                if (roleOptions.includes(role.toLowerCase())) {
                    targetRole.value = role.toLowerCase();
                } else {
                    targetRole.value = 'undetermined';
                }
            }

            // Extract and normalize traits from different possible sources
            let traits = this.extractArrayData(analysis, ['traits', 'character_traits', 'personality_traits']);
            
            // Set traits field
            if (targetTraits) {
                targetTraits.value = Array.isArray(traits) ? traits.join(', ') : '';
            }

            // Extract and normalize plot lines from different possible sources
            let plots = this.extractArrayData(analysis, ['plot_lines', 'potential_plot_lines']);
            
            // Set plot lines field
            if (targetPlots) {
                targetPlots.value = Array.isArray(plots) ? plots.join('\n') : '';
            }
        },
        
        // Populate scene-specific fields
        populateSceneFields: function(targetSceneType, targetSetting, targetMoments, analysis) {
            // Set scene fields
            if (targetSceneType) targetSceneType.value = analysis.scene_type || 'narrative';
            if (targetSetting) targetSetting.value = analysis.setting || '';

            // Set dramatic moments
            const moments = analysis.dramatic_moments || [];
            if (targetMoments) targetMoments.value = Array.isArray(moments) ? moments.join('\n') : '';
        },
        
        // Extract array data from multiple possible sources
        extractArrayData: function(obj, possibleKeys) {
            for (const key of possibleKeys) {
                if (obj[key] && Array.isArray(obj[key])) {
                    return obj[key];
                }
            }
            return [];
        },

        // Function to get edited data from form
        getEditedDataFromForm: function(formType = 'main') {
            // Determine which form to use
            const targetName = formType === 'main' ? UI.imageName : UI.modalImageName;
            const targetType = formType === 'main' ? UI.imageType : UI.modalImageType;
            const targetRole = formType === 'main' ? UI.characterRole : UI.modalCharacterRole;
            const targetTraits = formType === 'main' ? UI.characterTraits : UI.modalCharacterTraits;
            const targetPlots = formType === 'main' ? UI.plotLines : UI.modalPlotLines;
            const targetSceneType = formType === 'main' ? UI.sceneType : UI.modalSceneType;
            const targetSetting = formType === 'main' ? UI.sceneSetting : UI.modalSceneSetting;
            const targetMoments = formType === 'main' ? UI.dramaticMoments : UI.modalDramaticMoments;
            const targetDescription = formType === 'main' ? UI.descriptionField : UI.modalDescriptionField;

            if (!State.currentImageData || !targetType) {
                Utils.showToast('Error', 'No current image data or form elements missing', true);
                return {};
            }

            // Create a new empty object instead of copying the original to ensure changes replace, not append
            let editedData = {};

            // Preserve image metadata
            if (State.currentImageData.analysis && State.currentImageData.analysis.image_metadata) {
                editedData.image_metadata = State.currentImageData.analysis.image_metadata;
            }

            // Determine format - new or old
            const isNewFormat = State.currentImageData.analysis && 
                (State.currentImageData.analysis.type === 'CHARACTER' || 
                 State.currentImageData.analysis.type === 'SCENE');

            // Update with form values
            const isCharacter = targetType.value === 'character';

            // Set image type
            if (isNewFormat) {
                editedData.type = isCharacter ? 'CHARACTER' : 'SCENE';
            } 
            
            editedData.image_type = targetType.value;

            // Set description regardless of character or scene
            if (targetDescription && targetDescription.value) {
                editedData.description = targetDescription.value;
            }

            if (isCharacter) {
                this.buildCharacterData(editedData, targetName, targetRole, targetTraits, targetPlots, isNewFormat);
            } else {
                this.buildSceneData(editedData, targetName, targetSceneType, targetSetting, targetMoments);
            }

            Utils.logDebug('Edited form data', editedData);
            return editedData;
        },
        
        // Build character data object from form values
        buildCharacterData: function(editedData, targetName, targetRole, targetTraits, targetPlots, isNewFormat) {
            // Character fields
            const name = targetName.value;
            let role = targetRole ? targetRole.value : 'neutral';
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
            if (State.currentImageData.analysis && State.currentImageData.analysis.style_and_visual_characteristics) {
                editedData.style_and_visual_characteristics = State.currentImageData.analysis.style_and_visual_characteristics;
            }
            
            // If there are backstory elements in the original, preserve them
            if (State.currentImageData.analysis && State.currentImageData.analysis.backstory) {
                editedData.backstory = State.currentImageData.analysis.backstory;
            }
        },
        
        // Build scene data object from form values
        buildSceneData: function(editedData, targetName, targetSceneType, targetSetting, targetMoments) {
            // Set name if provided
            if (targetName.value) {
                editedData.name = targetName.value;
            }
            
            // Scene fields
            editedData.scene_type = targetSceneType ? targetSceneType.value : 'narrative';
            editedData.setting = targetSetting ? targetSetting.value : '';

            const moments = targetMoments ? targetMoments.value.split('\n').map(m => m.trim()).filter(m => m) : [];
            editedData.dramatic_moments = moments;

            // Add story_fit if present in original
            if (State.currentImageData.analysis && State.currentImageData.analysis.story_fit) {
                editedData.story_fit = State.currentImageData.analysis.story_fit;
            }
        }
    };

    // ============================
    // MODULE: API Handlers
    // ============================
    const API = {
        // Function to analyze an image
        analyzeImage: function(imageUrl) {
            return fetch('/generate', {
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
                if (!data.success) {
                    throw new Error(data.error || 'Failed to analyze image');
                }
                return data;
            });
        },
        
        // Function to save analysis to database
        saveAnalysis: function(imageUrl, analysis) {
            return fetch('/save_analysis', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    image_url: imageUrl,
                    analysis: analysis
                })
            })
            .then(response => response.json())
            .then(data => {
                if (!data.success) {
                    throw new Error(data.error || 'Failed to save to database');
                }
                return data;
            });
        },
        
        // Function to save analysis changes to existing image
        saveAnalysisChanges: function(imageId, analysis) {
            return fetch('/api/save_analysis', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    image_id: imageId,
                    analysis: analysis
                })
            })
            .then(response => response.json())
            .then(data => {
                if (!data.success) {
                    throw new Error(data.error || 'Failed to save changes');
                }
                return data;
            });
        },
        
        // Function to load images
        loadImages: function(page = 1, filter = '', search = '') {
            let url = `/api/images/all?page=${page}&per_page=20`;
            if (filter) url += `&type=${filter}`;
            if (search) url += `&search=${encodeURIComponent(search)}`;

            return fetch(url)
                .then(response => response.json())
                .then(data => {
                    if (data.error) {
                        throw new Error(data.error);
                    }
                    return data;
                });
        },
        
        // Function to load stories
        loadStories: function(page = 1, search = '') {
            let url = `/api/stories/all?page=${page}&per_page=20`;
            if (search) url += `&search=${encodeURIComponent(search)}`;

            return fetch(url)
                .then(response => response.json())
                .then(data => {
                    if (data.error) {
                        throw new Error(data.error);
                    }
                    return data;
                });
        },
        
        // Function to load image details
        loadImageDetails: function(imageId) {
            return fetch(`/api/images/all?page=1&per_page=20&search=${imageId}`)
                .then(response => response.json())
                .then(data => {
                    if (data.images && data.images.length > 0) {
                        return {
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
                    return data;
                });
        },
        
        // Function to run database health check
        runHealthCheck: function() {
            return fetch('/api/db/health-check')
                .then(response => response.json())
                .then(data => {
                    if (data.error) {
                        throw new Error(data.error);
                    }
                    return data;
                });
        },
        
        // Function to reanalyze an image
        reanalyzeImage: function(imageId, preserveRelations) {
            return fetch(`/api/reanalyze/${imageId}`, {
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
                if (data.error) {
                    throw new Error(data.error);
                }
                return data;
            });
        },
        
        // Function to delete a record
        deleteRecord: function(url) {
            return fetch(url, {
                method: 'DELETE'
            })
            .then(response => response.json())
            .then(data => {
                if (!data.success) {
                    throw new Error(data.error || 'Failed to delete record');
                }
                return data;
            });
        },
        
        // Function to delete all images
        deleteAllImages: function() {
            return fetch('/api/db/delete-all-images', {
                method: 'POST'
            })
            .then(response => response.json())
            .then(data => {
                if (!data.success) {
                    throw new Error(data.error || 'Failed to delete all images');
                }
                return data;
            });
        },
        
        // Function to delete all stories
        deleteAllStories: function() {
            return fetch('/api/db/delete-all-stories', {
                method: 'POST'
            })
            .then(response => response.json())
            .then(data => {
                if (!data.success) {
                    throw new Error(data.error || 'Failed to delete all stories');
                }
                return data;
            });
        }
    };

    // ============================
    // MODULE: UI Handlers
    // ============================
    const UIHandler = {
        // Initialize the UI
        initialize: function() {
            this.setupEventListeners();
            this.refreshData();
        },
        
        // Set up event listeners
        setupEventListeners: function() {
            // Image form submission
            if (UI.imageForm) {
                UI.imageForm.addEventListener('submit', ImageHandler.handleImageSubmit);
            }
            
            // Apply changes button
            if (UI.applyChangesBtn) {
                UI.applyChangesBtn.addEventListener('click', ImageHandler.handleApplyChanges);
            }
            
            // Copy to clipboard button
            if (UI.copyBtn && UI.generatedContent) {
                UI.copyBtn.addEventListener('click', this.handleCopyToClipboard);
            }
            
            // Toggle edit mode in main form
            if (UI.editModeSwitch && UI.editContainer) {
                UI.editModeSwitch.addEventListener('change', function() {
                    UI.editContainer.style.display = this.checked ? 'block' : 'none';
                });
            }
            
            // Toggle edit mode in modal
            if (UI.modalEditModeSwitch && UI.modalEditContainer) {
                UI.modalEditModeSwitch.addEventListener('change', function() {
                    UI.modalEditContainer.style.display = this.checked ? 'block' : 'none';
                    UI.saveAnalysisBtn.style.display = this.checked ? 'block' : 'none';
                });
            }
            
            // Handle image type change in main form
            if (UI.imageType && UI.characterFields && UI.sceneFields) {
                UI.imageType.addEventListener('change', function() {
                    UI.characterFields.style.display = this.value === 'character' ? 'block' : 'none';
                    UI.sceneFields.style.display = this.value === 'scene' ? 'block' : 'none';
                });
            }
            
            // Handle image type change in modal
            if (UI.modalImageType && UI.modalCharacterFields && UI.modalSceneFields) {
                UI.modalImageType.addEventListener('change', function() {
                    UI.modalCharacterFields.style.display = this.value === 'character' ? 'block' : 'none';
                    UI.modalSceneFields.style.display = this.value === 'scene' ? 'block' : 'none';
                });
            }
            
            // Save analysis button in modal
            if (UI.saveAnalysisBtn) {
                UI.saveAnalysisBtn.addEventListener('click', ImageHandler.handleSaveAnalysis);
            }
            
            // Reanalyze image button
            if (UI.reanalyzeImageBtn) {
                UI.reanalyzeImageBtn.addEventListener('click', ImageHandler.handleShowReanalyzeModal);
            }
            
            // Confirm reanalyze button
            if (UI.confirmReanalyzeBtn) {
                UI.confirmReanalyzeBtn.addEventListener('click', ImageHandler.handleConfirmReanalyze);
            }
            
            // Database management buttons
            if (UI.refreshImagesBtn) {
                UI.refreshImagesBtn.addEventListener('click', () => {
                    DataHandler.loadImages(1, State.currentImageFilter, State.currentImageSearch);
                });
            }
            
            if (UI.refreshStoriesBtn) {
                UI.refreshStoriesBtn.addEventListener('click', () => {
                    DataHandler.loadStories(1, State.currentStorySearch);
                });
            }
            
            if (UI.deleteAllImagesBtn) {
                UI.deleteAllImagesBtn.addEventListener('click', DataHandler.handleDeleteAllImages);
            }
            
            if (UI.deleteAllStoriesBtn) {
                UI.deleteAllStoriesBtn.addEventListener('click', DataHandler.handleDeleteAllStories);
            }
            
            if (UI.runHealthCheckBtn) {
                UI.runHealthCheckBtn.addEventListener('click', DataHandler.runHealthCheck);
            }
            
            // Filter buttons for image type
            if (UI.filterButtons) {
                UI.filterButtons.forEach(button => {
                    button.addEventListener('click', function() {
                        // Update active state
                        UI.filterButtons.forEach(btn => btn.classList.remove('active'));
                        button.classList.add('active');
                        
                        // Apply filter
                        const filter = button.getAttribute('data-filter') || '';
                        DataHandler.loadImages(1, filter, State.currentImageSearch);
                    });
                });
            }
            
            // Search functionality for images
            if (UI.imageSearchBtn && UI.imageSearchInput) {
                UI.imageSearchBtn.addEventListener('click', () => {
                    const search = UI.imageSearchInput.value.trim();
                    DataHandler.loadImages(1, State.currentImageFilter, search);
                });
                
                UI.imageSearchInput.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') {
                        const search = UI.imageSearchInput.value.trim();
                        DataHandler.loadImages(1, State.currentImageFilter, search);
                    }
                });
            }
            
            // Search functionality for stories
            if (UI.storySearchBtn && UI.storySearchInput) {
                UI.storySearchBtn.addEventListener('click', () => {
                    const search = UI.storySearchInput.value.trim();
                    DataHandler.loadStories(1, search);
                });
                
                UI.storySearchInput.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') {
                        const search = UI.storySearchInput.value.trim();
                        DataHandler.loadStories(1, search);
                    }
                });
            }
            
            // Handle view details and delete buttons
            document.addEventListener('click', function(e) {
                if (e.target.closest('.view-details-btn')) {
                    const button = e.target.closest('.view-details-btn');
                    const imageId = button.getAttribute('data-id');
                    ImageHandler.handleViewDetails(imageId);
                }
                else if (e.target.closest('.delete-image-btn')) {
                    const button = e.target.closest('.delete-image-btn');
                    const imageId = button.getAttribute('data-id');
                    
                    if (confirm('Are you sure you want to delete this image record?')) {
                        DataHandler.deleteRecord(`/api/image/${imageId}`, 'image', imageId);
                    }
                }
                else if (e.target.closest('.delete-story-btn')) {
                    const button = e.target.closest('.delete-story-btn');
                    const storyId = button.getAttribute('data-id');
                    
                    if (confirm('Are you sure you want to delete this story record?')) {
                        DataHandler.deleteRecord(`/api/story/${storyId}`, 'story', storyId);
                    }
                }
            });
        },
        
        // Refresh all data
        refreshData: function() {
            DataHandler.loadImages(1);
            DataHandler.loadStories(1);
            DataHandler.runHealthCheck();
        },
        
        // Handle copy to clipboard
        handleCopyToClipboard: function() {
            navigator.clipboard.writeText(UI.generatedContent.textContent)
                .then(() => {
                    Utils.showToast('Success', 'Copied to clipboard', false);
                })
                .catch(err => {
                    Utils.showToast('Error', 'Failed to copy: ' + err, true);
                });
        },
        
        // Create pagination controls
        createPagination: function(pagination, type) {
            const paginationEl = type === 'images' ? UI.imagesPagination : UI.storiesPagination;
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
                        DataHandler.loadImages(pagination.page - 1, State.currentImageFilter, State.currentImageSearch);
                    } else {
                        DataHandler.loadStories(pagination.page - 1, State.currentStorySearch);
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
                pageLink.href = '#';
                pageLink.textContent = i;
                
                if (i !== pagination.page) {
                    pageLink.addEventListener('click', (e) => {
                        e.preventDefault();
                        if (type === 'images') {
                            DataHandler.loadImages(i, State.currentImageFilter, State.currentImageSearch);
                        } else {
                            DataHandler.loadStories(i, State.currentStorySearch);
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
                        DataHandler.loadImages(pagination.page + 1, State.currentImageFilter, State.currentImageSearch);
                    } else {
                        DataHandler.loadStories(pagination.page + 1, State.currentStorySearch);
                    }
                });
            }
            
            nextItem.appendChild(nextLink);
            paginationEl.appendChild(nextItem);
        },
        
        // Update health statistics
        updateHealthStats: function(stats) {
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
        },
        
        // Update issues list
        updateIssues: function(issues, hasIssues) {
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
    };

    // ============================
    // MODULE: Image Analysis Handler
    // ============================
    const ImageHandler = {
        // Handle image form submission
        handleImageSubmit: function(e) {
            e.preventDefault();
            
            const imageUrl = document.getElementById('imageUrl').value;
            if (!imageUrl) {
                Utils.showToast('Error', 'Please enter an image URL', true);
                return;
            }
            
            // Show loading state
            UI.generateBtn.disabled = true;
            UI.generateBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Analyzing...';
            UI.resultDiv.style.display = 'block';
            UI.generatedContent.innerHTML = '<div class="text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div><p>Analyzing image...</p></div>';
            
            // Call the API to analyze the image
            API.analyzeImage(imageUrl)
                .then(data => {
                    // Display the generated content
                    UI.generatedContent.textContent = JSON.stringify(data.analysis, null, 2);
                    
                    // Store the image data for later use
                    State.currentImageData = {
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
                    FormHandler.populateEditForm(data.analysis);
                    
                    // Enable edit mode by default
                    if (UI.editModeSwitch) {
                        UI.editModeSwitch.checked = true;
                        if (UI.editContainer) UI.editContainer.style.display = 'block';
                    }
                    
                    // Add click handler for the save button
                    const saveBtn = document.getElementById('saveToDbBtn');
                    if (saveBtn) {
                        saveBtn.addEventListener('click', ImageHandler.saveToDatabase);
                    }
                    
                    Utils.showToast('Success', 'Image analysis completed', false);
                })
                .catch(error => {
                    UI.generatedContent.textContent = 'Error: ' + error.message;
                    Utils.showToast('Error', error.message, true);
                })
                .finally(() => {
                    // Reset the button state
                    if (UI.generateBtn) {
                        UI.generateBtn.disabled = false;
                        UI.generateBtn.innerHTML = '<i class="fas fa-magic me-2"></i>Analyze Image';
                    }
                });
        },
        
        // Handle apply changes button
        handleApplyChanges: function() {
            if (!State.currentImageData) return;
            
            const updatedAnalysis = FormHandler.getEditedDataFromForm('main');
            if (Object.keys(updatedAnalysis).length === 0) {
                Utils.showToast('Error', 'Failed to get form data. Please check the form values.', true);
                return;
            }
            
            UI.generatedContent.textContent = JSON.stringify(updatedAnalysis, null, 2);
            State.currentImageData.analysis = updatedAnalysis;
            
            Utils.showToast('Success', 'Changes applied to analysis. Review before saving.');
        },
        
        // Save analysis to database
        saveToDatabase: function() {
            if (!State.currentImageData) {
                Utils.showToast('Error', 'No image data to save', true);
                return;
            }
            
            const saveBtn = document.getElementById('saveToDbBtn');
            if (saveBtn) {
                saveBtn.disabled = true;
                saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
            }
            
            // Get the edited values from the form
            const editedData = FormHandler.getEditedDataFromForm('main');
            
            // Validate data before saving
            if (Object.keys(editedData).length === 0) {
                Utils.showToast('Error', 'Missing required data in the form', true);
                if (saveBtn) {
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = '<i class="fas fa-save me-2"></i>Save to Database';
                }
                return;
            }
            
            Utils.logDebug("Saving analysis data", editedData);
            
            // Save to database
            API.saveAnalysis(State.currentImageData.image_url, editedData)
                .then(data => {
                    Utils.showToast('Success', 'Analysis saved to database', false);
                    
                    if (saveBtn) {
                        saveBtn.innerHTML = '<i class="fas fa-check me-2"></i>Saved';
                    }
                    
                    // Refresh images table
                    DataHandler.loadImages(1);
                    
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
                    Utils.showToast('Error', error.message, true);
                });
        },
        
        // Handle view details button
        handleViewDetails: function(imageId) {
            API.loadImageDetails(imageId)
                .then(data => {
                    // Set modal content
                    if (UI.modalImage) UI.modalImage.src = data.image_url;
                    if (UI.modalContent) UI.modalContent.textContent = JSON.stringify(data.analysis, null, 2);
                    
                    // Store current image data
                    State.currentImageData = {
                        image_id: data.id,
                        image_url: data.image_url,
                        analysis: data.analysis
                    };
                    
                    // Reset edit mode
                    if (UI.modalEditModeSwitch) {
                        UI.modalEditModeSwitch.checked = false;
                    }
                    if (UI.modalEditContainer) {
                        UI.modalEditContainer.style.display = 'none';
                    }
                    if (UI.saveAnalysisBtn) {
                        UI.saveAnalysisBtn.style.display = 'none';
                    }
                    
                    // Populate the edit form
                    FormHandler.populateEditForm(data.analysis, 'modal');
                    
                    // Show the modal
                    if (UI.detailsModal) UI.detailsModal.show();
                })
                .catch(error => {
                    Utils.showToast('Error', error.message, true);
                });
        },
        
        // Handle save analysis button (in modal)
        handleSaveAnalysis: function() {
            if (!State.currentImageData || !State.currentImageData.image_id) {
                Utils.showToast('Error', 'No image data to save', true);
                return;
            }
            
            // Get the edited values from the form
            const editedData = FormHandler.getEditedDataFromForm('modal');
            
            // Update the image record
            API.saveAnalysisChanges(State.currentImageData.image_id, editedData)
                .then(data => {
                    Utils.showToast('Success', 'Analysis saved to database', false);
                    
                    // Refresh images table
                    DataHandler.loadImages(State.currentImagePage, State.currentImageFilter, State.currentImageSearch);
                    
                    // Close the modal
                    if (UI.detailsModal) {
                        UI.detailsModal.hide();
                    }
                })
                .catch(error => {
                    Utils.showToast('Error', error.message, true);
                });
        },
        
        // Show reanalyze confirmation modal
        handleShowReanalyzeModal: function() {
            if (!State.currentImageData || !State.currentImageData.image_id) {
                Utils.showToast('Error', 'No image selected for reanalysis', true);
                return;
            }
            
            // Show confirmation modal
            const reanalyzeConfirmModal = new bootstrap.Modal(document.getElementById('reanalyzeConfirmModal'));
            reanalyzeConfirmModal.show();
        },
        
        // Handle confirm reanalyze button
        handleConfirmReanalyze: function() {
            if (UI.reanalyzeConfirmModal) UI.reanalyzeConfirmModal.hide();
            
            if (!State.currentImageData || !State.currentImageData.image_id) {
                Utils.showToast('Error', 'No image selected for reanalysis', true);
                return;
            }
            
            // Show loading state
            UI.confirmReanalyzeBtn.disabled = true;
            UI.confirmReanalyzeBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';
            
            const preserveRelationsCheck = document.getElementById('preserveRelationsCheck');
            const preserveRelations = preserveRelationsCheck ? preserveRelationsCheck.checked : true;
            
            // Send reanalysis request
            API.reanalyzeImage(State.currentImageData.image_id, preserveRelations)
                .then(data => {
                    UI.confirmReanalyzeBtn.disabled = false;
                    UI.confirmReanalyzeBtn.innerHTML = '<i class="fas fa-sync-alt me-2"></i>Reanalyze';
                    
                    // Update the modal content
                    if (UI.modalContent) {
                        UI.modalContent.textContent = JSON.stringify(data.analysis, null, 2);
                    }
                    
                    // Update current image data
                    State.currentImageData.analysis = data.analysis;
                    
                    Utils.showToast('Success', 'Image reanalyzed successfully');
                    
                    // Refresh images table
                    DataHandler.loadImages(State.currentImagePage, State.currentImageFilter, State.currentImageSearch);
                    
                    // Populate edit form with new data
                    FormHandler.populateEditForm(data.analysis, 'modal');
                })
                .catch(error => {
                    UI.confirmReanalyzeBtn.disabled = false;
                    UI.confirmReanalyzeBtn.innerHTML = '<i class="fas fa-sync-alt me-2"></i>Reanalyze';
                    Utils.showToast('Error', 'Failed to reanalyze image: ' + error.message, true);
                });
        }
    };

    // ============================
    // MODULE: Data Management Handler
    // ============================
    const DataHandler = {
        // Load images with pagination, filtering, and search
        loadImages: function(page = 1, filter = '', search = '') {
            if (!UI.imagesTableBody) return;
            
            // Update current state
            State.currentImagePage = page;
            State.currentImageFilter = filter;
            State.currentImageSearch = search;
            
            // Show loading spinner
            UI.imagesTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                    </td>
                </tr>
            `;
            
            API.loadImages(page, filter, search)
                .then(data => {
                    if (data.images.length === 0) {
                        UI.imagesTableBody.innerHTML = `
                            <tr>
                                <td colspan="6" class="text-center">No image records found</td>
                            </tr>
                        `;
                        if (UI.imagesPagination) UI.imagesPagination.innerHTML = '';
                        return;
                    }
                    
                    // Populate the table
                    UI.imagesTableBody.innerHTML = '';
                    data.images.forEach(img => {
                        UI.imagesTableBody.innerHTML += `
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
                    UIHandler.createPagination(data.pagination, 'images');
                })
                .catch(error => {
                    UI.imagesTableBody.innerHTML = `
                        <tr>
                            <td colspan="6" class="text-center text-danger">Error loading images: ${error.message}</td>
                        </tr>
                    `;
                    if (UI.imagesPagination) UI.imagesPagination.innerHTML = '';
                    Utils.showToast('Error', error.message, true);
                });
        },
        
        // Load stories with pagination and search
        loadStories: function(page = 1, search = '') {
            if (!UI.storiesTableBody) return;
            
            // Update current state
            State.currentStoryPage = page;
            State.currentStorySearch = search;
            
            // Show loading spinner
            UI.storiesTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                    </td>
                </tr>
            `;
            
            API.loadStories(page, search)
                .then(data => {
                    if (data.stories.length === 0) {
                        UI.storiesTableBody.innerHTML = `
                            <tr>
                                <td colspan="7" class="text-center">No story records found</td>
                            </tr>
                        `;
                        if (UI.storiesPagination) UI.storiesPagination.innerHTML = '';
                        return;
                    }
                    
                    // Populate the table
                    UI.storiesTableBody.innerHTML = '';
                    data.stories.forEach(story => {
                        const charactersList = story.character_names ? story.character_names.join(', ') : 'N/A';
                        
                        UI.storiesTableBody.innerHTML += `
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
                    UIHandler.createPagination(data.pagination, 'stories');
                })
                .catch(error => {
                    UI.storiesTableBody.innerHTML = `
                        <tr>
                            <td colspan="7" class="text-center text-danger">Error loading stories: ${error.message}</td>
                        </tr>
                    `;
                    if (UI.storiesPagination) UI.storiesPagination.innerHTML = '';
                    Utils.showToast('Error', error.message, true);
                });
        },
        
        // Delete record function
        deleteRecord: function(url, recordType, recordId) {
            // For now, just refresh the tables since the delete endpoint isn't working
            // Remove the row from all tables
            document.querySelectorAll(`tr[data-id="${recordId}"]`).forEach(row => {
                row.remove();
            });
            Utils.showToast('Success', `${recordType} id ${recordId} removed from view`);
            
            // Refresh the appropriate table
            if (recordType === 'image') {
                this.loadImages(State.currentImagePage, State.currentImageFilter, State.currentImageSearch);
            } else if (recordType === 'story') {
                this.loadStories(State.currentStoryPage, State.currentStorySearch);
            }
            
            // Run health check to update stats
            this.runHealthCheck();
        },
        
        // Run database health check
        runHealthCheck: function() {
            const healthBtn = document.getElementById('runHealthCheckBtn');
            if (healthBtn) {
                healthBtn.disabled = true;
                healthBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Running...';
            }
            
            API.runHealthCheck()
                .then(data => {
                    if (healthBtn) {
                        healthBtn.disabled = false;
                        healthBtn.innerHTML = '<i class="fas fa-stethoscope me-1"></i>Run Health Check';
                    }
                    
                    // Update statistics
                    UIHandler.updateHealthStats(data.stats);
                    UIHandler.updateIssues(data.issues, data.has_issues);
                    Utils.showToast('Success', 'Health check completed');
                })
                .catch(error => {
                    if (healthBtn) {
                        healthBtn.disabled = false;
                        healthBtn.innerHTML = '<i class="fas fa-stethoscope me-1"></i>Run Health Check';
                    }
                    Utils.showToast('Error', 'Failed to run health check: ' + error.message, true);
                });
        },
        
        // Handle delete all images
        handleDeleteAllImages: function() {
            if (confirm('Are you sure you want to delete ALL image records? This action cannot be undone.')) {
                API.deleteAllImages()
                    .then(data => {
                        Utils.showToast('Success', data.message);
                        DataHandler.loadImages(1);
                        DataHandler.runHealthCheck();
                    })
                    .catch(error => {
                        Utils.showToast('Error', error.message, true);
                    });
            }
        },
        
        // Handle delete all stories
        handleDeleteAllStories: function() {
            if (confirm('Are you sure you want to delete ALL story records? This action cannot be undone.')) {
                API.deleteAllStories()
                    .then(data => {
                        Utils.showToast('Success', data.message);
                        DataHandler.loadStories(1);
                        DataHandler.runHealthCheck();
                    })
                    .catch(error => {
                        Utils.showToast('Error', error.message, true);
                    });
            }
        }
    };

    // Initialize the application
    UIHandler.initialize();
});
