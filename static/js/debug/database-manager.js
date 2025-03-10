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
                        <td>${img.image_type}</td>
                        <td>${img.name || 'N/A'}</td>
                        <td>${img.created_at}</td>
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
            dom.showToast('Error', 'Failed to load images: ' + error.message, 'error');
        }
    },

    /**
     * Delete an image record
     * @param {string} imageId - ID of the image to delete
     * @returns {Promise<boolean>} Success status
     */
    deleteImage: async (imageId) => {
        try {
            const response = await api.delete(`/api/image/${imageId}`);
            
            if (response.error) {
                throw new Error(response.error);
            }
            
            dom.showToast('Success', response.message, 'success');
            return true;
        } catch (error) {
            dom.showToast('Error', 'Failed to delete image: ' + error.message, 'error');
            return false;
        }
    },

    /**
     * Delete all image records
     * @returns {Promise<boolean>} Success status
     */
    deleteAllImages: async () => {
        try {
            const response = await api.post('/api/db/delete-all-images');
            
            if (response.error) {
                throw new Error(response.error);
            }
            
            dom.showToast('Success', response.message, 'success');
            return true;
        } catch (error) {
            dom.showToast('Error', 'Failed to delete all images: ' + error.message, 'error');
            return false;
        }
    }
};
