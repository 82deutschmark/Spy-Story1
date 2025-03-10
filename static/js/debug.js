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
            const resultContainer = document.getElementById('result');
            const generatedContent = document.getElementById('generatedContent');
            generatedContent.innerHTML = '<div class="text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div><p>Analyzing image...</p></div>';
            resultContainer.style.display = 'block';

            try {
                // Analyze image
                const result = await imageAnalyzer.analyze(imageUrl);
                if (!result) return;

                // Store image data
                currentImageData = result;
                
                // Update UI to show image thumbnail
                const imagePreview = document.createElement('div');
                imagePreview.className = 'text-center mb-3';
                imagePreview.innerHTML = `
                    <img src="${result.imageUrl}" class="img-fluid rounded shadow-sm" alt="Analyzed Image" style="max-height: 300px;">
                    <div class="mt-3 mb-3">
                        <h5>Image Analysis Results</h5>
                        <p class="text-muted">${result.description || 'Analysis complete. You can edit the details below.'}</p>
                    </div>
                `;
                
                generatedContent.innerHTML = '';
                generatedContent.appendChild(imagePreview);
                
                // Store analysis data in hidden form
                generatedContent.dataset.analysis = JSON.stringify(result.analysis);
                generatedContent.dataset.imageUrl = result.imageUrl;

                // Enable edit mode by default
                const editModeSwitch = document.getElementById('editModeSwitch');
                if (editModeSwitch) {
                    editModeSwitch.checked = true;
                    document.getElementById('editContainer').style.display = 'block';
                }

                // Setup edit form with analyzed data
                formManager.populateEditForm(result.analysis);
                
                // Show save button
                const saveToDbBtn = document.getElementById('saveToDbBtn');
                if (saveToDbBtn) {
                    saveToDbBtn.style.display = 'inline-block';
                }

            } catch (error) {
                console.error('Image analysis error:', error);
                generatedContent.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
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

    // Copy button removed as requested

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