// modules/debug/DebugUtils.js
const DebugUtils = {
    showToast(title, message, isError = false) {
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
    deepClone(obj) {
        try {
            return JSON.parse(JSON.stringify(obj));
        } catch (e) {
            console.error('Error cloning object:', e);
            return {};
        }
    },
    logDebug(title, data) {
        console.log(`${title}:`, data);
    },
    safeParseJSON(text) {
        try {
            return JSON.parse(text);
        } catch (e) {
            console.error('Error parsing JSON:', e);
            this.showToast('Error', 'Failed to parse JSON: ' + e.message, true);
            return null;
        }
    }
};

export default DebugUtils;


// modules/debug/DebugAPI.js
const DebugAPI = {
    async get(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('API GET error:', error);
            DebugUtils.showToast('API Error', error.message, true);
            throw error;
        }
    },
    async post(url, data) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('API POST error:', error);
            DebugUtils.showToast('API Error', error.message, true);
            throw error;
        }
    },
    async delete(url) {
        try {
            const response = await fetch(url, { method: 'DELETE' });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('API DELETE error:', error);
            DebugUtils.showToast('API Error', error.message, true);
            throw error;
        }
    }
};

export default DebugAPI;


// modules/debug/DebugUI.js
const DebugUI = {
    elements: {
        imageForm: document.getElementById('imageForm'),
        imageUrl: document.getElementById('imageUrl'),
        resultContainer: document.getElementById('result'),
        generatedContent: document.getElementById('generatedContent'),
        editModeSwitch: document.getElementById('editModeSwitch'),
        editContainer: document.getElementById('editContainer'),
        copyBtn: document.getElementById('copyBtn'),
        applyChangesBtn: document.getElementById('applyChangesBtn'),
        imageType: document.getElementById('imageType'),
        characterFields: document.getElementById('characterFields'),
        sceneFields: document.getElementById('sceneFields'),
        imagesTableBody: document.getElementById('imagesTableBody'),
        imagesPagination: document.getElementById('imagesPagination'),
        storiesTableBody: document.getElementById('storiesTableBody'),
        storiesPagination: document.getElementById('storiesPagination')
    },
    initialize() {
        this.setupEventListeners();
        console.log('UI module initialized');
    },
    setupEventListeners() {
        this.elements.imageForm.addEventListener('submit', event => {
            event.preventDefault();
            FormHandler.handleImageAnalysis();
        });
        this.elements.editModeSwitch.addEventListener('change', () => {
            this.elements.editContainer.style.display = this.elements.editModeSwitch.checked ? 'block' : 'none';
        });
        this.elements.copyBtn.addEventListener('click', () => {
            const content = this.elements.generatedContent.textContent;
            navigator.clipboard.writeText(content)
                .then(() => DebugUtils.showToast('Success', 'Content copied to clipboard'))
                .catch(err => DebugUtils.showToast('Error', 'Failed to copy: ' + err, true));
        });
        this.elements.imageType.addEventListener('change', () => {
            this.toggleFieldsByImageType();
        });
        this.elements.applyChangesBtn.addEventListener('click', () => {
            FormHandler.applyChanges();
        });
        document.querySelectorAll('.filter-btn').forEach(button => {
            button.addEventListener('click', () => {
                const filter = button.getAttribute('data-filter');
                DataHandler.filterImages(filter);
            });
        });
    },
    toggleFieldsByImageType() {
        const type = this.elements.imageType.value;
        this.elements.characterFields.style.display = type === 'character' ? 'block' : 'none';
        this.elements.sceneFields.style.display = type === 'scene' ? 'block' : 'none';
    },
    showResult() {
        this.elements.resultContainer.style.display = 'block';
    },
    hideResult() {
        this.elements.resultContainer.style.display = 'none';
    },
    displayGeneratedContent(content) {
        this.elements.generatedContent.textContent = content;
        this.showResult();
    },
    populateEditForm(data) {
        console.log('Populated edit form with data:', data);
        document.getElementById('imageName').value = data.name || '';
        document.getElementById('descriptionField').value = data.description || '';
        document.getElementById('imageType').value = data.image_type || 'character';
        this.toggleFieldsByImageType();
        if (data.image_type === 'character') {
            document.getElementById('characterRole').value = data.role || 'undetermined';
            document.getElementById('characterTraits').value = Array.isArray(data.traits) ? data.traits.join(', ') : '';
            document.getElementById('plotLines').value = Array.isArray(data.plot_lines) ? data.plot_lines.join('\n') : '';
        } else if (data.image_type === 'scene') {
            document.getElementById('sceneType').value = data.scene_type || 'action';
            document.getElementById('sceneSetting').value = data.setting || '';
            document.getElementById('dramaticMoments').value = Array.isArray(data.dramatic_moments) ? data.dramatic_moments.join('\n') : '';
        }
    },
    createPagination(elementId, totalPages, currentPage, clickHandler) {
        const paginationEl = document.getElementById(elementId);
        paginationEl.innerHTML = '';

        if (totalPages <= 1) return;

        const prevLi = document.createElement('li');
        prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
        const prevLink = document.createElement('a');
        prevLink.className = 'page-link';
        prevLink.href = '#';
        prevLink.textContent = 'Previous';
        if (currentPage > 1) {
            prevLink.addEventListener('click', (e) => {
                e.preventDefault();
                clickHandler(currentPage - 1);
            });
        }
        prevLi.appendChild(prevLink);
        paginationEl.appendChild(prevLi);

        for (let i = 1; i <= totalPages; i++) {
            const li = document.createElement('li');
            li.className = `page-item ${i === currentPage ? 'active' : ''}`;
            const link = document.createElement('a');
            link.className = 'page-link';
            link.href = '#';
            link.textContent = i;
            link.addEventListener('click', (e) => {
                e.preventDefault();
                if (i !== currentPage) {
                    clickHandler(i);
                }
            });
            li.appendChild(link);
            paginationEl.appendChild(li);
        }

        const nextLi = document.createElement('li');
        nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
        const nextLink = document.createElement('a');
        nextLink.className = 'page-link';
        nextLink.href = '#';
        nextLink.textContent = 'Next';
        if (currentPage < totalPages) {
            nextLink.addEventListener('click', (e) => {
                e.preventDefault();
                clickHandler(currentPage + 1);
            });
        }
        nextLi.appendChild(nextLink);
        paginationEl.appendChild(nextLi);
    }
};

