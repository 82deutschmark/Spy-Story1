// Debug page JavaScript for managing image analysis and database records
document.addEventListener('DOMContentLoaded', function() {
    // Form elements
    const imageForm = document.getElementById('imageForm');
    const generateBtn = document.getElementById('generateBtn');
    const resultDiv = document.getElementById('result');
    const generatedContent = document.getElementById('generatedContent');
    const copyBtn = document.getElementById('copyBtn');
    const editModeSwitch = document.getElementById('editModeSwitch');
    const editContainer = document.getElementById('editContainer');
    const applyChangesBtn = document.getElementById('applyChangesBtn');
    const saveToDbBtn = document.getElementById('saveToDbBtn');

    // Edit form elements
    const imageName = document.getElementById('imageName');
    const imageType = document.getElementById('imageType');
    const characterRole = document.getElementById('characterRole');
    const characterTraits = document.getElementById('characterTraits');
    const plotLines = document.getElementById('plotLines');
    const codeName = document.getElementById('codeName');
    const characterStyle = document.getElementById('characterStyle');
    const backstory = document.getElementById('backstory');
    const characterFields = document.getElementById('characterFields');
    const sceneFields = document.getElementById('sceneFields');
    const sceneType = document.getElementById('sceneType');
    const sceneSetting = document.getElementById('sceneSetting');
    const dramaticMoments = document.getElementById('dramaticMoments');

    // Detail view elements
    const detailsModal = new bootstrap.Modal(document.getElementById('detailsModal'));
    const modalImage = document.getElementById('modalImage');
    const modalContent = document.getElementById('modalContent');
    const saveAnalysisBtn = document.getElementById('saveAnalysisBtn');
    const reanalyzeImageBtn = document.getElementById('reanalyzeImageBtn');

    // Store current image data
    let currentImageData = null;

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
                    const saveButtonContainer = document.createElement('div');
                    saveButtonContainer.className = 'text-center mt-3';
                    saveButtonContainer.innerHTML = `
                        <button class="btn btn-success" id="saveToDbBtn">
                            <i class="fas fa-save me-2"></i>Save to Database
                        </button>
                    `;

                    // Remove any existing save button
                    const existingSaveButton = document.getElementById('saveToDbBtn');
                    if (existingSaveButton) {
                        existingSaveButton.closest('.text-center').remove();
                    }

                    resultDiv.appendChild(saveButtonContainer);

                    // Populate the edit form with the analysis data
                    populateEditForm(data.analysis);

                    // Enable edit mode by default
                    editModeSwitch.checked = true;
                    editContainer.style.display = 'block';

                    // Add click handler for the save button
                    document.getElementById('saveToDbBtn').addEventListener('click', function() {
                        saveToDatabase();
                    });

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
                generateBtn.disabled = false;
                generateBtn.innerHTML = '<i class="fas fa-magic me-2"></i>Analyze Image';
            });
        });
    }

    // Toggle edit mode
    if (editModeSwitch) {
        editModeSwitch.addEventListener('change', function() {
            if (this.checked) {
                editContainer.style.display = 'block';
            } else {
                editContainer.style.display = 'none';
            }
        });
    }

    // Handle image type change
    if (imageType) {
        imageType.addEventListener('change', function() {
            if (this.value === 'character') {
                characterFields.style.display = 'block';
                sceneFields.style.display = 'none';
            } else {
                characterFields.style.display = 'none';
                sceneFields.style.display = 'block';
            }
        });
    }

    // Copy to clipboard button
    if (copyBtn) {
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

    // View details button handler
    document.addEventListener('click', function(e) {
        if (e.target.closest('.view-details-btn')) {
            const button = e.target.closest('.view-details-btn');
            const imageId = button.getAttribute('data-id');

            fetch(`/api/image/${imageId}`)
                .then(response => response.json())
                .then(data => {
                    if (!data.success) {
                        throw new Error(data.error || 'Failed to load image details');
                    }

                    // Set modal content
                    modalImage.src = data.image_url;
                    modalContent.textContent = JSON.stringify(data.analysis, null, 2);

                    // Store current image data
                    currentImageData = {
                        image_id: data.id,
                        image_url: data.image_url,
                        analysis: data.analysis
                    };

                    // Show the modal
                    detailsModal.show();

                    // Populate the edit form when showing details
                    populateEditForm(data.analysis);
                })
                .catch(error => {
                    showToast('Error', error.message, true);
                });
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
            const editedData = getEditedDataFromForm();

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
                setTimeout(() => {
                    location.reload();
                }, 1500);
            })
            .catch(error => {
                showToast('Error', error.message, true);
            });
        });
    }

    // Function to save analysis to database
    function saveToDatabase() {
        if (!currentImageData) {
            showToast('Error', 'No image data to save', true);
            return;
        }

        const saveBtn = document.getElementById('saveToDbBtn');
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';

        // Get the edited values from the form
        const editedData = getEditedDataFromForm();

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
            saveBtn.innerHTML = '<i class="fas fa-check me-2"></i>Saved';

            // Reload the page after 1.5 seconds
            setTimeout(() => {
                location.reload();
            }, 1500);
        })
        .catch(error => {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-save me-2"></i>Save to Database';
            showToast('Error', error.message, true);
        });
    }

    // Function to get edited data from the form
    function getEditedDataFromForm() {
        // Start with original analysis data
        let editedData = currentImageData ? JSON.parse(JSON.stringify(currentImageData.analysis)) : {};

        // Update with form values
        const isCharacter = imageType.value === 'character';

        // Update image type
        editedData.image_type = imageType.value;

        if (isCharacter) {
            // Character fields
            const name = imageName.value;
            const role = characterRole.value;
            const traits = characterTraits.value.split(',').map(t => t.trim()).filter(t => t);
            const plots = plotLines.value.split('\n').map(p => p.trim()).filter(p => p);

            // Ensure character object exists
            if (!editedData.character) {
                editedData.character = {};
            }

            // Update character fields in both locations for compatibility
            editedData.name = name;
            editedData.character_name = name;
            if (editedData.character) editedData.character.name = name;

            editedData.role = role;
            if (editedData.character) editedData.character.role = role;

            editedData.character_traits = traits;
            if (editedData.character) editedData.character.character_traits = traits;

            editedData.plot_lines = plots;
            if (editedData.character) editedData.character.plot_lines = plots;

            // Additional character fields if present
            if (codeName && codeName.value) {
                editedData.character.code_name = codeName.value;
            }

            if (characterStyle && characterStyle.value) {
                editedData.character.style = characterStyle.value;
                editedData.style = characterStyle.value;
            }

            if (backstory && backstory.value) {
                editedData.character.backstory = backstory.value;
                editedData.backstory = backstory.value;
            }
        } else {
            // Scene fields
            editedData.scene_type = sceneType.value;
            editedData.setting = sceneSetting.value;

            const moments = dramaticMoments.value.split('\n').map(m => m.trim()).filter(m => m);
            editedData.dramatic_moments = moments;

            // Remove character-specific fields for scenes
            delete editedData.character;
            delete editedData.character_name;
            delete editedData.character_traits;
            delete editedData.role;
            delete editedData.plot_lines;
        }

        return editedData;
    }

    // Function to populate the edit form from analysis data
    function populateEditForm(analysis) {
        try {
            // Determine if this is a character or a scene
            const isCharacter = (analysis.image_type === 'character') || 
                             (analysis.character && typeof analysis.character === 'object') ||
                             (analysis.character_traits || analysis.role);

            // Set the image type
            imageType.value = isCharacter ? 'character' : 'scene';

            // Show/hide appropriate fields
            if (isCharacter) {
                characterFields.style.display = 'block';
                sceneFields.style.display = 'none';

                // Extract character data
                const character = analysis.character || analysis;

                // Set name (prioritize nested character name, then top-level)
                imageName.value = character.name || analysis.name || analysis.character_name || '';

                // Set role
                characterRole.value = character.role || analysis.role || 'neutral';

                // Set traits
                const traits = character.character_traits || analysis.character_traits || [];
                characterTraits.value = Array.isArray(traits) ? traits.join(', ') : '';

                // Set plot lines
                const plots = character.plot_lines || analysis.plot_lines || [];
                plotLines.value = Array.isArray(plots) ? plots.join('\n') : '';

                // Additional fields if they exist in the form
                if (codeName) codeName.value = character.code_name || '';
                if (characterStyle) characterStyle.value = character.style || analysis.style || '';
                if (backstory) backstory.value = character.backstory || analysis.backstory || '';
            } else {
                characterFields.style.display = 'none';
                sceneFields.style.display = 'block';

                // Set scene fields
                sceneType.value = analysis.scene_type || 'narrative';
                sceneSetting.value = analysis.setting || '';

                // Set dramatic moments
                const moments = analysis.dramatic_moments || [];
                dramaticMoments.value = Array.isArray(moments) ? moments.join('\n') : '';
            }
        } catch (error) {
            console.error('Error populating edit form:', error);
            showToast('Error', 'Failed to populate edit form: ' + error.message, true);
        }
    }

    // Toast notification function
    function showToast(title, message, isError = false) {
        const toast = new bootstrap.Toast(document.getElementById('notificationToast'));
        document.getElementById('toastTitle').textContent = title;
        document.getElementById('toastMessage').textContent = message;

        const toastElement = document.getElementById('notificationToast');
        if (isError) {
            toastElement.classList.add('bg-danger', 'text-white');
        } else {
            toastElement.classList.remove('bg-danger', 'text-white');
        }

        toast.show();
    }

    // Database management elements
    const refreshImagesBtn = document.getElementById('refreshImagesBtn');
    const refreshStoriesBtn = document.getElementById('refreshStoriesBtn');
    const deleteAllImagesBtn = document.getElementById('deleteAllImagesBtn');
    const deleteAllStoriesBtn = document.getElementById('deleteAllStoriesBtn');
    const imagesTableBody = document.getElementById('imagesTableBody');
    const storiesTableBody = document.getElementById('storiesTableBody');
    const runHealthCheckBtn = document.getElementById('runHealthCheckBtn');

    // Advanced database browser elements
    const loadAllImagesBtn = document.getElementById('loadAllImagesBtn');
    const imageSearchBtn = document.getElementById('imageSearchBtn');
    const imageSearchInput = document.getElementById('imageSearchInput');
    const allImagesTableBody = document.getElementById('allImagesTableBody');
    const imagesPagination = document.getElementById('imagesPagination');
    const filterButtons = document.querySelectorAll('.filter-btn');

    // Story search elements
    const storySearchBtn = document.getElementById('storySearchBtn');
    const storySearchInput = document.getElementById('storySearchInput');
    const allStoriesTableBody = document.getElementById('allStoriesTableBody');
    const storiesPagination = document.getElementById('storiesPagination');

    // Story nodes elements
    const loadNodesBtn = document.getElementById('loadNodesBtn');
    const storyNodesTableBody = document.getElementById('storyNodesTableBody');

    // Reanalysis confirmation modal
    const reanalyzeConfirmModal = new bootstrap.Modal(document.getElementById('reanalyzeConfirmModal'));
    const confirmReanalyzeBtn = document.getElementById('confirmReanalyzeBtn');
    const preserveRelationsCheck = document.getElementById('preserveRelationsCheck');


    // Function to refresh the images list
    function refreshImagesList() {
        const imagesTableBody = document.getElementById('imagesTableBody');
        if (!imagesTableBody) return;

        imagesTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </td>
            </tr>
        `;

        fetch('/api/images/all?per_page=10')
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    showToast('Error', data.error, true);
                    return;
                }

                if (data.images.length === 0) {
                    imagesTableBody.innerHTML = `
                        <tr>
                            <td colspan="6" class="text-center">No image records found</td>
                        </tr>
                    `;
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
            })
            .catch(error => {
                showToast('Error', 'Failed to load images: ' + error.message, true);
            });
    }

    // Function to refresh the stories list
    function refreshStoriesList() {
        if (!storiesTableBody) return;

        storiesTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </td>
            </tr>
        `;

        fetch('/api/stories/all?per_page=10')
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    showToast('Error', data.error, true);
                    return;
                }

                if (data.stories.length === 0) {
                    storiesTableBody.innerHTML = `
                        <tr>
                            <td colspan="6" class="text-center">No story records found</td>
                        </tr>
                    `;
                    return;
                }

                // Populate the table
                storiesTableBody.innerHTML = '';
                data.stories.forEach(story => {
                    storiesTableBody.innerHTML += `
                        <tr data-id="${story.id}">
                            <td>${story.id}</td>
                            <td>${story.conflict}</td>
                            <td>${story.setting}</td>
                            <td>${story.images_count}</td>
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
            })
            .catch(error => {
                showToast('Error', 'Failed to load stories: ' + error.message, true);
            });
    }

    // Handle health check button
    if (runHealthCheckBtn) {
        runHealthCheckBtn.addEventListener('click', function() {
            runHealthCheckBtn.disabled = true;
            runHealthCheckBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Running...';

            fetch('/api/db/health-check')
                .then(response => response.json())
                .then(data => {
                    runHealthCheckBtn.disabled = false;
                    runHealthCheckBtn.innerHTML = '<i class="fas fa-stethoscope me-1"></i>Run Health Check';

                    if (data.error) {
                        showToast('Error', data.error, true);
                        return;
                    }

                    // Update statistics
                    document.getElementById('totalImages').textContent = data.stats.image_count;
                    document.getElementById('characterImages').textContent = data.stats.character_count;
                    document.getElementById('sceneImages').textContent = data.stats.scene_count;
                    document.getElementById('totalStories').textContent = data.stats.story_count;
                    document.getElementById('orphanedImages').textContent = data.stats.orphaned_images;
                    document.getElementById('emptyStories').textContent = data.stats.empty_stories;

                    // Show/hide issues
                    const noIssuesAlert = document.getElementById('noIssuesAlert');
                    const issuesList = document.getElementById('issuesList');

                    if (data.has_issues) {
                        noIssuesAlert.style.display = 'none';
                        issuesList.style.display = 'block';

                        // Populate issues list
                        issuesList.innerHTML = '';
                        data.issues.forEach(issue => {
                            const severityClass = issue.severity === 'error' ? 'danger' : 'warning';
                            issuesList.innerHTML += `
                                <li class="list-group-item list-group-item-${severityClass}">
                                    <i class="fas fa-exclamation-triangle me-2"></i>
                                    ${issue.message}
                                </li>
                            `;
                        });
                    } else {
                        noIssuesAlert.style.display = 'block';
                        issuesList.style.display = 'none';
                    }

                    showToast('Success', 'Health check completed');
                })
                .catch(error => {
                    runHealthCheckBtn.disabled = false;
                    runHealthCheckBtn.innerHTML = '<i class="fas fa-stethoscope me-1"></i>Run Health Check';
                    showToast('Error', 'Failed to run health check: ' + error.message, true);
                });
        });
    }


    // Advanced database browser functionality

    // Load all images with pagination
    function loadAllImages(page = 1, filter = '', search = '') {
        if (!allImagesTableBody) return;

        currentImagePage = page;
        currentImageFilter = filter;
        currentImageSearch = search;

        allImagesTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </td>
            </tr>
        `;

        let url = `/api/images/all?page=${page}&per_page=20`;
        if (filter) url += `&type=${filter}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;

        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    showToast('Error', data.error, true);
                    return;
                }

                if (data.images.length === 0) {
                    allImagesTableBody.innerHTML = `
                        <tr>
                            <td colspan="6" class="text-center">No image records found</td>
                        </tr>
                    `;
                    imagesPagination.innerHTML = '';
                    return;
                }

                // Populate the table
                allImagesTableBody.innerHTML = '';
                data.images.forEach(img => {
                    allImagesTableBody.innerHTML += `
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
                createImagePagination(data.pagination);
            })
            .catch(error => {
                allImagesTableBody.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center text-danger">Error loading images: ${error.message}</td>
                    </tr>
                `;
                imagesPagination.innerHTML = '';
            });
    }

    // Create image pagination controls
    function createImagePagination(pagination) {
        if (!imagesPagination) return;

        imagesPagination.innerHTML = '';

        // Previous button
        const prevItem = document.createElement('li');
        prevItem.className = `page-item ${pagination.page <= 1 ? 'disabled' : ''}`;

        const prevLink = document.createElement('a');
        prevLink.className = 'page-link';
        prevLink.href = '#';
        prevLink.textContent = 'Previous';
        prevLink.setAttribute('aria-label', 'Previous');
        if (pagination.page > 1) {
            prevLink.addEventListener('click', (e) => {
                e.preventDefault();
                loadAllImages(pagination.page - 1, currentImageFilter, currentImageSearch);
            });
        }

        prevItem.appendChild(prevLink);
        imagesPagination.appendChild(prevItem);

        // Page numbers
        const startPage = Math.max(1, pagination.page - 2);
        const endPage = Math.min(pagination.pages, pagination.page + 2);

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
                    loadAllImages(i, currentImageFilter, currentImageSearch);
                });
            }

            pageItem.appendChild(pageLink);
            imagesPagination.appendChild(pageItem);
        }

        // Next button
        const nextItem = document.createElement('li');
        nextItem.className = `page-item ${pagination.page >= pagination.pages ? 'disabled' : ''}`;

        const nextLink = document.createElement('a');
        nextLink.className = 'page-link';
        nextLink.href = '#';
        nextLink.textContent = 'Next';
        nextLink.setAttribute('aria-label', 'Next');
        if (pagination.page < pagination.pages) {
            nextLink.addEventListener('click', (e) => {
                e.preventDefault();
                loadAllImages(pagination.page + 1, currentImageFilter, currentImageSearch);
            });
        }

        nextItem.appendChild(nextLink);
        imagesPagination.appendChild(nextItem);
    }

    // Handle load all images button
    if (loadAllImagesBtn) {
        loadAllImagesBtn.addEventListener('click', () => {
            loadAllImages(1, currentImageFilter, currentImageSearch);
        });
    }

    // Handle image filter buttons
    if (filterButtons) {
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                const filter = button.getAttribute('data-filter');
                loadAllImages(1, filter, currentImageSearch);
            });
        });
    }

    // Handle image search
    if (imageSearchBtn && imageSearchInput) {
        imageSearchBtn.addEventListener('click', () => {
            const search = imageSearchInput.value.trim();
            loadAllImages(1, currentImageFilter, search);
        });

        imageSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const search = imageSearchInput.value.trim();
                loadAllImages(1, currentImageFilter, search);
            }
        });
    }

    // Load all stories with pagination
    function loadAllStories(page = 1, search = '') {
        if (!allStoriesTableBody) return;

        currentStoryPage = page;
        currentStorySearch = search;

        allStoriesTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </td>
            </tr>
        `;

        let url = `/api/stories/all?page=${page}&per_page=20`;
        if (search) url += `&search=${encodeURIComponent(search)}`;

        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    showToast('Error', data.error, true);
                    return;
                }

                if (data.stories.length === 0) {
                    allStoriesTableBody.innerHTML = `
                        <tr>
                            <td colspan="7" class="text-center">No story records found</td>
                        </tr>
                    `;
                    storiesPagination.innerHTML = '';
                    return;
                }

                // Populate the table
                allStoriesTableBody.innerHTML = '';
                data.stories.forEach(story => {
                    const charactersList = story.character_names.join(', ') || 'N/A';

                    allStoriesTableBody.innerHTML += `
                        <tr data-id="${story.id}">
                            <td>${story.id}</td>
                            <td>${story.title}</td>
                            <td>${story.conflict}</td>
                            <td>${story.setting}</td>
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
                createStoryPagination(data.pagination);
            })
            .catch(error => {
                allStoriesTableBody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center text-danger">Error loading stories: ${error.message}</td>
                    </tr>
                `;
                storiesPagination.innerHTML = '';
            });
    }

    // Create story pagination controls
    function createStoryPagination(pagination) {
        if (!storiesPagination) return;

        storiesPagination.innerHTML = '';

        // Previous button
        const prevItem = document.createElement('li');
        prevItem.className = `page-item ${pagination.page <= 1 ? 'disabled' : ''}`;

        const prevLink = document.createElement('a');
        prevLink.className = 'page-link';
        prevLink.href = '#';
        prevLink.textContent = 'Previous';
        prevLink.setAttribute('aria-label', 'Previous');
        if (pagination.page > 1) {
            prevLink.addEventListener('click', (e) => {
                e.preventDefault();
                loadAllStories(pagination.page - 1, currentStorySearch);
            });
        }

        prevItem.appendChild(prevLink);
        storiesPagination.appendChild(prevItem);

        // Page numbers
        const startPage = Math.max(1, pagination.page - 2);
        const endPage = Math.min(pagination.pages, pagination.page + 2);

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
                    loadAllStories(i, currentStorySearch);
                });
            }

            pageItem.appendChild(pageLink);
            storiesPagination.appendChild(pageItem);
        }

        // Next button
        const nextItem = document.createElement('li');
        nextItem.className = `page-item ${pagination.page >= pagination.pages ? 'disabled' : ''}`;

        const nextLink = document.createElement('a');
        nextLink.className = 'page-link';
        nextLink.href = '#';
        nextLink.textContent = 'Next';
        nextLink.setAttribute('aria-label', 'Next');
        if (pagination.page < pagination.pages) {
            nextLink.addEventListener('click', (e) => {
                e.preventDefault();
                loadAllStories(pagination.page + 1, currentStorySearch);
            });
        }

        nextItem.appendChild(nextLink);
        storiesPagination.appendChild(nextItem);
    }

    // Handle story search
    if (storySearchBtn && storySearchInput) {
        storySearchBtn.addEventListener('click', () => {
            const search = storySearchInput.value.trim();
            loadAllStories(1, search);
        });

        storySearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const search = storySearchInput.value.trim();
                loadAllStories(1, search);
            }
        });
    }

    // Load story nodes
    function loadStoryNodes() {
        if (!storyNodesTableBody) return;

        storyNodesTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </td>
            </tr>
        `;

        fetch('/api/story_nodes/all')
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    showToast('Error', data.error, true);
                    return;
                }

                if (data.nodes.length === 0) {
                    storyNodesTableBody.innerHTML = `
                        <tr>
                            <td colspan="6" class="text-center">No story nodes found</td>
                        </tr>
                    `;
                    return;
                }

                // Populate the table
                storyNodesTableBody.innerHTML = '';
                data.nodes.forEach(node => {
                    storyNodesTableBody.innerHTML += `
                        <tr data-id="${node.id}">
                            <td>${node.id}</td>
                            <td>${node.parent_node_id || 'None'}</td>
                            <td>${node.text_preview}</td>
                            <td>${node.choices_count}</td>
                            <td>${node.is_endpoint ? 'Yes' : 'No'}</td>
                            <td>
                                <div class="btn-group">
                                    <button class="btn btn-sm btn-info view-node-btn" data-id="${node.id}" title="View Node">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `;
                });
            })
            .catch(error => {
                storyNodesTableBody.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center text-danger">Error loading story nodes: ${error.message}</td>
                    </tr>
                `;
            });
    }

    // Handle load nodes button
    if (loadNodesBtn) {
        loadNodesBtn.addEventListener('click', loadStoryNodes);
    }

    // Handle reanalyze image button
    if (reanalyzeImageBtn) {
        reanalyzeImageBtn.addEventListener('click', function() {
            if (!currentImageData || !currentImageData.image_id) {
                showToast('Error', 'No image selected for reanalysis', true);
                return;
            }

            // Show confirmation modal
            reanalyzeConfirmModal.show();
        });
    }

    // Handle confirm reanalyze button
    if (confirmReanalyzeBtn) {
        confirmReanalyzeBtn.addEventListener('click', function() {
            reanalyzeConfirmModal.hide();

            if (!currentImageData || !currentImageData.image_id) {
                showToast('Error', 'No image selected for reanalysis', true);
                return;
            }

            // Show loading state
            confirmReanalyzeBtn.disabled = true;
            confirmReanalyzeBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';

            const preserveRelations = preserveRelationsCheck.checked;

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
                    showToast('Error', data.error, true);
                    return;
                }

                // Update the modal content
                modalContent.textContent = JSON.stringify(data.analysis, null, 2);

                // Update current image data
                currentImageData.analysis = data.analysis;

                showToast('Success', 'Image reanalyzed successfully');

                // Refresh image tables
                refreshImagesList();
                loadAllImages(currentImagePage, currentImageFilter, currentImageSearch);
            })
            .catch(error => {
                confirmReanalyzeBtn.disabled = false;
                confirmReanalyzeBtn.innerHTML = '<i class="fas fa-sync-alt me-2"></i>Reanalyze';
                showToast('Error', 'Failed to reanalyze image: ' + error.message, true);
            });
        });
    }

    // Initial loading of data
    if (imagesTableBody) refreshImagesList();
    if (storiesTableBody) refreshStoriesList();
    if (allImagesTableBody) loadAllImages();
    if (allStoriesTableBody) loadAllStories();
    if (storyNodesTableBody) loadStoryNodes();
});

