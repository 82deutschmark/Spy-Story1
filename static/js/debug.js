// Debug page JavaScript for managing image analysis and database records

document.addEventListener('DOMContentLoaded', function() {
    // Image analysis form
    const imageForm = document.getElementById('imageForm');
    const imageUrl = document.getElementById('imageUrl');
    const generateBtn = document.getElementById('generateBtn');
    const result = document.getElementById('result');
    const generatedContent = document.getElementById('generatedContent');
    const copyBtn = document.getElementById('copyBtn');
    const editModeSwitch = document.getElementById('editModeSwitch');
    const editContainer = document.getElementById('editContainer');
    const applyChangesBtn = document.getElementById('applyChangesBtn');

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

    // Modal elements
    const detailsModal = new bootstrap.Modal(document.getElementById('detailsModal'));
    const modalImage = document.getElementById('modalImage');
    const modalContent = document.getElementById('modalContent');
    const saveAnalysisBtn = document.getElementById('saveAnalysisBtn');
    const reanalyzeImageBtn = document.getElementById('reanalyzeImageBtn');

    // Reanalysis confirmation modal
    const reanalyzeConfirmModal = new bootstrap.Modal(document.getElementById('reanalyzeConfirmModal'));
    const confirmReanalyzeBtn = document.getElementById('confirmReanalyzeBtn');
    const preserveRelationsCheck = document.getElementById('preserveRelationsCheck');

    // Toast notification
    const notificationToast = new bootstrap.Toast(document.getElementById('notificationToast'));
    const toastTitle = document.getElementById('toastTitle');
    const toastMessage = document.getElementById('toastMessage');

    // Current image data for editing
    let currentImageData = null;

    // Pagination state
    let currentImagePage = 1;
    let currentStoryPage = 1;
    let currentImageFilter = '';
    let currentImageSearch = '';
    let currentStorySearch = '';

    // Show notification toast
    function showNotification(title, message, isError = false) {
        toastTitle.textContent = title;
        toastMessage.textContent = message;

        const toastElement = document.getElementById('notificationToast');
        if (isError) {
            toastElement.classList.add('bg-danger', 'text-white');
        } else {
            toastElement.classList.remove('bg-danger', 'text-white');
        }

        notificationToast.show();
    }

    // Handle image analysis form submission
    if (imageForm) {
        imageForm.addEventListener('submit', function(e) {
            e.preventDefault();

            if (!imageUrl.value) {
                showNotification('Error', 'Please enter an image URL', true);
                return;
            }

            // Show loading state
            generateBtn.disabled = true;
            generateBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Analyzing...';

            // Send request to analyze image
            fetch('/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    'image_url': imageUrl.value
                })
            })
            .then(response => response.json())
            .then(data => {
                // Reset loading state
                generateBtn.disabled = false;
                generateBtn.innerHTML = '<i class="fas fa-magic me-2"></i>Analyze Image';

                if (data.error) {
                    showNotification('Error', data.error, true);
                    return;
                }

                // Show the result
                result.style.display = 'block';

                // Format the JSON for display
                const prettyJson = JSON.stringify(data.analysis, null, 2);
                generatedContent.textContent = prettyJson;

                // Store the current image data
                currentImageData = {
                    image_url: data.image_url,
                    analysis: data.analysis
                };

                // Reset edit mode
                editModeSwitch.checked = false;
                editContainer.style.display = 'none';
            })
            .catch(error => {
                generateBtn.disabled = false;
                generateBtn.innerHTML = '<i class="fas fa-magic me-2"></i>Analyze Image';
                showNotification('Error', 'Failed to analyze image: ' + error.message, true);
            });
        });
    }

    // Handle copy button click
    if (copyBtn) {
        copyBtn.addEventListener('click', function() {
            navigator.clipboard.writeText(generatedContent.textContent)
                .then(() => {
                    showNotification('Success', 'Analysis copied to clipboard');
                })
                .catch(err => {
                    showNotification('Error', 'Failed to copy: ' + err.message, true);
                });
        });
    }

    // Handle edit mode toggle
    if (editModeSwitch) {
        editModeSwitch.addEventListener('change', function() {
            if (this.checked) {
                editContainer.style.display = 'block';
                saveAnalysisBtn.style.display = 'block';

                // Parse the current analysis JSON
                try {
                    const analysis = JSON.parse(generatedContent.textContent);

                    // Populate the form fields
                    document.getElementById('imageName').value = 
                        analysis.character?.name || 
                        analysis.name || 
                        analysis.character_name || 
                        '';

                    // Determine if character or scene
                    const isCharacter = 
                        (analysis.character && typeof analysis.character === 'object') || 
                        analysis.character_traits || 
                        (analysis.role && ['protagonist', 'antagonist', 'neutral', 'villain', 'hero'].includes(analysis.role));

                    document.getElementById('imageType').value = isCharacter ? 'character' : 'scene';
                    toggleTypeFields();

                    if (isCharacter) {
                        // Fill character fields
                        document.getElementById('characterRole').value = 
                            analysis.character?.role || 
                            analysis.role || 
                            'neutral';

                        document.getElementById('characterTraits').value = 
                            (Array.isArray(analysis.character_traits) ? analysis.character_traits.join(', ') : '') || 
                            (Array.isArray(analysis.character?.character_traits) ? analysis.character.character_traits.join(', ') : '');

                        document.getElementById('plotLines').value = 
                            (Array.isArray(analysis.plot_lines) ? analysis.plot_lines.join('\n') : '') || 
                            (Array.isArray(analysis.character?.plot_lines) ? analysis.character.plot_lines.join('\n') : '');
                    } else {
                        // Fill scene fields
                        document.getElementById('sceneType').value = analysis.scene_type || 'narrative';
                        document.getElementById('sceneSetting').value = analysis.setting || '';
                        document.getElementById('dramaticMoments').value = 
                            (Array.isArray(analysis.dramatic_moments) ? analysis.dramatic_moments.join('\n') : '');
                    }

                } catch (error) {
                    showNotification('Error', 'Failed to parse analysis JSON: ' + error.message, true);
                }
            } else {
                editContainer.style.display = 'none';
                saveAnalysisBtn.style.display = 'none';
            }
        });
    }

    // Toggle fields based on image type
    document.getElementById('imageType')?.addEventListener('change', toggleTypeFields);

    function toggleTypeFields() {
        const imageType = document.getElementById('imageType').value;
        const characterFields = document.getElementById('characterFields');
        const sceneFields = document.getElementById('sceneFields');

        if (imageType === 'character') {
            characterFields.style.display = 'block';
            sceneFields.style.display = 'none';
        } else {
            characterFields.style.display = 'none';
            sceneFields.style.display = 'block';
        }
    }

    // Handle apply changes button click
    if (applyChangesBtn) {
        applyChangesBtn.addEventListener('click', function() {
            try {
                // Get the original analysis
                const analysis = JSON.parse(generatedContent.textContent);

                // Get form values
                const imageType = document.getElementById('imageType').value;
                const name = document.getElementById('imageName').value;

                // Update the analysis based on image type
                if (imageType === 'character') {
                    const role = document.getElementById('characterRole').value;
                    const traitsText = document.getElementById('characterTraits').value;
                    const plotLinesText = document.getElementById('plotLines').value;

                    // Parse traits and plot lines
                    const traits = traitsText.split(',').map(t => t.trim()).filter(t => t);
                    const plotLines = plotLinesText.split('\n').map(p => p.trim()).filter(p => p);

                    // Create or update character data
                    if (!analysis.character) {
                        analysis.character = {};
                    }

                    // Update nested and top-level properties for maximum compatibility
                    analysis.character.name = name;
                    analysis.name = name;
                    analysis.character_name = name;

                    analysis.character.role = role;
                    analysis.role = role;

                    analysis.character.character_traits = traits;
                    analysis.character_traits = traits;

                    analysis.character.plot_lines = plotLines;
                    analysis.plot_lines = plotLines;

                } else {
                    // Scene fields
                    const sceneType = document.getElementById('sceneType').value;
                    const setting = document.getElementById('sceneSetting').value;
                    const dramaticMomentsText = document.getElementById('dramaticMoments').value;

                    // Parse dramatic moments
                    const dramaticMoments = dramaticMomentsText.split('\n').map(m => m.trim()).filter(m => m);

                    // Update scene properties
                    analysis.name = name;
                    analysis.scene_type = sceneType;
                    analysis.setting = setting;
                    analysis.dramatic_moments = dramaticMoments;

                    // Remove character-specific fields
                    delete analysis.character;
                    delete analysis.character_name;
                    delete analysis.character_traits;
                    delete analysis.role;
                    delete analysis.plot_lines;
                }

                // Update the displayed JSON
                const prettyJson = JSON.stringify(analysis, null, 2);
                generatedContent.textContent = prettyJson;

                // Update current image data
                currentImageData.analysis = analysis;

                showNotification('Success', 'Analysis updated');

            } catch (error) {
                showNotification('Error', 'Failed to update analysis: ' + error.message, true);
            }
        });
    }

    // Handle save analysis button click for updating existing records
    if (saveAnalysisBtn) {
        saveAnalysisBtn.addEventListener('click', function() {
            if (!currentImageData) {
                showNotification('Error', 'No image data to save', true);
                return;
            }

            // If this is a new analysis, save it to the database
            if (!currentImageData.image_id) {
                fetch('/save_analysis', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        image_url: currentImageData.image_url,
                        analysis: JSON.parse(generatedContent.textContent)
                    })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.error) {
                        showNotification('Error', data.error, true);
                        return;
                    }

                    showNotification('Success', 'Analysis saved to database');
                    currentImageData.image_id = data.image_id;

                    // Refresh the images table
                    refreshImagesList();
                })
                .catch(error => {
                    showNotification('Error', 'Failed to save analysis: ' + error.message, true);
                });
            } else {
                // This is an existing record, update it
                fetch('/api/save_analysis', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        image_id: currentImageData.image_id,
                        analysis: JSON.parse(generatedContent.textContent)
                    })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.error) {
                        showNotification('Error', data.error, true);
                        return;
                    }

                    showNotification('Success', 'Analysis updated');

                    // Refresh the images table
                    refreshImagesList();
                })
                .catch(error => {
                    showNotification('Error', 'Failed to update analysis: ' + error.message, true);
                });
            }
        });
    }

    // Handle view details button click (delegated to parent)
    document.addEventListener('click', function(e) {
        if (e.target.closest('.view-details-btn')) {
            const button = e.target.closest('.view-details-btn');
            const imageId = button.getAttribute('data-id');

            fetch(`/api/image/${imageId}`)
                .then(response => response.json())
                .then(data => {
                    if (data.error) {
                        showNotification('Error', data.error, true);
                        return;
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

                    // Reset edit mode
                    document.getElementById('editModeSwitch').checked = false;
                    saveAnalysisBtn.style.display = 'none';

                    // Show the modal
                    detailsModal.show();
                })
                .catch(error => {
                    showNotification('Error', 'Failed to load image details: ' + error.message, true);
                });
        }
    });

    // Handle delete image button click (delegated)
    document.addEventListener('click', function(e) {
        if (e.target.closest('.delete-image-btn')) {
            const button = e.target.closest('.delete-image-btn');
            const imageId = button.getAttribute('data-id');

            if (confirm('Are you sure you want to delete this image record?')) {
                fetch(`/api/image/${imageId}`, {
                    method: 'DELETE'
                })
                .then(response => response.json())
                .then(data => {
                    if (data.error) {
                        showNotification('Error', data.error, true);
                        return;
                    }

                    showNotification('Success', data.message);

                    // Remove the row from the table
                    const row = button.closest('tr');
                    if (row) {
                        row.remove();
                    }

                    // Refresh both image tables
                    refreshImagesList();
                    loadAllImages();
                })
                .catch(error => {
                    showNotification('Error', 'Failed to delete image: ' + error.message, true);
                });
            }
        }
    });

    // Handle delete story button click (delegated)
    document.addEventListener('click', function(e) {
        if (e.target.closest('.delete-story-btn')) {
            const button = e.target.closest('.delete-story-btn');
            const storyId = button.getAttribute('data-id');

            if (confirm('Are you sure you want to delete this story record?')) {
                fetch(`/api/story/${storyId}`, {
                    method: 'DELETE'
                })
                .then(response => response.json())
                .then(data => {
                    if (data.error) {
                        showNotification('Error', data.error, true);
                        return;
                    }

                    showNotification('Success', data.message);

                    // Remove the row from the table
                    const row = button.closest('tr');
                    if (row) {
                        row.remove();
                    }

                    // Refresh story tables
                    refreshStoriesList();
                    loadAllStories();
                })
                .catch(error => {
                    showNotification('Error', 'Failed to delete story: ' + error.message, true);
                });
            }
        }
    });

    // Handle delete all images button
    if (deleteAllImagesBtn) {
        deleteAllImagesBtn.addEventListener('click', function() {
            if (confirm('WARNING: Are you sure you want to delete ALL image records? This cannot be undone.')) {
                fetch('/api/db/delete-all-images', {
                    method: 'POST'
                })
                .then(response => response.json())
                .then(data => {
                    if (data.error) {
                        showNotification('Error', data.error, true);
                        return;
                    }

                    showNotification('Success', data.message);

                    // Refresh image tables
                    refreshImagesList();
                    loadAllImages();
                })
                .catch(error => {
                    showNotification('Error', 'Failed to delete all images: ' + error.message, true);
                });
            }
        });
    }

    // Handle delete all stories button
    if (deleteAllStoriesBtn) {
        deleteAllStoriesBtn.addEventListener('click', function() {
            if (confirm('WARNING: Are you sure you want to delete ALL story records? This cannot be undone.')) {
                fetch('/api/db/delete-all-stories', {
                    method: 'POST'
                })
                .then(response => response.json())
                .then(data => {
                    if (data.error) {
                        showNotification('Error', data.error, true);
                        return;
                    }

                    showNotification('Success', data.message);

                    // Refresh story tables
                    refreshStoriesList();
                    loadAllStories();
                })
                .catch(error => {
                    showNotification('Error', 'Failed to delete all stories: ' + error.message, true);
                });
            }
        });
    }

    // Handle refresh images button
    if (refreshImagesBtn) {
        refreshImagesBtn.addEventListener('click', refreshImagesList);
    }

    // Handle refresh stories button
    if (refreshStoriesBtn) {
        refreshStoriesBtn.addEventListener('click', refreshStoriesList);
    }

    // Function to refresh the images list
    function refreshImagesList() {
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
                    showNotification('Error', data.error, true);
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
                showNotification('Error', 'Failed to load images: ' + error.message, true);
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
                    showNotification('Error', data.error, true);
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
                showNotification('Error', 'Failed to load stories: ' + error.message, true);
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
                        showNotification('Error', data.error, true);
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

                    showNotification('Success', 'Health check completed');
                })
                .catch(error => {
                    runHealthCheckBtn.disabled = false;
                    runHealthCheckBtn.innerHTML = '<i class="fas fa-stethoscope me-1"></i>Run Health Check';
                    showNotification('Error', 'Failed to run health check: ' + error.message, true);
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
                    showNotification('Error', data.error, true);
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
                    showNotification('Error', data.error, true);
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
                                    </a                                    <button class="btn btn-sm btn-danger delete-story-btn" data-id="${story.id}" title="Delete Record">
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
                    showNotification('Error', data.error, true);
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
                showNotification('Error', 'No image selected for reanalysis', true);
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
                showNotification('Error', 'No image selected for reanalysis', true);
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
                    showNotification('Error', data.error, true);
                    return;
                }

                // Update the modal content
                modalContent.textContent = JSON.stringify(data.analysis, null, 2);

                // Update current image data
                currentImageData.analysis = data.analysis;

                showNotification('Success', 'Image reanalyzed successfully');

                // Refresh image tables
                refreshImagesList();
                loadAllImages(currentImagePage, currentImageFilter, currentImageSearch);
            })
            .catch(error => {
                confirmReanalyzeBtn.disabled = false;
                confirmReanalyzeBtn.innerHTML = '<i class="fas fa-sync-alt me-2"></i>Reanalyze';
                showNotification('Error', 'Failed to reanalyze image: ' + error.message, true);
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

document.addEventListener('DOMContentLoaded', function() {
    // Form elements
    const imageForm = document.getElementById('imageForm');
    const generateBtn = document.getElementById('generateBtn');
    const resultDiv = document.getElementById('result');
    const generatedContent = document.getElementById('generatedContent');
    const copyBtn = document.getElementById('copyBtn');
    let currentAnalysis = null;
    let currentImageUrl = null;

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

    // Form submission - Single event listener for image analysis
    if (imageForm) {
        imageForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const imageUrl = document.getElementById('imageUrl').value.trim();
            const generateBtn = document.getElementById('generateBtn');

            if (!imageUrl) {
                showToast('Error', 'Please enter an image URL to analyze');
                return;
            }

            // Show loading state
            generateBtn.disabled = true;
            generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Analyzing...';

            // Clear previous results
            if (generatedContent) {
                generatedContent.innerHTML = '';
            }

            // Hide edit panel
            if (editContainer) {
                editContainer.style.display = 'none';
            }

            // Show result container
            if (resultDiv) {
                resultDiv.style.display = 'block';
            }

            // Log that we're making an API call (for debugging)
            console.log('Making image analysis API call to /api/analyze_image');

            // Make API request
            fetch('/api/analyze_image', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ image_url: imageUrl })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Display the analysis result
                    generatedContent.innerHTML = `<pre>${JSON.stringify(data.analysis, null, 2)}</pre>`;

                    // Store the analysis for later use
                    currentAnalysis = data.analysis;
                    currentImageUrl = imageUrl;

                    // Setup analysis editing UI
                    setupAnalysisEditing(data.analysis);
                } else {
                    throw new Error(data.error || 'An error occurred during analysis.');
                }
            })
            .catch(error => {
                showToast('Error', error.message);
            })
`.finally(() => {
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