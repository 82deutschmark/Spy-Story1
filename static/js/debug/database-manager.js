/**
 * Database management module for debugging interface
 */
import { api } from '../utils/api.js';
import { dom } from '../utils/dom.js';

export const databaseManager = {
    /**
     * Refresh the images list table
     * @param {HTMLElement} tableBody - Table body element to update
     */
    refreshImagesList: async (tableBody) => {
        if (!tableBody) return;

        // Show loading state
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </td>
            </tr>`;

        try {
            const data = await api.get('/api/images/all?per_page=10');

            if (data.error) {
                throw new Error(data.error);
            }

            if (data.images.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center">No image records found</td>
                    </tr>`;
                return;
            }

            tableBody.innerHTML = '';
            data.images.forEach(img => {
                tableBody.innerHTML += `
                    <tr data-id="${img.id}">
                        <td>${img.id}</td>
                        <td><img src="${img.image_url}" class="img-thumbnail" width="100" alt="Thumbnail"></td>
                        <td>${img.image_type || 'N/A'}</td>
                        <td>${img.name || 'N/A'}</td>
                        <td>${new Date(img.created_at).toLocaleString()}</td>
                        <td>
                            <div class="btn-group">
                                <button class="btn btn-sm btn-info view-details-btn" data-id="${img.id}" title="View Details">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="btn btn-sm btn-danger delete-image-btn" data-id="${img.id}" title="Delete Record">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>`;
            });
        } catch (error) {
            dom.showToast('Error', 'Failed to load images: ' + error.message, true);
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-danger">
                        Error loading images: ${error.message}
                    </td>
                </tr>`;
        }
    },

    /**
     * Delete an image record
     * @param {string} imageId - ID of the image to delete
     * @returns {Promise<boolean>} Success status
     */
    deleteImage: async (imageId) => {
        if (!confirm('Are you sure you want to delete this image record?')) {
            return false;
        }

        try {
            const response = await api.delete(`/api/image/${imageId}`);

            if (response.error) {
                throw new Error(response.error);
            }

            dom.showToast('Success', 'Image deleted successfully');
            return true;
        } catch (error) {
            dom.showToast('Error', 'Failed to delete image: ' + error.message, true);
            return false;
        }
    },

    /**
     * Delete all image records
     * @returns {Promise<boolean>} Success status
     */
    deleteAllImages: async () => {
        if (!confirm('WARNING: Are you sure you want to delete ALL image records? This cannot be undone.')) {
            return false;
        }

        try {
            const response = await api.delete('/api/images/all');

            if (response.error) {
                throw new Error(response.error);
            }

            dom.showToast('Success', 'All images deleted successfully');
            return true;
        } catch (error) {
            dom.showToast('Error', 'Failed to delete all images: ' + error.message, true);
            return false;
        }
    },

    /**
     * Load image details
     * @param {string} imageId - ID of the image to load
     * @returns {Promise<Object>} Image details
     */
    loadImageDetails: async (imageId) => {
        try {
            const response = await api.get(`/api/image/${imageId}`);

            if (response.error) {
                throw new Error(response.error);
            }

            return response;
        } catch (error) {
            dom.showToast('Error', 'Failed to load image details: ' + error.message, true);
            return null;
        }
    }
};