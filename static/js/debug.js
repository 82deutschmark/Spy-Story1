// Debug page JavaScript using ES6 modules for better organization

// Utility module for common functions
const Utils = {
    // Toast notification function
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

    // Deep clone object to avoid reference issues
    deepClone(obj) {
        try {
            return JSON.parse(JSON.stringify(obj));
        } catch (e) {
            console.error('Error cloning object:', e);
            return {};
        }
    },

    // Log object for debugging
    logDebug(title, data) {
        console.log(`${title}:`, data);
    },

    // Safe parse JSON
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

// API module for handling server communication
const API = {
    // Make GET request to endpoint
    async get(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('API GET error:', error);
            Utils.showToast('API Error', error.message, true);
            throw error;
        }
    },

    // Make POST request to endpoint
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
            Utils.showToast('API Error', error.message, true);
            throw error;
        }
    },

    // Delete resource
    async delete(url) {
        try {
            const response = await fetch(url, { method: 'DELETE' });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('API DELETE error:', error);
            Utils.showToast('API Error', error.message, true);
            throw error;
        }
    }
};

// UI module for handling DOM interactions
const UI = {
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
        // Image table elements
        imagesTableBody: document.getElementById('imagesTableBody'),
        imagesPagination: document.getElementById('imagesPagination'),
        // Stories table elements
        storiesTableBody: document.getElementById('storiesTableBody'),
        storiesPagination: document.getElementById('storiesPagination')
    },

    initialize() {
        this.setupEventListeners();
        console.log('UI module initialized');
    },

    setupEventListeners() {
        // Form submission
        this.elements.imageForm.addEventListener('submit', event => {
            event.preventDefault();
            FormHandler.handleImageAnalysis();
        });

        // Edit mode toggle
        this.elements.editModeSwitch.addEventListener('change', () => {
            this.elements.editContainer.style.display = 
                this.elements.editModeSwitch.checked ? 'block' : 'none';
        });

        // Copy button
        this.elements.copyBtn.addEventListener('click', () => {
            const content = this.elements.generatedContent.textContent;
            navigator.clipboard.writeText(content)
                .then(() => Utils.showToast('Success', 'Content copied to clipboard'))
                .catch(err => Utils.showToast('Error', 'Failed to copy: ' + err, true));
        });

        // Image type change
        this.elements.imageType.addEventListener('change', () => {
            this.toggleFieldsByImageType();
        });

        // Apply changes button
        this.elements.applyChangesBtn.addEventListener('click', () => {
            FormHandler.applyChanges();
        });

        // Filter buttons
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

        // Common fields
        document.getElementById('imageName').value = data.name || '';
        document.getElementById('descriptionField').value = data.description || '';

        // Set image type and show corresponding fields
        document.getElementById('imageType').value = data.image_type || 'character';
        this.toggleFieldsByImageType();

        // Character-specific fields
        if (data.image_type === 'character') {
            document.getElementById('characterRole').value = data.role || 'undetermined';
            document.getElementById('characterTraits').value = 
                Array.isArray(data.traits) ? data.traits.join(', ') : '';
            document.getElementById('plotLines').value = 
                Array.isArray(data.plot_lines) ? data.plot_lines.join('\n') : '';
        } 
        // Scene-specific fields
        else if (data.image_type === 'scene') {
            document.getElementById('sceneType').value = data.scene_type || 'action';
            document.getElementById('sceneSetting').value = data.setting || '';
            document.getElementById('dramaticMoments').value = 
                Array.isArray(data.dramatic_moments) ? data.dramatic_moments.join('\n') : '';
        }
    },

    // Pagination functions
    createPagination(elementId, totalPages, currentPage, clickHandler) {
        const paginationEl = document.getElementById(elementId);
        paginationEl.innerHTML = '';

        if (totalPages <= 1) return;

        // Previous button
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

        // Page numbers
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

        // Next button
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

// Form handling module
const FormHandler = {
    initialize() {
        console.log('Form handler initialized');
    },

    // Handle image analysis form submission
    async handleImageAnalysis() {
        const imageUrl = UI.elements.imageUrl.value.trim();
        if (!imageUrl) {
            Utils.showToast('Error', 'Please enter an image URL', true);
            return;
        }

        try {
            Utils.showToast('Processing', 'Analyzing image...');

            // Send to backend for analysis
            const response = await API.post('/debug/analyze-image', { image_url: imageUrl });

            if (response.success) {
                // Display the result
                UI.displayGeneratedContent(JSON.stringify(response.analysis, null, 2));

                // Populate edit form with data
                UI.populateEditForm(response.analysis);

                // Add save button if not already present
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
                Utils.showToast('Error', response.message || 'Failed to analyze image', true);
            }
        } catch (error) {
            Utils.showToast('Error', 'Failed to analyze image: ' + error.message, true);
        }
    },

    // Apply changes from edit form
    applyChanges() {
        // Get the current content as an object
        const currentContent = UI.elements.generatedContent.textContent;
        let contentObj;
        try {
            contentObj = JSON.parse(currentContent);
        } catch (e) {
            Utils.showToast('Error', 'Failed to parse current content', true);
            return;
        }

        // Update with form values
        contentObj.name = document.getElementById('imageName').value;
        contentObj.type = document.getElementById('imageType').value.toUpperCase();
        contentObj.image_type = document.getElementById('imageType').value;
        contentObj.description = document.getElementById('descriptionField').value;

        // Type-specific fields
        if (contentObj.image_type === 'character') {
            contentObj.role = document.getElementById('characterRole').value;
            contentObj.personality_traits = document.getElementById('characterTraits')
                .value.split(',').map(trait => trait.trim()).filter(trait => trait);

            // For compatibility
            contentObj.character_traits = [...contentObj.personality_traits];

            contentObj.potential_plot_lines = document.getElementById('plotLines')
                .value.split('\n').map(line => line.trim()).filter(line => line);

            // For compatibility
            contentObj.plot_lines = [...contentObj.potential_plot_lines];
        } else {
            contentObj.scene_type = document.getElementById('sceneType').value;
            contentObj.setting = document.getElementById('sceneSetting').value;
            contentObj.dramatic_moments = document.getElementById('dramaticMoments')
                .value.split('\n').map(moment => moment.trim()).filter(moment => moment);
        }

        // Update the displayed content
        UI.elements.generatedContent.textContent = JSON.stringify(contentObj, null, 2);
        console.log('Edited form data:', contentObj);

        Utils.showToast('Success', 'Changes applied');
    },

    // Save analysis to database
    async saveAnalysisToDb(analysis, imageUrl) {
        try {
            // Get the current content as it might have been edited
            const currentContent = UI.elements.generatedContent.textContent;
            let contentObj;
            try {
                contentObj = JSON.parse(currentContent);
            } catch (e) {
                Utils.showToast('Error', 'Failed to parse current content', true);
                return;
            }

            // Prepare data to save
            const saveData = {
                image_url: imageUrl,
                analysis: contentObj
            };

            console.log('Saving analysis data:', saveData);

            // Send to backend
            const response = await API.post('/debug/save-image', saveData);

            if (response.success) {
                Utils.showToast('Success', 'Image saved to database');
                // Refresh image list
                DataHandler.loadImages();
            } else {
                Utils.showToast('Error', response.message || 'Failed to save image', true);
            }
        } catch (error) {
            Utils.showToast('Error', 'Failed to save image: ' + error.message, true);
        }
    }
};

// Image data handling module
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

    // Filter images by type
    filterImages(filter) {
        this.currentFilter = filter;
        this.currentPage = 1;
        this.loadImages();

        // Update active filter button
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-filter') === filter);
        });
    },

    // Search images
    searchImages(term) {
        this.searchTerm = term;
        this.currentPage = 1;
        this.loadImages();
    },

    // Search stories
    searchStories(term) {
        this.storySearchTerm = term;
        this.storyCurrentPage = 1;
        this.loadStories();
    },

    // Load images with pagination
    async loadImages() {
        try {
            UI.elements.imagesTableBody.innerHTML = `
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

            const data = await API.get(url);

            if (data.success) {
                this.renderImagesTable(data.images);
                UI.createPagination('imagesPagination', data.total_pages, this.currentPage, 
                    (page) => {
                        this.currentPage = page;
                        this.loadImages();
                    }
                );
            } else {
                Utils.showToast('Error', data.message || 'Failed to load images', true);
            }
        } catch (error) {
            UI.elements.imagesTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-danger">
                        Failed to load images: ${error.message}
                    </td>
                </tr>
            `;
        }
    },

    // Render images table
    renderImagesTable(images) {
        if (!images || images.length === 0) {
            UI.elements.imagesTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">No images found</td>
                </tr>
            `;
            return;
        }

        UI.elements.imagesTableBody.innerHTML = '';

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

            UI.elements.imagesTableBody.appendChild(row);

            // Add event listeners for buttons
            row.querySelector('.view-btn').addEventListener('click', () => this.openImageDetails(image));
            row.querySelector('.delete-btn').addEventListener('click', () => this.deleteImage(image.id));
        });
    },

    // Open image details modal
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

    // Populate modal edit form
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

    // Save changes from modal
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

            const response = await API.post(`/debug/update-image/${imageId}`, formData);

            if (response.success) {
                Utils.showToast('Success', 'Image updated successfully');
                this.loadImages();

                // Update modal content
                document.getElementById('modalContent').textContent = JSON.stringify(response.image, null, 2);
            } else {
                Utils.showToast('Error', response.message || 'Failed to update image', true);
            }
        } catch (error) {
            Utils.showToast('Error', 'Failed to update image: ' + error.message, true);
        }
    },

    // Reanalyze image
    async reanalyzeImage(imageId, preserveRelations) {
        try {
            Utils.showToast('Processing', 'Reanalyzing image...');

            const response = await API.post(`/debug/reanalyze-image/${imageId}`, {
                preserve_relations: preserveRelations
            });

            if (response.success) {
                Utils.showToast('Success', 'Image reanalyzed successfully');
                this.loadImages();

                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('detailsModal'));
                modal.hide();
            } else {
                Utils.showToast('Error', response.message || 'Failed to reanalyze image', true);
            }
        } catch (error) {
            Utils.showToast('Error', 'Failed to reanalyze image: ' + error.message, true);
        }
    },

    // Delete image
    async deleteImage(imageId) {
        if (!confirm('Are you sure you want to delete this image?')) {
            return;
        }

        try {
            const response = await API.delete(`/debug/images/${imageId}`);

            if (response.success) {
                Utils.showToast('Success', 'Image deleted successfully');
                this.loadImages();
            } else {
                Utils.showToast('Error', response.message || 'Failed to delete image', true);
            }
        } catch (error) {
            Utils.showToast('Error', 'Failed to delete image: ' + error.message, true);
        }
    },

    // Delete all images
    async deleteAllImages() {
        try {
            const response = await API.delete('/debug/images');

            if (response.success) {
                Utils.showToast('Success', 'All images deleted successfully');
                this.loadImages();
            } else {
                Utils.showToast('Error', response.message || 'Failed to delete images', true);
            }
        } catch (error) {
            Utils.showToast('Error', 'Failed to delete images: ' + error.message, true);
        }
    },

    // Load stories
    async loadStories() {
        try {
            UI.elements.storiesTableBody.innerHTML = `
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

            const data = await API.get(url);

            if (data.success) {
                this.renderStoriesTable(data.stories);
                UI.createPagination('storiesPagination', data.total_pages, 
                    this.storyCurrentPage || 1, (page) => {
                        this.storyCurrentPage = page;
                        this.loadStories();
                    }
                );
            } else {
                Utils.showToast('Error', data.message || 'Failed to load stories', true);
            }
        } catch (error) {
            UI.elements.storiesTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-danger">
                        Failed to load stories: ${error.message}
                    </td>
                </tr>
            `;
        }
    },

    // Render stories table
    renderStoriesTable(stories) {
        if (!stories || stories.length === 0) {
            UI.elements.storiesTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">No stories found</td>
                </tr>
            `;
            return;
        }

        UI.elements.storiesTableBody.innerHTML = '';

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

            UI.elements.storiesTableBody.appendChild(row);

            // Add event listeners for buttons
            row.querySelector('.view-story-btn').addEventListener('click', () => this.viewStory(story.id));
            row.querySelector('.delete-story-btn').addEventListener('click', () => this.deleteStory(story.id));
        });
    },

    // View story details
    async viewStory(storyId) {
        try {
            const response = await API.get(`/debug/stories/${storyId}`);

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
                Utils.showToast('Error', response.message || 'Failed to load story', true);
            }
        } catch (error) {
            Utils.showToast('Error', 'Failed to load story: ' + error.message, true);
        }
    },

    // Delete story
    async deleteStory(storyId) {
        if (!confirm('Are you sure you want to delete this story?')) {
            return;
        }

        try {
            const response = await API.delete(`/debug/stories/${storyId}`);

            if (response.success) {
                Utils.showToast('Success', 'Story deleted successfully');
                this.loadStories();
            } else {
                Utils.showToast('Error', response.message || 'Failed to delete story', true);
            }
        } catch (error) {
            Utils.showToast('Error', 'Failed to delete story: ' + error.message, true);
        }
    },

    // Delete all stories
    async deleteAllStories() {
        try {
            const response = await API.delete('/debug/stories');

            if (response.success) {
                Utils.showToast('Success', 'All stories deleted successfully');
                this.loadStories();
            } else {
                Utils.showToast('Error', response.message || 'Failed to delete stories', true);
            }
        } catch (error) {
            Utils.showToast('Error', 'Failed to delete stories: ' + error.message, true);
        }
    },

    // Run database health check
    async runHealthCheck() {
        try {
            Utils.showToast('Processing', 'Running health check...');

            const response = await API.get('/debug/health-check');

            if (response.success) {
                // Update stats
                document.getElementById('totalImages').textContent = response.stats.image_count;
                document.getElementById('characterImages').textContent = response.stats.character_count;
                document.getElementById('sceneImages').textContent = response.stats.scene_count;
                document.getElementById('totalStories').textContent = response.stats.story_count;
                document.getElementById('orphanedImages').textContent`.textContent = response.stats.orphaned_images;
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

                Utils.showToast('Success', 'Health check completed');
            } else {
                Utils.showToast('Error', response.message || 'Failed to run health check', true);
            }
        } catch (error) {
            Utils.showToast('Error', 'Failed to run health check: ' + error.message, true);
        }
    },

    // Fix database issue
    async fixIssue(issueType, issueId) {
        try {
            Utils.showToast('Processing', 'Fixing issue...');

            const response = await API.post('/debug/fix-issue', {
                issue_type: issueType,
                issue_id: issueId
            });

            if (response.success) {
                Utils.showToast('Success', 'Issue fixed successfully');
                this.runHealthCheck();

                // Refresh data
                this.loadImages();
                this.loadStories();
            } else {
                Utils.showToast('Error', response.message || 'Failed to fix issue', true);
            }
        } catch (error) {
            Utils.showToast('Error', 'Failed to fix issue: ' + error.message, true);
        }
    }
};

// Modal handling module
const ModalHandler = {
    initialize() {
        // Initialize modals
        const detailsModal = document.getElementById('detailsModal');
        if (detailsModal) {
            detailsModal.addEventListener('hidden.bs.modal', () => {
                // Reset modal when closed
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

// Image analysis module
const ImageHandler = {
    initialize() {
        // This module handles specific image-related operations
        console.log('Image handler initialized');
    }
};

// Main Debug App module to initialize everything
const DebugApp = {
    initialize() {
        // Initialize all modules
        UI.initialize();
        FormHandler.initialize();
        DataHandler.initialize();
        ModalHandler.initialize();
        ImageHandler.initialize();

        console.log('Debug application initialized');
    }
};

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    DebugApp.initialize();
});

// Export modules for potential reuse
export { Utils, API, UI, FormHandler, DataHandler, ModalHandler, ImageHandler, DebugApp };