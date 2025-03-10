
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
        const refreshImagesBtn = document.getElementById('refreshImagesBtn');
        if (refreshImagesBtn) {
            refreshImagesBtn.addEventListener('click', () => this.loadImages());
        }

        // Setup story refresh button
        const refreshStoriesBtn = document.getElementById('refreshStoriesBtn');
        if (refreshStoriesBtn) {
            refreshStoriesBtn.addEventListener('click', () => this.loadStories());
        }

        // Setup image search
        const imageSearchBtn = document.getElementById('imageSearchBtn');
        if (imageSearchBtn) {
            imageSearchBtn.addEventListener('click', () => {
                const searchTerm = document.getElementById('imageSearchInput').value;
                this.searchImages(searchTerm);
            });
        }

        // Setup story search
        const storySearchBtn = document.getElementById('storySearchBtn');
        if (storySearchBtn) {
            storySearchBtn.addEventListener('click', () => {
                const searchTerm = document.getElementById('storySearchInput').value;
                this.searchStories(searchTerm);
            });
        }

        // Setup delete all images button
        const deleteAllImagesBtn = document.getElementById('deleteAllImagesBtn');
        if (deleteAllImagesBtn) {
            deleteAllImagesBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to delete ALL images? This cannot be undone!')) {
                    this.deleteAllImages();
                }
            });
        }

        // Setup delete all stories button
        const deleteAllStoriesBtn = document.getElementById('deleteAllStoriesBtn');
        if (deleteAllStoriesBtn) {
            deleteAllStoriesBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to delete ALL stories? This cannot be undone!')) {
                    this.deleteAllStories();
                }
            });
        }

        // Setup health check button
        const runHealthCheckBtn = document.getElementById('runHealthCheckBtn');
        if (runHealthCheckBtn) {
            runHealthCheckBtn.addEventListener('click', () => this.runHealthCheck());
        }
    },

    filterImages(filter) {
        this.currentFilter = filter;
        this.currentPage = 1;
        this.loadImages();
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-filter') === filter);
        });
    },

    searchImages(term) {
        this.searchTerm = term;
        this.currentPage = 1;
        this.loadImages();
    },

    searchStories(term) {
        this.storySearchTerm = term;
        this.storyCurrentPage = 1;
        this.loadStories();
    },

    async loadImages() {
        try {
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
            const imagesTableBody = document.getElementById('imagesTableBody');
            if (imagesTableBody) {
                imagesTableBody.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center text-danger">
                            Failed to load images: ${error.message}
                        </td>
                    </tr>
                `;
            }
        }
    },

    renderImagesTable(images) {
        const imagesTableBody = document.getElementById('imagesTableBody');
        if (!imagesTableBody) return;
        
        if (!images || images.length === 0) {
            imagesTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">No images found</td>
                </tr>
            `;
            return;
        }

        imagesTableBody.innerHTML = '';

        images.forEach(image => {
            const row = document.createElement('tr');
            const thumbnailCell = document.createElement('td');
            const thumbnail = document.createElement('img');
            thumbnail.src = image.image_url;
            thumbnail.alt = image.name || 'Image';
            thumbnail.className = 'img-thumbnail';
            thumbnail.style.maxWidth = '50px';
            thumbnail.style.cursor = 'pointer';
            thumbnail.addEventListener('click', () => this.openImageDetails(image));
            thumbnailCell.appendChild(thumbnail);
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
            row.insertBefore(thumbnailCell, row.firstChild);
            imagesTableBody.appendChild(row);
            
            const viewBtn = row.querySelector('.view-btn');
            if (viewBtn) {
                viewBtn.addEventListener('click', () => this.openImageDetails(image));
            }
            
            const deleteBtn = row.querySelector('.delete-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => this.deleteImage(image.id));
            }
        });
    },

    openImageDetails(image) {
        const detailsModal = document.getElementById('detailsModal');
        if (!detailsModal) return;
        
        const modal = new bootstrap.Modal(detailsModal);
        document.getElementById('modalImage').src = image.image_url;
        document.getElementById('modalContent').textContent = JSON.stringify(image, null, 2);
        const editSwitch = document.getElementById('modalEditModeSwitch');
        const editContainer = document.getElementById('modalEditContainer');
        editSwitch.checked = false;
        editContainer.style.display = 'none';
        this.populateModalEditForm(image);
        
        const reanalyzeBtn = document.getElementById('reanalyzeImageBtn');
        if (reanalyzeBtn) {
            reanalyzeBtn.onclick = () => {
                const reanalyzeModal = new bootstrap.Modal(document.getElementById('reanalyzeConfirmModal'));
                document.getElementById('confirmReanalyzeBtn').onclick = () => {
                    this.reanalyzeImage(image.id, document.getElementById('preserveRelationsCheck').checked);
                    reanalyzeModal.hide();
                };
                reanalyzeModal.show();
            };
        }
        
        const saveBtn = document.getElementById('saveAnalysisBtn');
        if (saveBtn) {
            saveBtn.style.display = 'none';
            saveBtn.onclick = () => this.saveModalChanges(image.id);
        }
        
        if (editSwitch) {
            editSwitch.onchange = () => {
                editContainer.style.display = editSwitch.checked ? 'block' : 'none';
                saveBtn.style.display = editSwitch.checked ? 'inline-block' : 'none';
            };
        }
        
        const modalImageType = document.getElementById('modalImageType');
        if (modalImageType) {
            modalImageType.onchange = () => {
                const type = modalImageType.value;
                document.getElementById('modalCharacterFields').style.display = type === 'character' ? 'block' : 'none';
                document.getElementById('modalSceneFields').style.display = type === 'scene' ? 'block' : 'none';
            };
        }
        
        modal.show();
    },

    populateModalEditForm(image) {
        const modalImageName = document.getElementById('modalImageName');
        const modalImageType = document.getElementById('modalImageType');
        const modalDescriptionField = document.getElementById('modalDescriptionField');
        const modalCharacterFields = document.getElementById('modalCharacterFields');
        const modalSceneFields = document.getElementById('modalSceneFields');
        
        if (modalImageName) modalImageName.value = image.name || '';
        if (modalImageType) modalImageType.value = image.image_type || 'character';
        if (modalDescriptionField) modalDescriptionField.value = image.description || '';
        
        const type = image.image_type || 'character';
        if (modalCharacterFields) modalCharacterFields.style.display = type === 'character' ? 'block' : 'none';
        if (modalSceneFields) modalSceneFields.style.display = type === 'scene' ? 'block' : 'none';
        
        if (type === 'character') {
            const modalCharacterRole = document.getElementById('modalCharacterRole');
            const modalCharacterTraits = document.getElementById('modalCharacterTraits');
            const modalPlotLines = document.getElementById('modalPlotLines');
            
            if (modalCharacterRole) modalCharacterRole.value = image.role || 'neutral';
            
            if (modalCharacterTraits) {
                const traits = image.personality_traits || image.character_traits || image.traits || [];
                modalCharacterTraits.value = Array.isArray(traits) ? traits.join(', ') : '';
            }
            
            if (modalPlotLines) {
                const plotLines = image.plot_lines || image.potential_plot_lines || [];
                modalPlotLines.value = Array.isArray(plotLines) ? plotLines.join('\n') : '';
            }
        } else if (type === 'scene') {
            const modalSceneType = document.getElementById('modalSceneType');
            const modalSceneSetting = document.getElementById('modalSceneSetting');
            const modalDramaticMoments = document.getElementById('modalDramaticMoments');
            
            if (modalSceneType) modalSceneType.value = image.scene_type || 'action';
            if (modalSceneSetting) modalSceneSetting.value = image.setting || '';
            
            if (modalDramaticMoments) {
                const dramaticMoments = image.dramatic_moments || [];
                modalDramaticMoments.value = Array.isArray(dramaticMoments) ? dramaticMoments.join('\n') : '';
            }
        }
    },

    async saveModalChanges(imageId) {
        try {
            const formData = {
                name: document.getElementById('modalImageName').value,
                image_type: document.getElementById('modalImageType').value,
                description: document.getElementById('modalDescriptionField').value
            };
            
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
                document.getElementById('modalContent').textContent = JSON.stringify(response.image, null, 2);
            } else {
                DebugUtils.showToast('Error', response.message || 'Failed to update image', true);
            }
        } catch (error) {
            DebugUtils.showToast('Error', 'Failed to update image: ' + error.message, true);
        }
    },

    async reanalyzeImage(imageId, preserveRelations) {
        try {
            DebugUtils.showToast('Processing', 'Reanalyzing image...');
            const response = await DebugAPI.post(`/debug/reanalyze-image/${imageId}`, {
                preserve_relations: preserveRelations
            });

            if (response.success) {
                DebugUtils.showToast('Success', 'Image reanalyzed successfully');
                this.loadImages();
                const modal = bootstrap.Modal.getInstance(document.getElementById('detailsModal'));
                if (modal) modal.hide();
            } else {
                DebugUtils.showToast('Error', response.message || 'Failed to reanalyze image', true);
            }
        } catch (error) {
            DebugUtils.showToast('Error', 'Failed to reanalyze image: ' + error.message, true);
        }
    },

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

    async loadStories() {
        try {
            const storiesTableBody = document.getElementById('storiesTableBody');
            if (!storiesTableBody) return;
            
            storiesTableBody.innerHTML = `
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
            const storiesTableBody = document.getElementById('storiesTableBody');
            if (storiesTableBody) {
                storiesTableBody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center text-danger">
                            Failed to load stories: ${error.message}
                        </td>
                    </tr>
                `;
            }
        }
    },

    renderStoriesTable(stories) {
        const storiesTableBody = document.getElementById('storiesTableBody');
        if (!storiesTableBody) return;
        
        if (!stories || stories.length === 0) {
            storiesTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">No stories found</td>
                </tr>
            `;
            return;
        }

        storiesTableBody.innerHTML = '';

        stories.forEach(story => {
            const row = document.createElement('tr');
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
            
            storiesTableBody.appendChild(row);
            
            const viewBtn = row.querySelector('.view-story-btn');
            if (viewBtn) {
                viewBtn.addEventListener('click', () => this.viewStory(story.id));
            }
            
            const deleteBtn = row.querySelector('.delete-story-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => this.deleteStory(story.id));
            }
        });
    },

    async viewStory(storyId) {
        try {
            const response = await DebugAPI.get(`/debug/stories/${storyId}`);

            if (response.success) {
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

    async runHealthCheck() {
        try {
            DebugUtils.showToast('Processing', 'Running health check...');
            const response = await DebugAPI.get('/debug/health-check');

            if (response.success) {
                const totalImages = document.getElementById('totalImages');
                const characterImages = document.getElementById('characterImages');
                const sceneImages = document.getElementById('sceneImages');
                const totalStories = document.getElementById('totalStories');
                const orphanedImages = document.getElementById('orphanedImages');
                const emptyStories = document.getElementById('emptyStories');
                
                if (totalImages) totalImages.textContent = response.stats.image_count;
                if (characterImages) characterImages.textContent = response.stats.character_count;
                if (sceneImages) sceneImages.textContent = response.stats.scene_count;
                if (totalStories) totalStories.textContent = response.stats.story_count;
                if (orphanedImages) orphanedImages.textContent = response.stats.orphaned_images;
                if (emptyStories) emptyStories.textContent = response.stats.empty_stories;
                
                const issuesList = document.getElementById('issuesList');
                const noIssuesAlert = document.getElementById('noIssuesAlert');

                if (response.issues && response.issues.length > 0 && issuesList && noIssuesAlert) {
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
                        if (issue.fixable) {
                            li.querySelector('.fix-issue-btn').addEventListener('click', () => {
                                this.fixIssue(issue.type, issue.id);
                            });
                        }
                    });
                    issuesList.style.display = 'block';
                    noIssuesAlert.style.display = 'none';
                } else if (issuesList && noIssuesAlert) {
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
