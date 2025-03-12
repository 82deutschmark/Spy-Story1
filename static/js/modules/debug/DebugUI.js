
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
    
    createPagination(elementId, totalPages, currentPage, clickHandler) {
        const paginationEl = document.getElementById(elementId);
        if (!paginationEl) {
            console.error(`Pagination element with ID ${elementId} not found`);
            return;
        }
        
        paginationEl.innerHTML = '';
        console.log(`Creating pagination for ${elementId}: pages=${totalPages}, current=${currentPage}`);

        if (totalPages <= 1) return;

        const prevLi = document.createElement('li');
        prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
        const prevLink = document.createElement('a');
        prevLink.className = 'page-link';
        prevLink.href = 'javascript:void(0);';
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
            link.href = 'javascript:void(0);';
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
        nextLink.href = 'javascript:void(0);';
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
