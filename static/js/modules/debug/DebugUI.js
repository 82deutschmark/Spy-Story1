/**
 * DebugUI.js - UI manipulation for the debug interface
 */
import DebugUtils from './DebugUtils.js';

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

    initialize(formHandler, dataHandler) {
        this.formHandler = formHandler;
        this.dataHandler = dataHandler;
        this.setupEventListeners();
        console.log('UI module initialized');
    },

    setupEventListeners() {
        if (this.elements.imageForm) {
            this.elements.imageForm.addEventListener('submit', event => {
                event.preventDefault();
                this.formHandler.handleImageAnalysis();
            });
        }

        if (this.elements.editModeSwitch) {
            this.elements.editModeSwitch.addEventListener('change', () => {
                this.elements.editContainer.style.display = this.elements.editModeSwitch.checked ? 'block' : 'none';
            });
        }

        if (this.elements.copyBtn) {
            this.elements.copyBtn.addEventListener('click', () => {
                const content = this.elements.generatedContent.textContent;
                navigator.clipboard.writeText(content)
                    .then(() => DebugUtils.showToast('Success', 'Content copied to clipboard'))
                    .catch(err => DebugUtils.showToast('Error', 'Failed to copy: ' + err, true));
            });
        }

        if (this.elements.imageType) {
            this.elements.imageType.addEventListener('change', () => {
                this.toggleFieldsByImageType();
            });
        }

        if (this.elements.applyChangesBtn) {
            this.elements.applyChangesBtn.addEventListener('click', () => {
                this.formHandler.applyChanges();
            });
        }

        document.querySelectorAll('.filter-btn').forEach(button => {
            button.addEventListener('click', () => {
                const filter = button.getAttribute('data-filter');
                this.dataHandler.filterImages(filter);
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
        const imageName = document.getElementById('imageName');
        const descriptionField = document.getElementById('descriptionField');
        const imageType = document.getElementById('imageType');

        if (imageName) imageName.value = data.name || '';
        if (descriptionField) descriptionField.value = data.description || '';
        if (imageType) {
            imageType.value = data.image_type || 'character';
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
        }
    },

    createPagination(elementId, totalPages, currentPage, onPageChange) {
        console.log(`Creating pagination for ${elementId}: pages=${totalPages}, current=${currentPage}`);
        const paginationElement = document.getElementById(elementId);
        if (!paginationElement) {
            console.error(`Pagination element ${elementId} not found`);
            return;
        }

        paginationElement.innerHTML = '';

        if (!totalPages || totalPages <= 1) {
            return;
        }

        // Create pagination container
        const paginationContainer = document.createElement('ul');
        paginationContainer.className = 'pagination justify-content-center';

        // Previous button
        const prevLi = document.createElement('li');
        prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
        const prevLink = document.createElement('a');
        prevLink.className = 'page-link';
        prevLink.href = '#';
        prevLink.setAttribute('aria-label', 'Previous');
        prevLink.innerHTML = '<span aria-hidden="true">&laquo;</span>';
        if (currentPage > 1) {
            prevLink.addEventListener('click', (e) => {
                e.preventDefault();
                onPageChange(currentPage - 1);
            });
        }
        prevLi.appendChild(prevLink);
        paginationContainer.appendChild(prevLi);

        // Page numbers
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, startPage + 4);

        for (let i = startPage; i <= endPage; i++) {
            const li = document.createElement('li');
            li.className = `page-item ${i === currentPage ? 'active' : ''}`;
            const link = document.createElement('a');
            link.className = 'page-link';
            link.href = '#';
            link.textContent = i;
            link.addEventListener('click', (e) => {
                e.preventDefault();
                onPageChange(i);
            });
            li.appendChild(link);
            paginationContainer.appendChild(li);
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
                onPageChange(currentPage + 1);
            });
        }
        nextLi.appendChild(nextLink);
        paginationContainer.appendChild(nextLi);

        paginationElement.appendChild(paginationContainer);
    }
};

export default DebugUI;