//This section was already present in the original code. No changes were made.
document.addEventListener('DOMContentLoaded', function() {
    // Form elements
    const imageForm = document.getElementById('imageForm');
    const generateBtn = document.getElementById('generateBtn');
    const resultDiv = document.getElementById('result');
    const generatedContent = document.getElementById('generatedContent');
    const copyBtn = document.getElementById('copyBtn');

    // Detail view elements
    const viewDetailsBtns = document.querySelectorAll('.view-details-btn');
    const deleteImageBtns = document.querySelectorAll('.delete-image-btn');
    const deleteStoryBtns = document.querySelectorAll('.delete-story-btn');

    // Database management buttons
    const deleteAllImagesBtn = document.getElementById('deleteAllImagesBtn');
    const deleteAllStoriesBtn = document.getElementById('deleteAllStoriesBtn');
    const refreshImagesBtn = document.getElementById('refreshImagesBtn');
    const refreshStoriesBtn = document.getElementById('refreshStoriesBtn');
    const runHealthCheckBtn = document.getElementById('runHealthCheckBtn');

    // Enhanced view details button functionality
    viewDetailsBtns.forEach(btn => {
        btn.addEventListener('click', async function() {
            const id = this.getAttribute('data-id');
            const modal = document.getElementById('detailsModal');
            const editContainer = modal.querySelector('#editContainer');
            const modalContent = modal.querySelector('#modalContent');
            const saveBtn = modal.querySelector('#saveAnalysisBtn');
            const editModeSwitch = modal.querySelector('#editModeSwitch');

            try {
                const response = await fetch(`/api/image/${id}`);
                const data = await response.json();

                if (data.success) {
                    // Set image and initial content
                    document.getElementById('modalImage').src = data.image_url;
                    modalContent.textContent = JSON.stringify(data.analysis, null, 2);

                    // Setup edit mode switch
                    editModeSwitch.addEventListener('change', function() {
                        if (this.checked) {
                            modalContent.contentEditable = 'true';
                            modalContent.classList.add('editable');
                            saveBtn.style.display = 'block';
                            editContainer.style.display = 'block';
                            populateEditFields(data.analysis);
                        } else {
                            modalContent.contentEditable = 'false';
                            modalContent.classList.remove('editable');
                            saveBtn.style.display = 'none';
                            editContainer.style.display = 'none';
                        }
                    });

                    // Setup save button
                    saveBtn.addEventListener('click', async function() {
                        try {
                            let updatedAnalysis;
                            try {
                                updatedAnalysis = JSON.parse(modalContent.textContent);
                            } catch (parseError) {
                                throw new Error('Invalid JSON format in the editor');
                            }

                            const saveResponse = await fetch('/api/save_analysis', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                    image_id: id,
                                    analysis: updatedAnalysis
                                })
                            });

                            const result = await saveResponse.json();
                            if (result.success) {
                                showToast('Success', 'Analysis updated successfully');
                                setTimeout(() => location.reload(), 1000);
                            } else {
                                throw new Error(result.error || 'Failed to save changes');
                            }
                        } catch (error) {
                            showToast('Error', error.message);
                        }
                    });

                    // Show modal
                    new bootstrap.Modal(modal).show();
                } else {
                    throw new Error(data.error || 'Failed to fetch image details');
                }
            } catch (error) {
                showToast('Error', error.message);
            }
        });
    });

    // Show toast notification
    function showToast(title, message) {
        const toast = new bootstrap.Toast(document.getElementById('notificationToast'));
        document.getElementById('toastTitle').textContent = title;
        document.getElementById('toastMessage').textContent = message;
        toast.show();
    }

    // Update database stats in the health tab
    function updateStats(stats) {
        document.getElementById('totalImages').textContent = stats.image_count;
        document.getElementById('characterImages').textContent = stats.character_count;
        document.getElementById('sceneImages').textContent = stats.scene_count;
        document.getElementById('totalStories').textContent = stats.story_count;
        document.getElementById('orphanedImages').textContent = stats.orphaned_images;
        document.getElementById('emptyStories').textContent = stats.empty_stories;
    }

    // Update issues list in the health tab
    function updateIssues(issues, hasIssues) {
        const noIssuesAlert = document.getElementById('noIssuesAlert');
        const issuesList = document.getElementById('issuesList');

        if (hasIssues) {
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

    // Run health check function
    function runHealthCheck() {
        fetch('/api/db/health-check')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    updateStats(data.stats);
                    updateIssues(data.issues, data.has_issues);
                    showToast('Health Check', 'Database health check completed successfully');
                } else {
                    throw new Error(data.error || 'Failed to run health check');
                }
            })
            .catch(error => {
                showToast('Error', error.message);
            });
    }

    // Delete record function
    function deleteRecord(url, recordType, recordId) {
        if (confirm(`Are you sure you want to delete this ${recordType}? This action cannot be undone.`)) {
            fetch(url, {
                method: 'DELETE'
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Remove the row from the table
                    const row = document.querySelector(`tr[data-id="${recordId}"]`);
                    if (row) {
                        row.remove();
                    }
                    showToast('Success', data.message);
                } else {
                    throw new Error(data.error || `Failed to delete ${recordType}`);
                }
            })
            .catch(error => {
                showToast('Error', error.message);
            });
        }
    }

    // Determine if this is a character analysis
    function determineIfCharacter(analysis) {
        if (analysis.image_type === 'character') return true;
        if (analysis.image_type === 'scene') return false;

        // Try to infer from contents
        if (analysis.character && typeof analysis.character === 'object') return true;
        if (analysis.character_name || analysis.character_traits) return true;
        if (analysis.scene_type || analysis.dramatic_moments) return false;

        // Default to character
        return true;
    }

    // Populate edit fields with data from analysis
    function populateEditFields(analysis) {
        const imageName = document.getElementById('imageName');
        const imageType = document.getElementById('imageType');
        const characterRole = document.getElementById('characterRole');
        const characterTraits = document.getElementById('characterTraits');
        const plotLines = document.getElementById('plotLines');
        const sceneType = document.getElementById('sceneType');
        const sceneSetting = document.getElementById('sceneSetting');
        const dramaticMoments = document.getElementById('dramaticMoments');

        // Determine if this is a character or scene
        let isCharacter = determineIfCharacter(analysis);

        // Set image type
        imageType.value = isCharacter ? 'character' : 'scene';

        // Toggle appropriate fields
        if (isCharacter) {
            document.getElementById('characterFields').style.display = 'block';
            document.getElementById('sceneFields').style.display = 'none';
        } else {
            document.getElementById('characterFields').style.display = 'none';
            document.getElementById('sceneFields').style.display = 'block';
        }

        // Extract name
        let name = '';
        if (isCharacter) {
            if (analysis.character && analysis.character.name) {
                name = analysis.character.name;
            } else if (analysis.character_name) {
                name = analysis.character_name;
            } else if (analysis.name) {
                name = analysis.name;
            }
        } else {
            name = analysis.setting || '';
        }
        imageName.value = name;

        // Extract character-specific fields
        if (isCharacter) {
            let role = '';
            if (analysis.character && analysis.character.role) {
                role = analysis.character.role;
            } else if (analysis.role) {
                role = analysis.role;
            }
            characterRole.value = role || 'neutral';

            let traits = [];
            if (analysis.character && analysis.character.character_traits) {
                traits = analysis.character.character_traits;
            } else if (analysis.character_traits) {
                traits = analysis.character_traits;
            }
            characterTraits.value = Array.isArray(traits) ? traits.join(', ') : traits;

            let plots = [];
            if (analysis.character && analysis.character.plot_lines) {
                plots = analysis.character.plot_lines;
            } else if (analysis.plot_lines) {
                plots = analysis.plot_lines;
            }
            plotLines.value = Array.isArray(plots) ? plots.join('\n') : plots;
        }
        // Extract scene-specific fields
        else {
            sceneType.value = analysis.scene_type || 'narrative';
            sceneSetting.value = analysis.setting || '';

            let moments = analysis.dramatic_moments || [];
            dramaticMoments.value = Array.isArray(moments) ? moments.join('\n') : moments;
        }
    }

    // Apply edits from form to analysis object
    function applyEditsToAnalysis(originalAnalysis) {
        // Clone the original analysis to avoid modifying it directly
        const analysis = JSON.parse(JSON.stringify(originalAnalysis));

        const imageName = document.getElementById('imageName').value;
        const imageType = document.getElementById('imageType').value;
        const characterRole = document.getElementById('characterRole').value;
        const characterTraits = document.getElementById('characterTraits').value;
        const plotLines = document.getElementById('plotLines').value;
        const sceneType = document.getElementById('sceneType').value;
        const sceneSetting = document.getElementById('sceneSetting').value;
        const dramaticMoments = document.getElementById('dramaticMoments').value;

        // Update image type
        analysis.image_type = imageType;

        if (imageType === 'character') {
            // Update character fields

            // Ensure character object exists
            if (!analysis.character) {
                analysis.character = {};
            }

            // Update name in all possible locations
            analysis.name = imageName;
            analysis.character_name = imageName;
            analysis.character.name = imageName;

            // Update role
            analysis.role = characterRole;
            analysis.character.role = characterRole;

            // Update traits - convert comma separated string to array
            const traitsArray = characterTraits.split(',').map(t => t.trim()).filter(t => t);
            analysis.character_traits = traitsArray;
            analysis.character.character_traits = traitsArray;

            // Update plot lines - convert newline separated string to array
            const plotArray = plotLines.split('\n').map(p => p.trim()).filter(p => p);
            analysis.plot_lines = plotArray;
            analysis.character.plot_lines = plotArray;

            // Clean up scene-specific fields
            delete analysis.scene_type;
            delete analysis.setting;
            delete analysis.dramatic_moments;
        } else {
            // Update scene fields
            analysis.scene_type = sceneType;
            analysis.setting = sceneSetting;

            // Update dramatic moments - convert newline separated string to array
            const momentsArray = dramaticMoments.split('\n').map(m => m.trim()).filter(m => m);
            analysis.dramatic_moments = momentsArray;

            // Clean up character-specific fields
            delete analysis.character;
            delete analysis.character_name;
            delete analysis.character_traits;
            delete analysis.role;
            delete analysis.plot_lines;
            analysis.name = sceneSetting;
        }

        return analysis;
    }

    // Get the edited analysis for saving
    function getEditedAnalysis(originalAnalysis) {
        // If edit mode is not enabled, return the original
        const editModeSwitch = document.getElementById('editModeSwitch');
        if (!editModeSwitch.checked) {
            return originalAnalysis;
        }

        // Apply edits and return the modified analysis
        return applyEditsToAnalysis(originalAnalysis);
    }

    // Function to setup the analysis editing UI
    function setupAnalysisEditing(analysis) {
        const editModeSwitch = document.getElementById('editModeSwitch');
        const editContainer = document.getElementById('editContainer');
        const imageTypeSelect = document.getElementById('imageType');
        const characterFields = document.getElementById('characterFields');
        const sceneFields = document.getElementById('sceneFields');
        const applyChangesBtn = document.getElementById('applyChangesBtn');

        // Populate edit fields with current analysis data
        populateEditFields(analysis);

        // Event listeners for edit mode toggle
        editModeSwitch.addEventListener('change', function() {
            if (this.checked) {
                editContainer.style.display = 'block';
            } else {
                editContainer.style.display = 'none';
            }
        });

        // Event listener for image type change
        imageTypeSelect.addEventListener('change', function() {
            if (this.value === 'character') {
                characterFields.style.display = 'block';
                sceneFields.style.display = 'none';
            } else {
                characterFields.style.display = 'none';
                sceneFields.style.display = 'block';
            }
        });

        // Event listener for apply changes button
        applyChangesBtn.addEventListener('click', function() {
            const generatedContent = document.getElementById('generatedContent');
            const updatedAnalysis = applyEditsToAnalysis(analysis);
            // Replace the content entirely instead of appending
            generatedContent.textContent = JSON.stringify(updatedAnalysis, null, 2);
            // Update the original analysis object with the edited version
            analysis = updatedAnalysis;
            showToast('Success', 'Changes applied to analysis. Review before saving.');
        });
    }

    // Initialize image analysis form
    if (imageForm && generateBtn) {
        imageForm.addEventListener('submit', function(e) {
            // Prevent the default form submission that would reload the page
            e.preventDefault();

            const formData = new FormData(imageForm);
            const imageUrl = formData.get('image_url');

            if (!imageUrl || !imageUrl.trim()) {
                showToast('Error', 'Please enter a valid image URL');
                return;
            }

            // Disable button and show loading indicator
            generateBtn.disabled = true;
            generateBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Analyzing...';

            fetch('/generate', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Display the results
                    resultDiv.style.display = 'block';

                    // Add save confirmation button if not already saved
                    if (!data.saved_to_db) {
                        const saveDiv = document.createElement('div');
                        saveDiv.className = 'text-center mt-3';
                        saveDiv.innerHTML = `
                            <div class="alert alert-info mb-3">
                                <i class="fas fa-info-circle me-2"></i>
                                Please review the analysis results above before saving to the database.
                            </div>
                            <button class="btn btn-success" id="saveAnalysisBtn">
                                <i class="fas fa-save me-2"></i>Save to Database
                            </button>
                            <button class="btn btn-outline-secondary ms-2" id="rejectAnalysisBtn">
                                <i class="fas fa-times me-2"></i>Reject Analysis
                            </button>
                        `;
                        resultDiv.appendChild(saveDiv);

                        // Add click handler for save button
                        document.getElementById('saveAnalysisBtn').addEventListener('click', function() {
                            this.disabled = true;
                            this.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
                            document.getElementById('rejectAnalysisBtn').disabled = true;

                            // Use the function defined above to get edited analysis
                            let editedAnalysis = data.analysis;
                            if (document.getElementById('editModeSwitch').checked) {
                                editedAnalysis = applyEditsToAnalysis(data.analysis);
                            }

                            // Send the analysis to be saved
                            fetch('/save_analysis', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                    image_url: data.image_url,
                                    analysis: editedAnalysis
                                })
                            })
                            .then(response => {
                                if (!response.ok) {
                                    throw new Error(`Server returned ${response.status}: ${response.statusText}`);
                                }
                                return response.json();
                            })
                            .then(saveData => {
                                if (saveData.success) {
                                    this.innerHTML = '<i class="fas fa-check me-2"></i>Saved';
                                    showToast('Success', 'Analysis saved to database.');

                                    // Don't automatically refresh images table after saving
                                    // Let the user manually refresh when they're ready

                                } else {
                                    this.disabled = false;
                                    this.innerHTML = '<i class="fas fa-save me-2"></i>Save to Database';
                                    showToast('Error', saveData.error || 'Error saving analysis.');
                                }
                            })
                            .catch(error => {
                                console.error("Save error:", error);
                                this.disabled = false;
                                this.innerHTML = '<i class="fas fa-save me-2"></i>Save to Database';
                                document.getElementById('rejectAnalysisBtn').disabled = false;
                                showToast('Error', `Failed to save analysis: ${error.message}`);
                            });
                        });

                        // Add click handler for reject button
                        document.getElementById('rejectAnalysisBtn').addEventListener('click', function() {
                            // Remove the save confirmation area
                            saveDiv.remove();
                            showToast('Info', 'Analysis rejected. You can try analyzing the image again.');
                        });
                    }
                    generatedContent.textContent = JSON.stringify(data.analysis, null, 2);
                    showToast('Success', 'Image analysis completed. Review and edit results before saving.');

                    // Setup analysis editing UI
                    setupAnalysisEditing(data.analysis);
                } else {
                    throw new Error(data.error || 'An error occurred during analysis.');
                }
            })
            .catch(error => {
                showToast('Error', error.message);
            })
            .finally(() => {
                // Reset button state
                generateBtn.disabled = false;
                generateBtn.innerHTML = '<i class="fas fa-magic me-2"></i>Analyze Image';
            });
        });
    }

    // Copy button
    if (copyBtn) {
        copyBtn.addEventListener('click', function() {
            const content = generatedContent.textContent;
            navigator.clipboard.writeText(content)
                .then(() => {
                    showToast('Success', 'Content copied to clipboard!');
                })
                .catch(err => {
                    showToast('Error', 'Failed to copy: ' + err);
                });
        });
    }


    // Delete image buttons
    if (deleteImageBtns.length > 0) {
        deleteImageBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                deleteRecord(`/api/image/${id}`, 'image', id);
            });
        });
    }

    // Delete story buttons
    if (deleteStoryBtns.length > 0) {
        deleteStoryBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                deleteRecord(`/api/story/${id}`, 'story', id);
            });
        });
    }

    // Delete all images button
    if (deleteAllImagesBtn) {
        deleteAllImagesBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to delete ALL image records? This action cannot be undone.')) {
                fetch('/api/db/delete-all-images', {
                    method: 'POST'
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Clear the table
                        const tableBody = document.getElementById('imagesTableBody');
                        if (tableBody) {
                            tableBody.innerHTML = '';
                        }
                        showToast('Success', data.message);

                        // Run health check
                        runHealthCheck();
                    } else {
                        throw new Error(data.error || 'Failed to delete all images');
                    }
                })
                .catch(error => {
                    showToast('Error', error.message);
                });
            }
        });
    }

    // Delete all stories button
    if (deleteAllStoriesBtn) {
        deleteAllStoriesBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to delete ALL story records? This action cannot be undone.')) {
                fetch('/api/db/delete-all-stories', {
                    method: 'POST'
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Clear the table
                        const tableBody = document.getElementById('storiesTableBody');
                        if (tableBody) {
                            tableBody.innerHTML = '';
                        }
                        showToast('Success', data.message);

                        // Run health check
                        runHealthCheck();
                    } else {
                        throw new Error(data.error || 'Failed to delete all stories');
                    }
                })
                .catch(error => {
                    showToast('Error', error.message);
                });
            }
        });
    }

    // Refresh images button
    if (refreshImagesBtn) {
        refreshImagesBtn.addEventListener('click', function() {
            location.reload();
        });
    }

    // Refresh stories button
    if (refreshStoriesBtn) {
        refreshStoriesBtn.addEventListener('click', function() {
            location.reload();
        });
    }

    // Run health check button
    if (runHealthCheckBtn) {
        runHealthCheckBtn.addEventListener('click', function() {
            runHealthCheckBtn.disabled = true;
            runHealthCheckBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Running...';

            runHealthCheck();

            setTimeout(() => {
                runHealthCheckBtn.disabled = false;
                runHealthCheckBtn.innerHTML = '<i class="fas fa-stethoscope me-1"></i>Run Health Check';
            }, 1000);
        });

        // Run a health check on page load
        runHealthCheck();
    }
});