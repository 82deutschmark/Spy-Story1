
/**
 * Debug UI Module
 * Handles DOM interactions for the debug interface
 */
export default {
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

    /**
     * Initialize UI elements
     */
    initialize() {
        console.log('Debug UI module initialized');
    },

    /**
     * Toggle fields based on image type
     */
    toggleFieldsByImageType() {
        const type = this.elements.imageType.value;
        this.elements.characterFields.style.display = type === 'character' ? 'block' : 'none';
        this.elements.sceneFields.style.display = type === 'scene' ? 'block' : 'none';
    },

    /**
     * Show result container
     */
    showResult() {
        this.elements.resultContainer.style.display = 'block';
    },

    /**
     * Hide result container
     */
    hideResult() {
        this.elements.resultContainer.style.display = 'none';
    },

    /**
     * Display generated content
     * @param {string} content - Content to display
     */
    displayGeneratedContent(content) {
        this.elements.generatedContent.textContent = content;
        this.showResult();
    },

    /**
     * Populate edit form with data
     * @param {object} data - Data to populate form with
     */
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

    /**
     * Create pagination controls
     * @param {string} elementId - ID of pagination container
     * @param {number} totalPages - Total number of pages
     * @param {number} currentPage - Current page
     * @param {function} clickHandler - Click handler for page links
     */
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