export default DebugUI;


// modules/debug/FormHandler.js
const FormHandler = {
    initialize() {
        console.log('Form handler initialized');
    },
    async handleImageAnalysis() {
        const imageUrl = DebugUI.elements.imageUrl.value.trim();
        if (!imageUrl) {
            DebugUtils.showToast('Error', 'Please enter an image URL', true);
            return;
        }

        try {
            DebugUtils.showToast('Processing', 'Analyzing image...');
            const response = await DebugAPI.post('/debug/analyze-image', { image_url: imageUrl });

            if (response.success) {
                DebugUI.displayGeneratedContent(JSON.stringify(response.analysis, null, 2));
                DebugUI.populateEditForm(response.analysis);
                const saveContainer = document.querySelector('.save-button-container');
                if (!saveContainer.querySelector('#saveToDbBtn')) {
                    const saveBtn = document.createElement('button');
                    saveBtn.id = 'saveToDbBtn';
                    saveBtn.className = 'btn btn-primary';
                    saveBtn.innerHTML = '<i class="fas fa-save me-2"></i>Save to Database';
                    saveBtn.addEventListener('click', () => this.saveAnalysisToDb(response.analysis, imageUrl));
                    saveContainer.appendChild(saveBtn);
                }
            } else {
                DebugUtils.showToast('Error', response.message || 'Failed to analyze image', true);
            }
        } catch (error) {
            DebugUtils.showToast('Error', 'Failed to analyze image: ' + error.message, true);
        }
    },
    applyChanges() {
        const currentContent = DebugUI.elements.generatedContent.textContent;
        let contentObj;
        try {
            contentObj = JSON.parse(currentContent);
        } catch (e) {
            DebugUtils.showToast('Error', 'Failed to parse current content', true);
            return;
        }

        contentObj.name = document.getElementById('imageName').value;
        contentObj.type = document.getElementById('imageType').value.toUpperCase();
        contentObj.image_type = document.getElementById('imageType').value;
        contentObj.description = document.getElementById('descriptionField').value;

        if (contentObj.image_type === 'character') {
            contentObj.role = document.getElementById('characterRole').value;
            contentObj.personality_traits = document.getElementById('characterTraits')
                .value.split(',').map(trait => trait.trim()).filter(trait => trait);
            contentObj.character_traits = [...contentObj.personality_traits];
            contentObj.potential_plot_lines = document.getElementById('plotLines')
                .value.split('\n').map(line => line.trim()).filter(line => line);
            contentObj.plot_lines = [...contentObj.potential_plot_lines];
        } else {
            contentObj.scene_type = document.getElementById('sceneType').value;
            contentObj.setting = document.getElementById('sceneSetting').value;
            contentObj.dramatic_moments = document.getElementById('dramaticMoments')
                .value.split('\n').map(moment => moment.trim()).filter(moment => moment);
        }

        DebugUI.elements.generatedContent.textContent = JSON.stringify(contentObj, null, 2);
        console.log('Edited form data:', contentObj);
        DebugUtils.showToast('Success', 'Changes applied');
    },
    async saveAnalysisToDb(analysis, imageUrl) {
        try {
            const currentContent = DebugUI.elements.generatedContent.textContent;
            let contentObj;
            try {
                contentObj = JSON.parse(currentContent);
            } catch (e) {
                DebugUtils.showToast('Error', 'Failed to parse current content', true);
                return;
            }
            const saveData = {
                image_url: imageUrl,
                analysis: contentObj
            };
            console.log('Saving analysis data:', saveData);
            const response = await DebugAPI.post('/debug/save-image', saveData);

            if (response.success) {
                DebugUtils.showToast('Success', 'Image saved to database');
                DataHandler.loadImages();
            } else {
                DebugUtils.showToast('Error', response.message || 'Failed to save image', true);
            }
        } catch (error) {
            DebugUtils.showToast('Error', 'Failed to save image: ' + error.message, true);
        }
    }
};

