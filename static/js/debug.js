
// Debug page JavaScript using module pattern for better organization
// Main module that initializes everything
const DebugApp = (function() {
    // Private initialization function
    function init() {
        // Initialize all modules
        UI.initialize();
        FormHandler.initialize();
        ImageHandler.initialize();
        DataHandler.initialize();
        
        // Log initialization
        console.log('Debug application initialized');
    }
    
    // Public API
    return {
        initialize: init
    };
})();

// Utility module for common functions
const Utils = (function() {
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
    
    // Deep clone object to avoid reference issues
    function deepClone(obj) {
        try {
            return JSON.parse(JSON.stringify(obj));
        } catch (e) {
            console.error('Error cloning object:', e);
            return {};
        }
    }
    
    // Log object for debugging
    function logDebug(title, data) {
        console.log(`${title}:`, data);
    }
    
    // Safe parse JSON
    function safeParseJSON(text) {
        try {
            return JSON.parse(text);
        } catch (e) {
            console.error('Error parsing JSON:', e);
            showToast('Error', 'Failed to parse JSON: ' + e.message, true);
            return null;
        }
    }
    
    // Public API
    return {
        showToast,
        deepClone,
        logDebug,
        safeParseJSON
    };
})();

// State management module
const State = (function() {
    // Private state variables
    let currentImageData = null;
    let currentImagePage = 1;
    let currentImageFilter = '';
    let currentImageSearch = '';
    let currentStoryPage = 1;
    let currentStorySearch = '';
    
    // Getters and setters
    function getCurrentImageData() {
        return currentImageData;
    }
    
    function setCurrentImageData(data) {
        currentImageData = data;
    }
    
    function getImagePageState() {
        return {
            page: currentImagePage,
            filter: currentImageFilter,
            search: currentImageSearch
        };
    }
    
    function setImagePageState(page, filter, search) {
        if (page !== undefined) currentImagePage = page;
        if (filter !== undefined) currentImageFilter = filter;
        if (search !== undefined) currentImageSearch = search;
    }
    
    function getStoryPageState() {
        return {
            page: currentStoryPage,
            search: currentStorySearch
        };
    }
    
    function setStoryPageState(page, search) {
        if (page !== undefined) currentStoryPage = page;
        if (search !== undefined) currentStorySearch = search;
    }
    
    // Public API
    return {
        getCurrentImageData,
        setCurrentImageData,
        getImagePageState,
        setImagePageState,
        getStoryPageState,
        setStoryPageState
    };
})();

// UI module for handling DOM elements and UI updates
const UI = (function() {
    // Private variables - element references
    const elements = {
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
    
    // Initialize UI
    function initialize() {
        setupEventListeners();
    }
    
    // Set up event listeners
    function setupEventListeners() {
        // Copy to clipboard button
        if (elements.copyBtn && elements.generatedContent) {
            elements.copyBtn.addEventListener('click', handleCopyToClipboard);
        }
        
        // Toggle edit mode in main form
        if (elements.editModeSwitch && elements.editContainer) {
            elements.editModeSwitch.addEventListener('change', function() {
                elements.editContainer.style.display = this.checked ? 'block' : 'none';
            });
        }
        
        // Toggle edit mode in modal
        if (elements.modalEditModeSwitch && elements.modalEditContainer) {
            elements.modalEditModeSwitch.addEventListener('change', function() {
                elements.modalEditContainer.style.display = this.checked ? 'block' : 'none';
                elements.saveAnalysisBtn.style.display = this.checked ? 'block' : 'none';
            });
        }
        
        // Handle image type change in main form
        if (elements.imageType && elements.characterFields && elements.sceneFields) {
            elements.imageType.addEventListener('change', function() {
                elements.characterFields.style.display = this.value === 'character' ? 'block' : 'none';
                elements.sceneFields.style.display = this.value === 'scene' ? 'block' : 'none';
            });
        }
        
        // Handle image type change in modal
        if (elements.modalImageType && elements.modalCharacterFields && elements.modalSceneFields) {
            elements.modalImageType.addEventListener('change', function() {
                elements.modalCharacterFields.style.display = this.value === 'character' ? 'block' : 'none';
                elements.modalSceneFields.style.display = this.value === 'scene' ? 'block' : 'none';
            });
        }
    }
    
    // Handle copy to clipboard
    function handleCopyToClipboard() {
        navigator.clipboard.writeText(elements.generatedContent.textContent)
            .then(() => {
                Utils.showToast('Success', 'Copied to clipboard', false);
            })
            .catch(err => {
                Utils.showToast('Error', 'Failed to copy: ' + err, true);
            });
    }
    
    // Create pagination controls
    function createPagination(pagination, type) {
        const paginationEl = type === 'images' ? elements.imagesPagination : elements.storiesPagination;
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
                    DataHandler.loadImages(pagination.page - 1);
                } else {
                    DataHandler.loadStories(pagination.page - 1);
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
                        DataHandler.loadImages(i);
                    } else {
                        DataHandler.loadStories(i);
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
                    DataHandler.loadImages(pagination.page + 1);
                } else {
                    DataHandler.loadStories(pagination.page + 1);
                }
            });
        }
        
        nextItem.appendChild(nextLink);
        paginationEl.appendChild(nextItem);
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
    
    // Get element
    function getElement(name) {
        return elements[name];
    }
    
    // Public API
    return {
        initialize,
        createPagination,
        updateHealthStats,
        updateIssues,
        getElement,
        handleCopyToClipboard,
        elements
    };
})();

