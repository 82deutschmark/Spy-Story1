
/**
 * Data Handling Module
 * Manages database records and API interactions
 */
import DebugUtils from './DebugUtils.js';
import DebugAPI from './DebugAPI.js';
import DebugUI from './DebugUI.js';

export default {
    // Pagination state
    currentFilter: '',
    currentPage: 1,
    pageSize: 10,
    searchTerm: '',
    storySearchTerm: '',
    storyCurrentPage: 1,

    /**
     * Initialize data handler
     */
    initialize() {
        this.setupEvents();
        this.loadImages();
        this.loadStories();
        console.log('Data handler initialized');
    },

    /**
     * Set up event listeners
     */
    setupEvents() {
        // Setup image refresh button
        document.getElementById('refreshImagesBtn').addEventListener('click', () => this.loadImages());

        // Setup story refresh button
        document.getElementById('refreshStoriesBtn').addEventListener('click', () => this.loadStories());

        // Setup image search
        document.getElementById('imageSearchBtn').addEventListener('click', () => {
            const searchTerm = document.getElementById('imageSearchInput').value;
            this.searchImages(searchTerm);
        });

        // Setup story search
        document.getElementById('storySearchBtn').addEventListener('click', () => {
            const searchTerm = document.getElementById('storySearchInput').value;
            this.searchStories(searchTerm);
        });

        // Setup delete all images button
        document.getElementById('deleteAllImagesBtn').addEventListener('click', () => {
            if (confirm('Are you sure you want to delete ALL images? This cannot be undone!')) {
                this.deleteAllImages();
            }
        });

        // Setup delete all stories button
        document.getElementById('deleteAllStoriesBtn').addEventListener('click', () => {
            if (confirm('Are you sure you want to delete ALL stories? This cannot be undone!')) {
                this.deleteAllStories();
            }
        });

        // Setup health check button
        document.getElementById('runHealthCheckBtn').addEventListener('click', () => this.runHealthCheck());
    },

    /**
     * Filter images by type
     * @param {string} filter - Filter value
     */
    filterImages(filter) {
        this.currentFilter = filter;
        this.currentPage = 1;
        this.loadImages();

        // Update active filter button
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-filter') === filter);
        });
    },

    /**
     * Search images
     * @param {string} term - Search term
     */
    searchImages(term) {
        this.searchTerm = term;
        this.currentPage = 1;
        this.loadImages();
    },

    /**
     * Search stories
     * @param {string} term - Search term
     */
    searchStories(term) {
        this.storySearchTerm = term;
        this.storyCurrentPage = 1;
        this.loadStories();
    },

    /**
     * Load images with pagination
     */
    async loadImages() {
        try {
            DebugUI.elements.imagesTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                    </td>
                </tr>
            `;

            let url = `/debug/images?page=${this.currentPage}&limit=${this.pageSize}`;

            if (this.currentFilter) {
                url += `&type=${this.currentFilter}`;
            }

            if (this.searchTerm) {
                url += `&search=${encodeURIComponent(this.searchTerm)}`;
            }

            const data = await DebugAPI.get(url);

            if (data.success) {
                this.renderImagesTable(data.images);
                DebugUI.createPagination('imagesPagination', data.total_pages, this.currentPage, 
                    (page) => {
                        this.currentPage = page;
                        this.loadImages();
                    }
                );
            } else {
                DebugUtils.showToast('Error', data.message || 'Failed to load images', true);
            }
        } catch (error) {
            DebugUI.elements.imagesTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-danger">
                        Failed to load images: ${error.message}
                    </td>
                </tr>
            `;
        }
    },

    /**
     * Render images table
     * @param {Array} images - Array of image objects
     */
    renderImagesTable(images) {
        if (!images || images.length === 0) {
            DebugUI.elements.imagesTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">No images found</td>
                </tr>
            `;
            return;
        }

        DebugUI.elements.imagesTableBody.innerHTML = '';

        images.forEach(image => {
            const row = document.createElement('tr');

            // Create image thumbnail with modal trigger
            const thumbnailCell = document.createElement('td');
            const thumbnail = document.createElement('img');
            thumbnail.src = image.image_url;
            thumbnail.alt = image.name || 'Image';
            thumbnail.className = 'img-thumbnail';
            thumbnail.style.maxWidth = '50px';
            thumbnail.style.cursor = 'pointer';
            thumbnail.addEventListener('click', () => this.openImageDetails(image));
            thumbnailCell.appendChild(thumbnail);

            // Create table cells
            row.innerHTML = `
                <td>${image.id}</td>
                <td>${image.type || 'Unknown'}</td>
                <td>${image.name || 'Unnamed'}</td>
                <td>${new Date(image.created_at).toLocaleString()}</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-info view-btn" data-id="${image.id}">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-outline-danger delete-btn" data-id="${image.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;

            // Insert thumbnail cell at the beginning
            row.insertBefore(thumbnailCell, row.firstChild);

            DebugUI.elements.imagesTableBody.appendChild(row);

            // Add event listeners for buttons
            row.querySelector('.view-btn').addEventListener('click', () => this.openImageDetails(image));
            row.querySelector('.delete-btn').addEventListener('click', () => this.deleteImage(image.id));
        });
    },

    /**
     * Open image details modal
     * @param {object} image - Image object
     */
    openImageDetails(image) {
        const modal = new bootstrap.Modal(document.getElementById('detailsModal'));

        // Set modal content
        document.getElementById('modalImage').src = image.image_url;
        document.getElementById('modalContent').textContent = JSON.stringify(image, null, 2);

        // Setup edit mode switch
        const editSwitch = document.getElementById('modalEditModeSwitch');
        const editContainer = document.getElementById('modalEditContainer');

        editSwitch.checked = false;
        editContainer.style.display = 'none';

        // Populate edit form
        this.populateModalEditForm(image);

        // Set up reanalyze button
        document.getElementById('reanalyzeImageBtn').onclick = () => {
            const reanalyzeModal = new bootstrap.Modal(document.getElementById('reanalyzeConfirmModal'));
            document.getElementById('confirmReanalyzeBtn').onclick = () => {
                this.reanalyzeImage(image.id, document.getElementById('preserveRelationsCheck').checked);
                reanalyzeModal.hide();
            };
            reanalyzeModal.show();
        };

        // Set up save changes button
        const saveBtn = document.getElementById('saveAnalysisBtn');
        saveBtn.style.display = 'none';
        saveBtn.onclick = () => this.saveModalChanges(image.id);

        // Edit mode toggle
        editSwitch.onchange = () => {
            editContainer.style.display = editSwitch.checked ? 'block' : 'none';
            saveBtn.style.display = editSwitch.checked ? 'inline-block' : 'none';
        };

        // Type change handler
        document.getElementById('modalImageType').onchange = () => {
            const type = document.getElementById('modalImageType').value;
            document.getElementById('modalCharacterFields').style.display = type === 'character' ? 'block' : 'none';
            document.getElementById('modalSceneFields').style.display = type === 'scene' ? 'block' : 'none';
        };

        modal.show();
    },

    /**
     * Populate modal edit form
     * @param {object} image - Image object
     */
    populateModalEditForm(image) {
        // Basic fields
        document.getElementById('modalImageName').value = image.name || '';
        document.getElementById('modalImageType').value = image.image_type || 'character';
        document.getElementById('modalDescriptionField').value = image.description || '';

        // Set fields visibility based on type
        const type = image.image_type || 'character';
        document.getElementById('modalCharacterFields').style.display = type === 'character' ? 'block' : 'none';
        document.getElementById('modalSceneFields').style.display = type === 'scene' ? 'block' : 'none';

        // Character-specific fields
        if (type === 'character') {
            document.getElementById('modalCharacterRole').value = image.role || 'neutral';

            const traits = image.personality_traits || image.character_traits || image.traits || [];
            document.getElementById('modalCharacterTraits').value = 
                Array.isArray(traits) ? traits.join(', ') : '';

            const plotLines = image.plot_lines || image.potential_plot_lines || [];
            document.getElementById('modalPlotLines').value = 
                Array.isArray(plotLines) ? plotLines.join('\n') : '';
        }
        // Scene-specific fields
        else if (type === 'scene') {
            document.getElementById('modalSceneType').value = image.scene_type || 'action';
            document.getElementById('modalSceneSetting').value = image.setting || '';

            const dramaticMoments = image.dramatic_moments || [];
            document.getElementById('modalDramaticMoments').value = 
                Array.isArray(dramaticMoments) ? dramaticMoments.join('\n') : '';
        }
    },

    /**
     * Save changes from modal
     * @param {number} imageId - Image ID
     */
    async saveModalChanges(imageId) {
        try {
            // Get form data
            const formData = {
                name: document.getElementById('modalImageName').value,
                image_type: document.getElementById('modalImageType').value,
                description: document.getElementById('modalDescriptionField').value
            };

            // Type-specific fields
            if (formData.image_type === 'character') {
                formData.role = document.getElementById('modalCharacterRole').value;
                formData.traits = document.getElementById('modalCharacterTraits')
                    .value.split(',').map(trait => trait.trim()).filter(trait => trait);
                formData.plot_lines = document.getElementById('modalPlotLines')
                    .value.split('\n').map(line => line.trim()).filter(line => line);
            } else {
                formData.scene_type = document.getElementById('modalSceneType').value;
                formData.setting = document.getElementById('modalSceneSetting').value;
                formData.dramatic_moments = document.getElementById('modalDramaticMoments')
                    .value.split('\n').map(moment => moment.trim()).filter(moment => moment);
            }

            const response = await DebugAPI.post(`/debug/update-image/${imageId}`, formData);

            if (response.success) {
                DebugUtils.showToast('Success', 'Image updated successfully');
                this.loadImages();

                // Update modal content
                document.getElementById('modalContent').textContent = JSON.stringify(response.image, null, 2);
            } else {
                DebugUtils.showToast('Error', response.message || 'Failed to update image', true);
            }
        } catch (error) {
            DebugUtils.showToast('Error', 'Failed to update image: ' + error.message, true);
        }
    },

    /**
     * Reanalyze image
     * @param {number} imageId - Image ID
     * @param {boolean} preserveRelations - Whether to preserve relations
     */
    async reanalyzeImage(imageId, preserveRelations) {
        try {
            DebugUtils.showToast('Processing', 'Reanalyzing image...');

            const response = await DebugAPI.post(`/debug/reanalyze-image/${imageId}`, {
                preserve_relations: preserveRelations
            });

            if (response.success) {
                DebugUtils.showToast('Success', 'Image reanalyzed successfully');
                this.loadImages();

                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('detailsModal'));
                modal.hide();
            } else {
                DebugUtils.showToast('Error', response.message || 'Failed to reanalyze image', true);
            }
        } catch (error) {
            DebugUtils.showToast('Error', 'Failed to reanalyze image: ' + error.message, true);
        }
    },

    /**
     * Delete image
     * @param {number} imageId - Image ID
     */
    async deleteImage(imageId) {
        if (!confirm('Are you sure you want to delete this image?')) {
            return;
        }

        try {
            const response = await DebugAPI.delete(`/debug/images/${imageId}`);

            if (response.success) {
                DebugUtils.showToast('Success', 'Image deleted successfully');
                this.loadImages();
            } else {
                DebugUtils.showToast('Error', response.message || 'Failed to delete image', true);
            }
        } catch (error) {
            DebugUtils.showToast('Error', 'Failed to delete image: ' + error.message, true);
        }
    },

    /**
     * Delete all images
     */
    async deleteAllImages() {
        try {
            const response = await DebugAPI.delete('/debug/images');

            if (response.success) {
                DebugUtils.showToast('Success', 'All images deleted successfully');
                this.loadImages();
            } else {
                DebugUtils.showToast('Error', response.message || 'Failed to delete images', true);
            }
        } catch (error) {
            DebugUtils.showToast('Error', 'Failed to delete images: ' + error.message, true);
        }
    },

    /**
     * Load stories
     */
    async loadStories() {
        try {
            DebugUI.elements.storiesTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                    </td>
                </tr>
            `;

            let url = `/debug/stories?page=${this.storyCurrentPage || 1}&limit=${this.pageSize}`;

            if (this.storySearchTerm) {
                url += `&search=${encodeURIComponent(this.storySearchTerm)}`;
            }

            const data = await DebugAPI.get(url);

            if (data.success) {
                this.renderStoriesTable(data.stories);
                DebugUI.createPagination('storiesPagination', data.total_pages, 
                    this.storyCurrentPage || 1, (page) => {
                        this.storyCurrentPage = page;
                        this.loadStories();
                    }
                );
            } else {
                DebugUtils.showToast('Error', data.message || 'Failed to load stories', true);
            }
        } catch (error) {
            DebugUI.elements.storiesTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-danger">
                        Failed to load stories: ${error.message}
                    </td>
                </tr>
            `;
        }
    },

    /**
     * Render stories table
     * @param {Array} stories - Array of story objects
     */
    renderStoriesTable(stories) {
        if (!stories || stories.length === 0) {
            DebugUI.elements.storiesTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">No stories found</td>
                </tr>
            `;
            return;
        }

        DebugUI.elements.storiesTableBody.innerHTML = '';

        stories.forEach(story => {
            const row = document.createElement('tr');

            // Format characters list
            let charactersText = 'None';
            if (story.characters && story.characters.length > 0) {
                charactersText = story.characters
                    .map(char => char.name || `ID: ${char.id}`)
                    .join(', ');
            }

            row.innerHTML = `
                <td>${story.id}</td>
                <td>${story.title || 'Untitled'}</td>
                <td>${story.conflict || 'N/A'}</td>
                <td>${story.setting || 'N/A'}</td>
                <td>${charactersText}</td>
                <td>${new Date(story.created_at).toLocaleString()}</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-info view-story-btn" data-id="${story.id}">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-outline-danger delete-story-btn" data-id="${story.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;

            DebugUI.elements.storiesTableBody.appendChild(row);

            // Add event listeners for buttons
            row.querySelector('.view-story-btn').addEventListener('click', () => this.viewStory(story.id));
            row.querySelector('.delete-story-btn').addEventListener('click', () => this.deleteStory(story.id));
        });
    },

    /**
     * View story details
     * @param {number} storyId - Story ID
     */
    async viewStory(storyId) {
        try {
            const response = await DebugAPI.get(`/debug/stories/${storyId}`);

            if (response.success) {
                // Show story in modal
                const modal = new bootstrap.Modal(document.getElementById('detailsModal'));
                document.getElementById('detailsModalLabel').innerHTML = 
                    `<i class="fas fa-book me-2"></i>Story Details`;
                document.getElementById('modalImage').style.display = 'none';
                document.getElementById('modalContent').textContent = 
                    JSON.stringify(response.story, null, 2);
                document.getElementById('modalEditModeSwitch').style.display = 'none';
                document.getElementById('modalEditContainer').style.display = 'none';
                document.getElementById('reanalyzeImageBtn').style.display = 'none';
                document.getElementById('saveAnalysisBtn').style.display = 'none';

                modal.show();
            } else {
                DebugUtils.showToast('Error', response.message || 'Failed to load story', true);
            }
        } catch (error) {
            DebugUtils.showToast('Error', 'Failed to load story: ' + error.message, true);
        }
    },

    /**
     * Delete story
     * @param {number} storyId - Story ID
     */
    async deleteStory(storyId) {
        if (!confirm('Are you sure you want to delete this story?')) {
            return;
        }

        try {
            const response = await DebugAPI.delete(`/debug/stories/${storyId}`);

            if (response.success) {
                DebugUtils.showToast('Success', 'Story deleted successfully');
                this.loadStories();
            } else {
                DebugUtils.showToast('Error', response.message || 'Failed to delete story', true);
            }
        } catch (error) {
            DebugUtils.showToast('Error', 'Failed to delete story: ' + error.message, true);
        }
    },

    /**
     * Delete all stories
     */
    async deleteAllStories() {
        try {
            const response = await DebugAPI.delete('/debug/stories');

            if (response.success) {
                DebugUtils.showToast('Success', 'All stories deleted successfully');
                this.loadStories();
            } else {
                DebugUtils.showToast('Error', response.message || 'Failed to delete stories', true);
            }
        } catch (error) {
            DebugUtils.showToast('Error', 'Failed to delete stories: ' + error.message, true);
        }
    },

    /**
     * Run database health check
     */
    async runHealthCheck() {
        try {
            DebugUtils.showToast('Processing', 'Running health check...');

            const response = await DebugAPI.get('/debug/health-check');

            if (response.success) {
                // Update stats
                document.getElementById('totalImages').textContent = response.stats.image_count;
                document.getElementById('characterImages').textContent = response.stats.character_count;
                document.getElementById('sceneImages').textContent = response.stats.scene_count;
                document.getElementById('totalStories').textContent = response.stats.story_count;
                document.getElementById('orphanedImages').textContent = response.stats.orphaned_images;
                document.getElementById('emptyStories').textContent = response.stats.empty_stories;

                // Display issues
                const issuesList = document.getElementById('issuesList');
                const noIssuesAlert = document.getElementById('noIssuesAlert');

                if (response.issues && response.issues.length > 0) {
                    issuesList.innerHTML = '';
                    response.issues.forEach(issue => {
                        const li = document.createElement('li');
                        li.className = 'list-group-item';
                        li.innerHTML = `
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <i class="fas fa-exclamation-triangle me-2 text-warning"></i>
                                    ${issue.description}
                                </div>
                                ${issue.fixable ? 
                                    `<button class="btn btn-sm btn-outline-primary fix-issue-btn" 
                                        data-issue-id="${issue.id}" data-issue-type="${issue.type}">
                                        <i class="fas fa-wrench me-1"></i>Fix
                                    </button>` : 
                                    ''
                                }
                            </div>
                        `;
                        issuesList.appendChild(li);

                        // Add click handler for fix button
                        if (issue.fixable) {
                            li.querySelector('.fix-issue-btn').addEventListener('click', () => {
                                this.fixIssue(issue.type, issue.id);
                            });
                        }
                    });

                    issuesList.style.display = 'block';
                    noIssuesAlert.style.display = 'none';
                } else {
                    issuesList.style.display = 'none';
                    noIssuesAlert.style.display = 'block';
                }

                DebugUtils.showToast('Success', 'Health check completed');
            } else {
                DebugUtils.showToast('Error', response.message || 'Failed to run health check', true);
            }
        } catch (error) {
            DebugUtils.showToast('Error', 'Failed to run health check: ' + error.message, true);
        }
    },

    /**
     * Fix database issue
     * @param {string} issueType - Issue type
     * @param {number} issueId - Issue ID
     */
    async fixIssue(issueType, issueId) {
        try {
            DebugUtils.showToast('Processing', 'Fixing issue...');

            const response = await DebugAPI.post('/debug/fix-issue', {
                issue_type: issueType,
                issue_id: issueId
            });

            if (response.success) {
                DebugUtils.showToast('Success', 'Issue fixed successfully');
                this.runHealthCheck();

                // Refresh data
                this.loadImages();
                this.loadStories();
            } else {
                DebugUtils.showToast('Error', response.message || 'Failed to fix issue', true);
            }
        } catch (error) {
            DebugUtils.showToast('Error', 'Failed to fix issue: ' + error.message, true);
        }
    }
};
