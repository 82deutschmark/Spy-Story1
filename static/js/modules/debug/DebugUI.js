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

    // Simple helper method to display record counts instead of pagination
    displayRecordCount(elementId, count) {
        const element = document.getElementById(elementId);
        if (!element) {
            console.error(`Element ${elementId} not found`);
            return;
        }

        element.innerHTML = `<div class="text-muted text-center">Showing ${count} records</div>`;
    }
};

export default DebugUI;