// API module for handling server communication
const API = (function() {
    // Function to analyze an image
    function analyzeImage(imageUrl) {
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
    }
    
    // Function to save analysis to database
    function saveAnalysis(imageUrl, analysis) {
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
    }
    
    // Function to save analysis changes to existing image
    function saveAnalysisChanges(imageId, analysis) {
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
    }
    
    // Function to load images
    function loadImages(page = 1, filter = '', search = '') {
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
    }
    
    // Function to load stories
    function loadStories(page = 1, search = '') {
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
    }
    
    // Function to load image details
    function loadImageDetails(imageId) {
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
    }
    
    // Function to run database health check
    function runHealthCheck() {
        return fetch('/api/db/health-check')
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    throw new Error(data.error);
                }
                return data;
            });
    }
    
    // Function to reanalyze an image
    function reanalyzeImage(imageId, preserveRelations) {
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
    }
    
    // Function to delete a record
    function deleteRecord(url) {
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
    }
    
    // Function to delete all images
    function deleteAllImages() {
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
    }
    
    // Function to delete all stories
    function deleteAllStories() {
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
    
    // Public API
    return {
        analyzeImage,
        saveAnalysis,
        saveAnalysisChanges,
        loadImages,
        loadStories,
        loadImageDetails,
        runHealthCheck,
        reanalyzeImage,
        deleteRecord,
        deleteAllImages,
        deleteAllStories
    };
})();