export default FormHandler;


// modules/debug/DataHandler.js
const DataHandler = {
    currentFilter: '',
    currentPage: 1,
    pageSize: 10,
    searchTerm: '',
    storySearchTerm: '',
    storyCurrentPage: 1,
    initialize() {
        this.setupEvents();
        this.loadImages();
        this.loadStories();
        console.log('Data handler initialized');
    },
    setupEvents() {
        document.getElementById('refreshImagesBtn').addEventListener('click', () => this.loadImages());
        document.getElementById('refreshStoriesBtn').addEventListener('click', () => this.loadStories());
        document.getElementById('imageSearchBtn').addEventListener('click', () => {
            const searchTerm = document.getElementById('imageSearchInput').value;
            this.searchImages(searchTerm);
        });
        document.getElementById('storySearchBtn').addEventListener('click', () => {
            const searchTerm = document.getElementById('storySearchInput').value;
            this.searchStories(searchTerm);
        });
        document.getElementById('deleteAllImagesBtn').addEventListener('click', () => {
            if (confirm('Are you sure you want to delete ALL images? This cannot be undone!')) {
                this.deleteAllImages();
            }
        });
        document.getElementById('deleteAllStoriesBtn').addEventListener('click', () => {
            if (confirm('Are you sure you want to delete ALL stories? This cannot be undone!')) {
                this.deleteAllStories();
            }
        });
        document.getElementById('runHealthCheckBtn').addEventListener('click', () => this.runHealthCheck());
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
            DebugUI.elements.imagesTableBody.appendChild(row);
            row.querySelector('.view-btn').addEventListener('click', () => this.openImageDetails(image));
            row.querySelector('.delete-btn').addEventListener('click', () => this.deleteImage(image.id));
        });
    },
    openImageDetails(image) {
        const modal = new bootstrap.Modal(document.getElementById('detailsModal'));
        document.getElementById('modalImage').src = image.image_url;
        document.getElementById('modalContent').textContent = JSON.stringify(image, null, 2);
        const editSwitch = document.getElementById('modalEditModeSwitch');
        const editContainer = document.getElementById('modalEditContainer');
        editSwitch.checked = false;
        editContainer.style.display = 'none';
        this.populateModalEditForm(image);
        document.getElementById('reanalyzeImageBtn').onclick = () => {
            const reanalyzeModal = new bootstrap.Modal(document.getElementById('reanalyzeConfirmModal'));
            document.getElementById('confirmReanalyzeBtn').onclick = () => {
                this.reanalyzeImage(image.id, document.getElementById('preserveRelationsCheck').checked);
                reanalyzeModal.hide();
            };
            reanalyzeModal.show();
        };
        const saveBtn = document.getElementById('saveAnalysisBtn');
        saveBtn.style.display = 'none';
        saveBtn.onclick = () => this.saveModalChanges(image.id);
        editSwitch.onchange = () => {
            editContainer.style.display = editSwitch.checked ? 'block' : 'none';
            saveBtn.style.display = editSwitch.checked ? 'inline-block' : 'none';
        };
        document.getElementById('modalImageType').onchange = () => {
            const type = document.getElementById('modalImageType').value;
            document.getElementById('modalCharacterFields').style.display = type === 'character' ? 'block' : 'none';
            document.getElementById('modalSceneFields').style.display = type === 'scene' ? 'block' : 'none';
        };
        modal.show();
    },
    populateModalEditForm(image) {
        document.getElementById('modalImageName').value = image.name || '';
        document.getElementById('modalImageType').value = image.image_type || 'character';
        document.getElementById('modalDescriptionField').value = image.description || '';
        const type = image.image_type || 'character';
        document.getElementById('modalCharacterFields').style.display = type === 'character' ? 'block' : 'none';
        document.getElementById('modalSceneFields').style.display = type === 'scene' ? 'block' : 'none';
        if (type === 'character') {
            document.getElementById('modalCharacterRole').value = image.role || 'neutral';
            const traits = image.personality_traits || image.character_traits || image.traits || [];
            document.getElementById('modalCharacterTraits').value = Array.isArray(traits) ? traits.join(', ') : '';
            const plotLines = image.plot_lines || image.potential_plot_lines || [];
            document.getElementById('modalPlotLines').value = Array.isArray(plotLines) ? plotLines.join('\n') : '';
        } else if (type === 'scene') {
            document.getElementById('modalSceneType').value = image.scene_type || 'action';
            document.getElementById('modalSceneSetting').value = image.setting || '';
            const dramaticMoments = image.dramatic_moments || [];
            document.getElementById('modalDramaticMoments').value = Array.isArray(dramaticMoments) ? dramaticMoments.join('\n') : '';
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
                modal.hide();
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
            row.querySelector('.view-story-btn').addEventListener('click', () => this.viewStory(story.id));
            row.querySelector('.delete-story-btn').addEventListener('click', () => this.deleteStory(story.id));
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
                document.getElementById('totalImages').textContent = response.stats.image_count;
                document.getElementById('characterImages').textContent = response.stats.character_count;
                document.getElementById('sceneImages').textContent = response.stats.scene_count;
                document.getElementById('totalStories').textContent = response.stats.story_count;
                document.getElementById('orphanedImages').textContent = response.stats.orphaned_images;
                document.getElementById('emptyStories').textContent = response.stats.empty_stories;
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

export default DataHandler;


// modules/debug/ModalHandler.js
const ModalHandler = {
    initialize() {
        const detailsModal = document.getElementById('detailsModal');
        if (detailsModal) {
            detailsModal.addEventListener('hidden.bs.modal', () => {
                document.getElementById('detailsModalLabel').innerHTML =
                    '<i class="fas fa-edit me-2"></i>Image Details';
                document.getElementById('modalImage').style.display = '';
                document.getElementById('modalEditModeSwitch').style.display = '';
                document.getElementById('reanalyzeImageBtn').style.display = '';
            });
        }
        console.log('Modal handler initialized');
    }
};

export default ModalHandler;


// modules/debug/ImageHandler.js
const ImageHandler = {
    initialize() {
        console.log('Image handler initialized');
    }
};

export default ImageHandler;


// modules/debug/EventHandler.js
const EventHandler = {
    initialize() {
        console.log('Event handler initialized');
    }
};

export default EventHandler;

/**
 * Main entry point for the debug application
 * Uses ES6 modules for better organization
 */

// Import modules
import DebugUtils from './modules/debug/DebugUtils.js';
import DebugAPI from './modules/debug/DebugAPI.js';
import DebugUI from './modules/debug/DebugUI.js';
import FormHandler from './modules/debug/FormHandler.js';
import DataHandler from './modules/debug/DataHandler.js';
import ModalHandler from './modules/debug/ModalHandler.js';
import ImageHandler from './modules/debug/ImageHandler.js';
import EventHandler from './modules/debug/EventHandler.js';

// Make modules accessible globally
window.DebugUtils = DebugUtils;
window.DebugAPI = DebugAPI;
window.DebugUI = DebugUI;
window.FormHandler = FormHandler;
window.DataHandler = DataHandler;
window.ModalHandler = ModalHandler;
window.ImageHandler = ImageHandler;
window.EventHandler = EventHandler;

// Main Debug App module to initialize everything
const DebugApp = {
    /**
     * Initialize the debug application
     */
    initialize() {
        // Initialize all modules
        DebugUI.initialize();
        FormHandler.initialize();
        DataHandler.initialize();
        ModalHandler.initialize();
        ImageHandler.initialize();
        EventHandler.initialize();

        console.log('Debug application initialized');
    }
};

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    DebugApp.initialize();
});

// Export modules for potential reuse or debugging
window.Debug = {
    Utils: DebugUtils,
    API: DebugAPI,
    UI: DebugUI,
    FormHandler: FormHandler,
    DataHandler: DataHandler,
    ModalHandler: ModalHandler,
    ImageHandler: ImageHandler,
    EventHandler: EventHandler,
    App: DebugApp
};