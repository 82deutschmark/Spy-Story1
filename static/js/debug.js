/**
 * Debug page JavaScript for managing image analysis and database records
 */
import { imageAnalyzer } from './debug/image-analyzer.js';
import { formManager } from './debug/form-manager.js';
import { databaseManager } from './debug/database-manager.js';
import { dom } from './utils/dom.js';

// Track current image data
let currentImageData = null;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize form manager with current analysis data if any
    const analysisData = document.getElementById('generatedContent')?.dataset?.analysis;
    formManager.init(analysisData ? JSON.parse(analysisData) : null);

    // Handle image analysis form submission
    const imageForm = document.getElementById('imageForm');
    if (imageForm) {
        imageForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const imageUrl = document.getElementById('imageUrl').value;

            if (!imageUrl) {
                dom.showToast('Error', 'Please enter an image URL', true);
                return;
            }

            // Show initial analysis state
            const generatedContent = document.getElementById('generatedContent');
            generatedContent.innerHTML = '<div class="text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div><p>Analyzing image...</p></div>';
            document.getElementById('result').style.display = 'block';

            try {
                // Analyze image
                const result = await imageAnalyzer.analyze(imageUrl);
                if (!result) return;

                // Update UI with results
                generatedContent.textContent = JSON.stringify(result.analysis, null, 2);
                generatedContent.dataset.analysis = JSON.stringify(result.analysis);
                generatedContent.dataset.imageUrl = result.imageUrl;

                // Store image data
                currentImageData = result;

                // Update UI elements
                const saveToDbBtn = document.getElementById('saveToDbBtn');
                if (saveToDbBtn) {
                    saveToDbBtn.style.display = result.savedToDb ? 'none' : 'inline-block';
                }

                // Setup edit form if analysis was successful
                formManager.populateEditForm(result.analysis);

            } catch (error) {
                console.error('Image analysis error:', error);
                generatedContent.textContent = 'Error: ' + error.message;
                dom.showToast('Error', error.message, true);
            }
        });
    }

    // Handle save to database button
    const saveToDbBtn = document.getElementById('saveToDbBtn');
    if (saveToDbBtn) {
        saveToDbBtn.addEventListener('click', async function() {
            if (!currentImageData) {
                dom.showToast('Error', 'No image data to save', true);
                return;
            }

            // Disable button during save
            this.disabled = true;
            this.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';

            try {
                const success = await imageAnalyzer.saveToDatabase({
                    imageUrl: currentImageData.imageUrl,
                    analysis: JSON.parse(document.getElementById('generatedContent').textContent)
                });

                if (success) {
                    this.innerHTML = '<i class="fas fa-check me-2"></i>Saved';
                    setTimeout(() => {
                        location.reload();
                    }, 2000);
                }
            } catch (error) {
                this.disabled = false;
                this.innerHTML = '<i class="fas fa-save me-2"></i>Save to Database';
                console.error('Save error:', error);
            }
        });
    }

    // Handle copy button
    const copyBtn = document.getElementById('copyBtn');
    if (copyBtn) {
        copyBtn.addEventListener('click', function() {
            const content = document.getElementById('generatedContent')?.textContent;
            if (!content) {
                dom.showToast('Error', 'No content to copy', true);
                return;
            }

            navigator.clipboard.writeText(content)
                .then(() => dom.showToast('Success', 'Copied to clipboard'))
                .catch(err => dom.showToast('Error', 'Failed to copy: ' + err.message, true));
        });
    }

    // Initialize database functionality
    const imagesTableBody = document.getElementById('imagesTableBody');
    if (imagesTableBody) {
        // Initial load of images
        databaseManager.refreshImagesList(imagesTableBody);

        // Handle refresh button
        document.getElementById('refreshImagesBtn')?.addEventListener('click', () => {
            databaseManager.refreshImagesList(imagesTableBody);
        });

        // Handle delete all images button
        document.getElementById('deleteAllImagesBtn')?.addEventListener('click', async () => {
            const success = await databaseManager.deleteAllImages();
            if (success) {
                databaseManager.refreshImagesList(imagesTableBody);
            }
        });
    }

    // Handle view details clicks (delegated)
    document.addEventListener('click', async function(e) {
        const viewBtn = e.target.closest('.view-details-btn');
        if (!viewBtn) return;

        const imageId = viewBtn.getAttribute('data-id');
        if (!imageId) return;

        try {
            const data = await databaseManager.loadImageDetails(imageId);
            if (!data) return;

            // Update modal content
            const modalImage = document.getElementById('modalImage');
            const modalContent = document.getElementById('modalContent');

            if (modalImage && modalContent) {
                modalImage.src = data.image_url;
                modalContent.textContent = JSON.stringify(data.analysis, null, 2);
            }

            // Store current image data
            currentImageData = {
                id: data.id,
                imageUrl: data.image_url,
                analysis: data.analysis
            };

            // Reset edit mode
            document.getElementById('editModeSwitch').checked = false;
            document.getElementById('saveAnalysisBtn').style.display = 'none';

            // Show modal
            const detailsModal = new bootstrap.Modal(document.getElementById('detailsModal'));
            detailsModal.show();
        } catch (error) {
            console.error('Failed to load image details:', error);
        }
    });

    // Handle delete image clicks (delegated)
    document.addEventListener('click', async function(e) {
        const deleteBtn = e.target.closest('.delete-image-btn');
        if (!deleteBtn) return;

        const imageId = deleteBtn.getAttribute('data-id');
        if (!imageId) return;

        const success = await databaseManager.deleteImage(imageId);
        if (success) {
            deleteBtn.closest('tr')?.remove();
            databaseManager.refreshImagesList(imagesTableBody);
        }
    });
});