// Form handler module for managing form data
const FormHandler = (function() {
    // Initialize form handling
    function initialize() {
        // No specific initialization needed
    }
    
    // Extract array data from multiple possible sources
    function extractArrayData(obj, possibleKeys) {
        for (const key of possibleKeys) {
            if (obj[key] && Array.isArray(obj[key])) {
                return obj[key];
            }
        }
        return [];
    }
    
    // Populate common fields (name, description)
    function populateCommonFields(targetName, targetDescription, analysis) {
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
    }
    
    // Populate character-specific fields
    function populateCharacterFields(targetRole, targetTraits, targetPlots, analysis) {
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
        let traits = extractArrayData(analysis, ['traits', 'character_traits', 'personality_traits']);
        
        // Set traits field
        if (targetTraits) {
            targetTraits.value = Array.isArray(traits) ? traits.join(', ') : '';
        }

        // Extract and normalize plot lines from different possible sources
        let plots = extractArrayData(analysis, ['plot_lines', 'potential_plot_lines']);
        
        // Set plot lines field
        if (targetPlots) {
            targetPlots.value = Array.isArray(plots) ? plots.join('\n') : '';
        }
    }
    
    // Populate scene-specific fields
    function populateSceneFields(targetSceneType, targetSetting, targetMoments, analysis) {
        // Set scene fields
        if (targetSceneType) targetSceneType.value = analysis.scene_type || 'narrative';
        if (targetSetting) targetSetting.value = analysis.setting || '';

        // Set dramatic moments
        const moments = analysis.dramatic_moments || [];
        if (targetMoments) targetMoments.value = Array.isArray(moments) ? moments.join('\n') : '';
    }
    
    // Function to populate the edit form from analysis data
    function populateEditForm(analysis, formType = 'main') {
        try {
            Utils.logDebug('Raw form data to populate', analysis);
            
            // Determine target form elements based on formType
            const targetName = formType === 'main' ? UI.elements.imageName : UI.elements.modalImageName;
            const targetType = formType === 'main' ? UI.elements.imageType : UI.elements.modalImageType;
            const targetRole = formType === 'main' ? UI.elements.characterRole : UI.elements.modalCharacterRole;
            const targetTraits = formType === 'main' ? UI.elements.characterTraits : UI.elements.modalCharacterTraits;
            const targetPlots = formType === 'main' ? UI.elements.plotLines : UI.elements.modalPlotLines;
            const targetSceneType = formType === 'main' ? UI.elements.sceneType : UI.elements.modalSceneType;
            const targetSetting = formType === 'main' ? UI.elements.sceneSetting : UI.elements.modalSceneSetting;
            const targetMoments = formType === 'main' ? UI.elements.dramaticMoments : UI.elements.modalDramaticMoments;
            const targetCharFields = formType === 'main' ? UI.elements.characterFields : UI.elements.modalCharacterFields;
            const targetSceneFields = formType === 'main' ? UI.elements.sceneFields : UI.elements.modalSceneFields;
            const targetDescription = formType === 'main' ? UI.elements.descriptionField : UI.elements.modalDescriptionField;

            if (!targetName || !targetType) {
                Utils.showToast('Error', 'Required form elements missing', true);
                return; // Required elements missing
            }

            // Make a safe copy of the analysis to avoid reference issues
            const safeAnalysis = Utils.deepClone(analysis);
            
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
            populateCommonFields(targetName, targetDescription, safeAnalysis);
            
            // Populate type-specific fields
            if (isCharacter) {
                populateCharacterFields(targetRole, targetTraits, targetPlots, safeAnalysis);
            } else {
                populateSceneFields(targetSceneType, targetSetting, targetMoments, safeAnalysis);
            }

            Utils.logDebug('Populated form with data', safeAnalysis);
        } catch (error) {
            console.error('Error populating edit form:', error);
            Utils.showToast('Error', 'Failed to populate edit form: ' + error.message, true);
        }
    }
    
    // Build character data object from form values
    function buildCharacterData(editedData, targetName, targetRole, targetTraits, targetPlots, isNewFormat) {
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
        const currentImageData = State.getCurrentImageData();
        if (currentImageData && 
            currentImageData.analysis && 
            currentImageData.analysis.style_and_visual_characteristics) {
            editedData.style_and_visual_characteristics = currentImageData.analysis.style_and_visual_characteristics;
        }
        
        // If there are backstory elements in the original, preserve them
        if (currentImageData && 
            currentImageData.analysis && 
            currentImageData.analysis.backstory) {
            editedData.backstory = currentImageData.analysis.backstory;
        }
    }
    
    // Build scene data object from form values
    function buildSceneData(editedData, targetName, targetSceneType, targetSetting, targetMoments) {
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
        const currentImageData = State.getCurrentImageData();
        if (currentImageData && 
            currentImageData.analysis && 
            currentImageData.analysis.story_fit) {
            editedData.story_fit = currentImageData.analysis.story_fit;
        }
    }
    
    // Function to get edited data from form
    function getEditedDataFromForm(formType = 'main') {
        // Determine which form to use
        const targetName = formType === 'main' ? UI.elements.imageName : UI.elements.modalImageName;
        const targetType = formType === 'main' ? UI.elements.imageType : UI.elements.modalImageType;
        const targetRole = formType === 'main' ? UI.elements.characterRole : UI.elements.modalCharacterRole;
        const targetTraits = formType === 'main' ? UI.elements.characterTraits : UI.elements.modalCharacterTraits;
        const targetPlots = formType === 'main' ? UI.elements.plotLines : UI.elements.modalPlotLines;
        const targetSceneType = formType === 'main' ? UI.elements.sceneType : UI.elements.modalSceneType;
        const targetSetting = formType === 'main' ? UI.elements.sceneSetting : UI.elements.modalSceneSetting;
        const targetMoments = formType === 'main' ? UI.elements.dramaticMoments : UI.elements.modalDramaticMoments;
        const targetDescription = formType === 'main' ? UI.elements.descriptionField : UI.elements.modalDescriptionField;

        const currentImageData = State.getCurrentImageData();
        if (!currentImageData || !targetType) {
            Utils.showToast('Error', 'No current image data or form elements missing', true);
            return {};
        }

        // Create a new empty object instead of copying the original to ensure changes replace, not append
        let editedData = {};

        // Preserve image metadata
        if (currentImageData.analysis && currentImageData.analysis.image_metadata) {
            editedData.image_metadata = currentImageData.analysis.image_metadata;
        }

        // Determine format - new or old
        const isNewFormat = currentImageData.analysis && 
            (currentImageData.analysis.type === 'CHARACTER' || 
             currentImageData.analysis.type === 'SCENE');

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
            buildCharacterData(editedData, targetName, targetRole, targetTraits, targetPlots, isNewFormat);
        } else {
            buildSceneData(editedData, targetName, targetSceneType, targetSetting, targetMoments);
        }

        Utils.logDebug('Edited form data', editedData);
        return editedData;
    }
    
    // Public API
    return {
        initialize,
        populateEditForm,
        getEditedDataFromForm
    };
})();

