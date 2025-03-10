
/**
 * DataHandler.js - Data management for the debug interface
 */
import DebugUtils from './DebugUtils.js';
import DebugAPI from './DebugAPI.js';

export default class DataHandler {
    constructor(debugUI) {
        this.debugUI = debugUI;
        this.currentFilter = '';
        this.currentPage = 1;
        this.pageSize = 10;
        this.searchTerm = '';
        this.storySearchTerm = '';
        this.storyCurrentPage = 1;
    }
    
    initialize() {
        this.setupEvents();
        this.loadImages();
        this.loadStories();
        console.log('Data handler initialized');
    }
    
    setupEvents() {
        const refreshImagesBtn = document.getElementById('refreshImagesBtn');
        if (refreshImagesBtn) {
            refreshImagesBtn.addEventListener('click', () => this.loadImages());
        }
        
        const refreshStoriesBtn = document.getElementById('refreshStoriesBtn');
        if (refreshStoriesBtn) {
            refreshStoriesBtn.addEventListener('click', () => this.loadStories());
        }
        
        const imageSearchBtn = document.getElementById('imageSearchBtn');
        if (imageSearchBtn) {
            imageSearchBtn.addEventListener('click', () => {
                const searchTerm = document.getElementById('imageSearchInput').value;
                this.searchImages(searchTerm);
            });
        }
        
        const storySearchBtn = document.getElementById('storySearchBtn');
        if (storySearchBtn) {
            storySearchBtn.addEventListener('click', () => {
                const searchTerm = document.getElementById('storySearchInput').value;
                this.searchStories(searchTerm);
            });
        }
        
        const deleteAllImagesBtn = document.getElementById('deleteAllImagesBtn');
        if (deleteAllImagesBtn) {
            deleteAllImagesBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to delete ALL images? This cannot be undone!')) {
                    this.deleteAllImages();
                }
            });
        }
        
        const deleteAllStoriesBtn = document.getElementById('deleteAllStoriesBtn');
        if (deleteAllStoriesBtn) {
            deleteAllStoriesBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to delete ALL stories? This cannot be undone!')) {
                    this.deleteAllStories();
                }
            });
        }
        
        const runHealthCheckBtn = document.getElementById('runHealthCheckBtn');
        if (runHealthCheckBtn) {
            runHealthCheckBtn.addEventListener('click', () => this.runHealthCheck());
        }
    }
    
    filterImages(filter) {
        this.currentFilter = filter;
        this.currentPage = 1;
        this.loadImages();
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-filter') === filter);
        });
    }
    
    searchImages(term) {
        this.searchTerm = term;
        this.currentPage = 1;
        this.loadImages();
    }
    
    searchStories(term) {
        this.storySearchTerm = term;
        this.storyCurrentPage = 1;
        this.loadStories();
    }
    
    async loadImages() {
        try {
            if (!this.debugUI.elements.imagesTableBody) {
                console.error('Images table body element not found');
                return;
            }
            
            this.debugUI.elements.imagesTableBody.innerHTML = `
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
                this.debugUI.createPagination('imagesPagination', data.total_pages, this.currentPage,
                    (page) => {
                        this.currentPage = page;
                        this.loadImages();
                    }
                );
            } else {
                DebugUtils.showToast('Error', data.message || 'Failed to load images', true);
            }
        } catch (error) {
            if (this.debugUI.elements.imagesTableBody) {
                this.debugUI.elements.imagesTableBody.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center text-danger">
                            Failed to load images: ${error.message}
                        </td>
                    </tr>
                `;
            }
        }
    }
    
    renderImagesTable(images) {
        if (!this.debugUI.elements.imagesTableBody) {
            console.error('Images table body element not found');
            return;
        }
        
        if (!images || images.length === 0) {
            this.debugUI.elements.imagesTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">No images found</td>
                </tr>
            `;
            return;
        }

        this.debugUI.elements.imagesTableBody.innerHTML = '';

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
            this.debugUI.elements.imagesTableBody.appendChild(row);
            row.querySelector('.view-btn').addEventListener('click', () => this.openImageDetails(image));
            row.querySelector('.delete-btn').addEventListener('click', () => this.deleteImage(image.id));
        });
    }
    
    openImageDetails(image) {
        const modalEl = document.getElementById('detailsModal');
        if (!modalEl) return;
        
        const modal = new bootstrap.Modal(modalEl);
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
                const reanalyzeModalEl = document.getElementById('reanalyzeConfirmModal');
                if (reanalyzeModalEl) {
                    const reanalyzeModal = new bootstrap.Modal(reanalyzeModalEl);
                    document.getElementById('confirmReanalyzeBtn').onclick = () => {
                        this.reanalyzeImage(image.id, document.getElementById('preserveRelationsCheck').checked);
                        reanalyzeModal.hide();
                    };
                    reanalyzeModal.show();
                }
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
                if (saveBtn) saveBtn.style.display = editSwitch.checked ? 'inline-block' : 'none';
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
    }
    
    populateModalEditForm(image) {
        const modalImageName = document.getElementById('modalImageName');
        const modalImageType = document.getElementById('modalImageType');
        const modalDescriptionField = document.getElementById('modalDescriptionField');
        
        if (modalImageName) modalImageName.value = image.name || '';
        if (modalImageType) modalImageType.value = image.image_type || 'character';
        if (modalDescriptionField) modalDescriptionField.value = image.description || '';
        
        const type = image.image_type || 'character';
        const modalCharacterFields = document.getElementById('modalCharacterFields');
        const modalSceneFields = document.getElementById('modalSceneFields');
        
        if (modalCharacterFields) {
            modalCharacterFields.style.display = type === 'character' ? 'block' : 'none';
        }
        
        if (modalSceneFields) {
            modalSceneFields.style.display = type === 'scene' ? 'block' : 'none';
        }
        
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
    }
    
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
                const modalContent = document.getElementById('modalContent');
                if (modalContent) {
                    modalContent.textContent = JSON.stringify(response.image, null, 2);
                }
            } else {
                DebugUtils.showToast('Error', response.message || 'Failed to update image', true);
            }
        } catch (error) {
            DebugUtils.showToast('Error', 'Failed to update image: ' + error.message, true);
        }
    }
    
    async reanalyzeImage(imageId, preserveRelations) {
        try {
            DebugUtils.showToast('Processing', 'Reanalyzing image...');
            const response = await DebugAPI.post(`/debug/reanalyze-image/${imageId}`, {
                preserve_relations: preserveRelations
            });

            if (response.success) {
                DebugUtils.showToast('Success', 'Image reanalyzed successfully');
                this.loadImages();
                const detailsModal = document.getElementById('detailsModal');
                if (detailsModal) {
                    const modal = bootstrap.Modal.getInstance(detailsModal);
                    if (modal) modal.hide();
                }
            } else {
                DebugUtils.showToast('Error', response.message || 'Failed to reanalyze image', true);
            }
        } catch (error) {
            DebugUtils.showToast('Error', 'Failed to reanalyze image: ' + error.message, true);
        }
    }
    
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
    }
    
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
    }
    
    async loadStories() {
        try {
            if (!this.debugUI.elements.storiesTableBody) {
                console.error('Stories table body element not found');
                return;
            }
            
            this.debugUI.elements.storiesTableBody.innerHTML = `
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
                this.debugUI.createPagination('storiesPagination', data.total_pages,
                    this.storyCurrentPage || 1, (page) => {
                        this.storyCurrentPage = page;
                        this.loadStories();
                    }
                );
            } else {
                DebugUtils.showToast('Error', data.message || 'Failed to load stories', true);
            }
        } catch (error) {
            if (this.debugUI.elements.storiesTableBody) {
                this.debugUI.elements.storiesTableBody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center text-danger">
                            Failed to load stories: ${error.message}
                        </td>
                    </tr>
                `;
            }
        }
    }
    
    renderStoriesTable(stories) {
        if (!this.debugUI.elements.storiesTableBody) {
            console.error('Stories table body element not found');
            return;
        }
        
        if (!stories || stories.length === 0) {
            this.debugUI.elements.storiesTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">No stories found</td>
                </tr>
            `;
            return;
        }

        this.debugUI.elements.storiesTableBody.innerHTML = '';

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
            this.debugUI.elements.storiesTableBody.appendChild(row);
            row.querySelector('.view-story-btn').addEventListener('click', () => this.viewStory(story.id));
            row.querySelector('.delete-story-btn').addEventListener('click', () => this.deleteStory(story.id));
        });
    }
    
    async viewStory(storyId) {
        try {
            const response = await DebugAPI.get(`/debug/stories/${storyId}`);

            if (response.success) {
                const detailsModalEl = document.getElementById('detailsModal');
                if (!detailsModalEl) return;
                
                const modal = new bootstrap.Modal(detailsModalEl);
                const modalLabelEl = document.getElementById('detailsModalLabel');
                if (modalLabelEl) {
                    modalLabelEl.innerHTML = `<i class="fas fa-book me-2"></i>Story Details`;
                }
                
                const modalImageEl = document.getElementById('modalImage');
                if (modalImageEl) modalImageEl.style.display = 'none';
                
                const modalContentEl = document.getElementById('modalContent');
                if (modalContentEl) {
                    modalContentEl.textContent = JSON.stringify(response.story, null, 2);
                }
                
                const modalEditModeSwitchEl = document.getElementById('modalEditModeSwitch');
                if (modalEditModeSwitchEl) modalEditModeSwitchEl.style.display = 'none';
                
                const modalEditContainerEl = document.getElementById('modalEditContainer');
                if (modalEditContainerEl) modalEditContainerEl.style.display = 'none';
                
                const reanalyzeImageBtnEl = document.getElementById('reanalyzeImageBtn');
                if (reanalyzeImageBtnEl) reanalyzeImageBtnEl.style.display = 'none';
                
                const saveAnalysisBtnEl = document.getElementById('saveAnalysisBtn');
                if (saveAnalysisBtnEl) saveAnalysisBtnEl.style.display = 'none';
                
                modal.show();
            } else {
                DebugUtils.showToast('Error', response.message || 'Failed to load story', true);
            }
        } catch (error) {
            DebugUtils.showToast('Error', 'Failed to load story: ' + error.message, true);
        }
    }
    
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
    }
    
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
    }
    
    async runHealthCheck() {
        try {
            DebugUtils.showToast('Processing', 'Running health check...');
            const response = await DebugAPI.get('/debug/health-check');

            if (response.success) {
                const totalImagesEl = document.getElementById('totalImages');
                if (totalImagesEl) totalImagesEl.textContent = response.stats.image_count;
                
                const characterImagesEl = document.getElementById('characterImages');
                if (characterImagesEl) characterImagesEl.textContent = response.stats.character_count;
                
                const sceneImagesEl = document.getElementById('sceneImages');
                if (sceneImagesEl) sceneImagesEl.textContent = response.stats.scene_count;
                
                const totalStoriesEl = document.getElementById('totalStories');
                if (totalStoriesEl) totalStoriesEl.textContent = response.stats.story_count;
                
                const orphanedImagesEl = document.getElementById('orphanedImages');
                if (orphanedImagesEl) orphanedImagesEl.textContent = response.stats.orphaned_images;
                
                const emptyStoriesEl = document.getElementById('emptyStories');
                if (emptyStoriesEl) emptyStoriesEl.textContent = response.stats.empty_stories;
                
                const issuesListEl = document.getElementById('issuesList');
                const noIssuesAlertEl = document.getElementById('noIssuesAlert');

                if (response.issues && response.issues.length > 0 && issuesListEl && noIssuesAlertEl) {
                    issuesListEl.innerHTML = '';
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
                        issuesListEl.appendChild(li);
                        if (issue.fixable) {
                            li.querySelector('.fix-issue-btn').addEventListener('click', () => {
                                this.fixIssue(issue.type, issue.id);
                            });
                        }
                    });
                    issuesListEl.style.display = 'block';
                    noIssuesAlertEl.style.display = 'none';
                } else if (issuesListEl && noIssuesAlertEl) {
                    issuesListEl.style.display = 'none';
                    noIssuesAlertEl.style.display = 'block';
                }

                DebugUtils.showToast('Success', 'Health check completed');
            } else {
                DebugUtils.showToast('Error', response.message || 'Failed to run health check', true);
            }
        } catch (error) {
            DebugUtils.showToast('Error', 'Failed to run health check: ' + error.message, true);
        }
    }
    
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
}