// Image handler module for image-related operations
const ImageHandler = (function() {
    // Initialize image handling
    function initialize() {
        setupEventListeners();
    }
    
    // Set up event listeners specific to image handling
    function setupEventListeners() {
        // Image form submission
        if (UI.elements.imageForm) {
            UI.elements.imageForm.addEventListener('submit', handleImageSubmit);
        }
        
        // Apply changes button
        if (UI.elements.applyChangesBtn) {
            UI.elements.applyChangesBtn.addEventListener('click', handleApplyChanges);
        }
        
        // Save analysis button in modal
        if (UI.elements.saveAnalysisBtn) {
            UI.elements.saveAnalysisBtn.addEventListener('click', handleSaveAnalysis);
        }
        
        // Reanalyze image button
        if (UI.elements.reanalyzeImageBtn) {
            UI.elements.reanalyzeImageBtn.addEventListener('click', handleShowReanalyzeModal);
        }
        
        // Confirm reanalyze button
        if (UI.elements.confirmReanalyzeBtn) {
            UI.elements.confirmReanalyzeBtn.addEventListener('click', handleConfirmReanalyze);
        }
        
        // Handle view details and delete buttons
        document.addEventListener('click', function(e) {
            if (e.target.closest('.view-details-btn')) {
                const button = e.target.closest('.view-details-btn');
                const imageId = button.getAttribute('data-id');
                handleViewDetails(imageId);
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
    }
    
    // Handle image form submission
    function handleImageSubmit(e) {
        e.preventDefault();
        
        const imageUrl = document.getElementById('imageUrl').value;
        if (!imageUrl) {
            Utils.showToast('Error', 'Please enter an image URL', true);
            return;
        }
        
        // Show loading state
        UI.elements.generateBtn.disabled = true;
        UI.elements.generateBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Analyzing...';
        UI.elements.resultDiv.style.display = 'block';
        UI.elements.generatedContent.innerHTML = '<div class="text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div><p>Analyzing image...</p></div>';
        
        // Call the API to analyze the image
        API.analyzeImage(imageUrl)
            .then(data => {
                // Display the generated content
                UI.elements.generatedContent.textContent = JSON.stringify(data.analysis, null, 2);
                
                // Store the image data for later use
                State.setCurrentImageData({
                    image_url: data.image_url,
                    analysis: data.analysis,
                    saved_to_db: data.saved_to_db || false
                });
                
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
                if (UI.elements.editModeSwitch) {
                    UI.elements.editModeSwitch.checked = true;
                    if (UI.elements.editContainer) UI.elements.editContainer.style.display = 'block';
                }
                
                // Add click handler for the save button
                const saveBtn = document.getElementById('saveToDbBtn');
                if (saveBtn) {
                    saveBtn.addEventListener('click', saveToDatabase);
                }
                
                Utils.showToast('Success', 'Image analysis completed', false);
            })
            .catch(error => {
                UI.elements.generatedContent.textContent = 'Error: ' + error.message;
                Utils.showToast('Error', error.message, true);
            })
            .finally(() => {
                // Reset the button state
                if (UI.elements.generateBtn) {
                    UI.elements.generateBtn.disabled = false;
                    UI.elements.generateBtn.innerHTML = '<i class="fas fa-magic me-2"></i>Analyze Image';
                }
            });
    }
    
    // Handle apply changes button
    function handleApplyChanges() {
        if (!State.getCurrentImageData()) return;
        
        const updatedAnalysis = FormHandler.getEditedDataFromForm('main');
        if (Object.keys(updatedAnalysis).length === 0) {
            Utils.showToast('Error', 'Failed to get form data. Please check the form values.', true);
            return;
        }
        
        UI.elements.generatedContent.textContent = JSON.stringify(updatedAnalysis, null, 2);
        const currentData = State.getCurrentImageData();
        currentData.analysis = updatedAnalysis;
        State.setCurrentImageData(currentData);
        
        Utils.showToast('Success', 'Changes applied to analysis. Review before saving.');
    }
    
    // Save analysis to database
    function saveToDatabase() {
        const currentImageData = State.getCurrentImageData();
        if (!currentImageData) {
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
        API.saveAnalysis(currentImageData.image_url, editedData)
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
    }
    
    // Handle view details button
    function handleViewDetails(imageId) {
        API.loadImageDetails(imageId)
            .then(data => {
                // Set modal content
                if (UI.elements.modalImage) UI.elements.modalImage.src = data.image_url;
                if (UI.elements.modalContent) UI.elements.modalContent.textContent = JSON.stringify(data.analysis, null, 2);
                
                // Store current image data
                State.setCurrentImageData({
                    image_id: data.id,
                    image_url: data.image_url,
                    analysis: data.analysis
                });
                
                // Reset edit mode
                if (UI.elements.modalEditModeSwitch) {
                    UI.elements.modalEditModeSwitch.checked = false;
                }
                if (UI.elements.modalEditContainer) {
                    UI.elements.modalEditContainer.style.display = 'none';
                }
                if (UI.elements.saveAnalysisBtn) {
                    UI.elements.saveAnalysisBtn.style.display = 'none';
                }
                
                // Populate the edit form
                FormHandler.populateEditForm(data.analysis, 'modal');
                
                // Show the modal
                if (UI.elements.detailsModal) UI.elements.detailsModal.show();
            })
            .catch(error => {
                Utils.showToast('Error', error.message, true);
            });
    }
    
    // Handle save analysis button (in modal)
    function handleSaveAnalysis() {
        const currentImageData = State.getCurrentImageData();
        if (!currentImageData || !currentImageData.image_id) {
            Utils.showToast('Error', 'No image data to save', true);
            return;
        }
        
        // Get the edited values from the form
        const editedData = FormHandler.getEditedDataFromForm('modal');
        
        // Update the image record
        API.saveAnalysisChanges(currentImageData.image_id, editedData)
            .then(data => {
                Utils.showToast('Success', 'Analysis saved to database', false);
                
                // Refresh images table
                const state = State.getImagePageState();
                DataHandler.loadImages(state.page, state.filter, state.search);
                
                // Close the modal
                if (UI.elements.detailsModal) {
                    UI.elements.detailsModal.hide();
                }
            })
            .catch(error => {
                Utils.showToast('Error', error.message, true);
            });
    }
    
    // Show reanalyze confirmation modal
    function handleShowReanalyzeModal() {
        const currentImageData = State.getCurrentImageData();
        if (!currentImageData || !currentImageData.image_id) {
            Utils.showToast('Error', 'No image selected for reanalysis', true);
            return;
        }
        
        // Show confirmation modal
        const reanalyzeConfirmModal = new bootstrap.Modal(document.getElementById('reanalyzeConfirmModal'));
        reanalyzeConfirmModal.show();
    }
    
    // Handle confirm reanalyze button
    function handleConfirmReanalyze() {
        if (UI.elements.reanalyzeConfirmModal) UI.elements.reanalyzeConfirmModal.hide();
        
        const currentImageData = State.getCurrentImageData();
        if (!currentImageData || !currentImageData.image_id) {
            Utils.showToast('Error', 'No image selected for reanalysis', true);
            return;
        }
        
        // Show loading state
        UI.elements.confirmReanalyzeBtn.disabled = true;
        UI.elements.confirmReanalyzeBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';
        
        const preserveRelationsCheck = document.getElementById('preserveRelationsCheck');
        const preserveRelations = preserveRelationsCheck ? preserveRelationsCheck.checked : true;
        
        // Send reanalysis request
        API.reanalyzeImage(currentImageData.image_id, preserveRelations)
            .then(data => {
                UI.elements.confirmReanalyzeBtn.disabled = false;
                UI.elements.confirmReanalyzeBtn.innerHTML = '<i class="fas fa-sync-alt me-2"></i>Reanalyze';
                
                // Update the modal content
                if (UI.elements.modalContent) {
                    UI.elements.modalContent.textContent = JSON.stringify(data.analysis, null, 2);
                }
                
                // Update current image data
                const updatedData = State.getCurrentImageData();
                updatedData.analysis = data.analysis;
                State.setCurrentImageData(updatedData);
                
                Utils.showToast('Success', 'Image reanalyzed successfully');
                
                // Refresh images table
                const state = State.getImagePageState();
                DataHandler.loadImages(state.page, state.filter, state.search);
                
                // Populate edit form with new data
                FormHandler.populateEditForm(data.analysis, 'modal');
            })
            .catch(error => {
                UI.elements.confirmReanalyzeBtn.disabled = false;
                UI.elements.confirmReanalyzeBtn.innerHTML = '<i class="fas fa-sync-alt me-2"></i>Reanalyze';
                Utils.showToast('Error', 'Failed to reanalyze image: ' + error.message, true);
            });
    }
    
    // Public API
    return {
        initialize,
        handleImageSubmit,
        handleApplyChanges,
        handleViewDetails,
        handleSaveAnalysis,
        handleShowReanalyzeModal,
        handleConfirmReanalyze,
        saveToDatabase
    };
})();

// Data management module for handling data display and manipulation
const DataHandler = (function() {
    // Initialize data handling
    function initialize() {
        setupEventListeners();
    }
    
    // Set up event listeners for data management
    function setupEventListeners() {
        // Database management buttons
        if (UI.elements.refreshImagesBtn) {
            UI.elements.refreshImagesBtn.addEventListener('click', () => {
                const state = State.getImagePageState();
                loadImages(state.page, state.filter, state.search);
            });
        }
        
        if (UI.elements.refreshStoriesBtn) {
            UI.elements.refreshStoriesBtn.addEventListener('click', () => {
                const state = State.getStoryPageState();
                loadStories(state.page, state.search);
            });
        }
        
        if (UI.elements.deleteAllImagesBtn) {
            UI.elements.deleteAllImagesBtn.addEventListener('click', handleDeleteAllImages);
        }
        
        if (UI.elements.deleteAllStoriesBtn) {
            UI.elements.deleteAllStoriesBtn.addEventListener('click', handleDeleteAllStories);
        }
        
        if (UI.elements.runHealthCheckBtn) {
            UI.elements.runHealthCheckBtn.addEventListener('click', runHealthCheck);
        }
        
        // Filter buttons for image type
        if (UI.elements.filterButtons) {
            UI.elements.filterButtons.forEach(button => {
                button.addEventListener('click', function() {
                    // Update active state
                    UI.elements.filterButtons.forEach(btn => btn.classList.remove('active'));
                    button.classList.add('active');
                    
                    // Apply filter
                    const filter = button.getAttribute('data-filter') || '';
                    loadImages(1, filter, State.getImagePageState().search);
                });
            });
        }
        
        // Search functionality for images
        if (UI.elements.imageSearchBtn && UI.elements.imageSearchInput) {
            UI.elements.imageSearchBtn.addEventListener('click', () => {
                const search = UI.elements.imageSearchInput.value.trim();
                loadImages(1, State.getImagePageState().filter, search);
            });
            
            UI.elements.imageSearchInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    const search = UI.elements.imageSearchInput.value.trim();
                    loadImages(1, State.getImagePageState().filter, search);
                }
            });
        }
        
        // Search functionality for stories
        if (UI.elements.storySearchBtn && UI.elements.storySearchInput) {
            UI.elements.storySearchBtn.addEventListener('click', () => {
                const search = UI.elements.storySearchInput.value.trim();
                loadStories(1, search);
            });
            
            UI.elements.storySearchInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    const search = UI.elements.storySearchInput.value.trim();
                    loadStories(1, search);
                }
            });
        }
    }
    
    // Refresh all data
    function refreshData() {
        loadImages(1);
        loadStories(1);
        runHealthCheck();
    }
    
    // Load images with pagination, filtering, and search
    function loadImages(page = 1, filter = '', search = '') {
        if (!UI.elements.imagesTableBody) return;
        
        // Update current state
        State.setImagePageState(page, filter, search);
        
        // Show loading spinner
        UI.elements.imagesTableBody.innerHTML = `
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
                    UI.elements.imagesTableBody.innerHTML = `
                        <tr>
                            <td colspan="6" class="text-center">No image records found</td>
                        </tr>
                    `;
                    if (UI.elements.imagesPagination) UI.elements.imagesPagination.innerHTML = '';
                    return;
                }
                
                // Populate the table
                UI.elements.imagesTableBody.innerHTML = '';
                data.images.forEach(img => {
                    UI.elements.imagesTableBody.innerHTML += `
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
                UI.createPagination(data.pagination, 'images');
            })
            .catch(error => {
                UI.elements.imagesTableBody.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center text-danger">Error loading images: ${error.message}</td>
                    </tr>
                `;
                if (UI.elements.imagesPagination) UI.elements.imagesPagination.innerHTML = '';
                Utils.showToast('Error', error.message, true);
            });
    }
    
    // Load stories with pagination and search
    function loadStories(page = 1, search = '') {
        if (!UI.elements.storiesTableBody) return;
        
        // Update current state
        State.setStoryPageState(page, search);
        
        // Show loading spinner
        UI.elements.storiesTableBody.innerHTML = `
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
                    UI.elements.storiesTableBody.innerHTML = `
                        <tr>
                            <td colspan="7" class="text-center">No story records found</td>
                        </tr>
                    `;
                    if (UI.elements.storiesPagination) UI.elements.storiesPagination.innerHTML = '';
                    return;
                }
                
                // Populate the table
                UI.elements.storiesTableBody.innerHTML = '';
                data.stories.forEach(story => {
                    const charactersList = story.character_names ? story.character_names.join(', ') : 'N/A';
                    
                    UI.elements.storiesTableBody.innerHTML += `
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
                UI.createPagination(data.pagination, 'stories');
            })
            .catch(error => {
                UI.elements.storiesTableBody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center text-danger">Error loading stories: ${error.message}</td>
                    </tr>
                `;
                if (UI.elements.storiesPagination) UI.elements.storiesPagination.innerHTML = '';
                Utils.showToast('Error', error.message, true);
            });
    }
    
    // Delete record function
    function deleteRecord(url, recordType, recordId) {
        // For now, just refresh the tables since the delete endpoint isn't working
        // Remove the row from all tables
        document.querySelectorAll(`tr[data-id="${recordId}"]`).forEach(row => {
            row.remove();
        });
        Utils.showToast('Success', `${recordType} id ${recordId} removed from view`);
        
        // Refresh the appropriate table
        if (recordType === 'image') {
            const state = State.getImagePageState();
            loadImages(state.page, state.filter, state.search);
        } else if (recordType === 'story') {
            const state = State.getStoryPageState();
            loadStories(state.page, state.search);
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
        
        API.runHealthCheck()
            .then(data => {
                if (healthBtn) {
                    healthBtn.disabled = false;
                    healthBtn.innerHTML = '<i class="fas fa-stethoscope me-1"></i>Run Health Check';
                }
                
                // Update statistics
                UI.updateHealthStats(data.stats);
                UI.updateIssues(data.issues, data.has_issues);
                Utils.showToast('Success', 'Health check completed');
            })
            .catch(error => {
                if (healthBtn) {
                    healthBtn.disabled = false;
                    healthBtn.innerHTML = '<i class="fas fa-stethoscope me-1"></i>Run Health Check';
                }
                Utils.showToast('Error', 'Failed to run health check: ' + error.message, true);
            });
    }
    
    // Handle delete all images
    function handleDeleteAllImages() {
        if (confirm('Are you sure you want to delete ALL image records? This action cannot be undone.')) {
            API.deleteAllImages()
                .then(data => {
                    Utils.showToast('Success', data.message);
                    loadImages(1);
                    runHealthCheck();
                })
                .catch(error => {
                    Utils.showToast('Error', error.message, true);
                });
        }
    }
    
    // Handle delete all stories
    function handleDeleteAllStories() {
        if (confirm('Are you sure you want to delete ALL story records? This action cannot be undone.')) {
            API.deleteAllStories()
                .then(data => {
                    Utils.showToast('Success', data.message);
                    loadStories(1);
                    runHealthCheck();
                })
                .catch(error => {
                    Utils.showToast('Error', error.message, true);
                });
        }
    }
    
    // Public API
    return {
        initialize,
        refreshData,
        loadImages,
        loadStories,
        deleteRecord,
        runHealthCheck,
        handleDeleteAllImages,
        handleDeleteAllStories
    };
})();

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    DebugApp.initialize();
});
