/**
 * Database management module for debugging interface
 */
import { api } from '../utils/api.js';
import { dom } from '../utils/dom.js';

export const databaseManager = {
    // Pagination state
    currentPage: 1,
    currentFilter: '',
    currentSearch: '',

    /**
     * Refresh the images list table
     * @param {HTMLElement} tableBody - Table body element to update
     * @param {Object} options - Filter and pagination options
     */
    refreshImagesList: async (tableBody, options = {}) => {
        if (!tableBody) return;

        const {
            page = databaseManager.currentPage,
            filter = databaseManager.currentFilter,
            search = databaseManager.currentSearch
        } = options;

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
            const params = new URLSearchParams({
                page: page,
                per_page: 10
            });

            if (filter) params.append('type', filter);
            if (search) params.append('search', search);

            const data = await api.get(`/api/images/all?${params.toString()}`);

            if (data.error) {
                throw new Error(data.error);
            }

            // Update pagination
            databaseManager.updatePagination(
                document.getElementById('imagesPagination'),
                data.total_pages,
                page,
                (newPage) => databaseManager.refreshImagesList(tableBody, { ...options, page: newPage })
            );

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

            // Store current state
            databaseManager.currentPage = page;
            databaseManager.currentFilter = filter;
            databaseManager.currentSearch = search;

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
     * Update pagination controls
     * @param {HTMLElement} paginationElement - Pagination container element
     * @param {number} totalPages - Total number of pages
     * @param {number} currentPage - Current active page
     * @param {Function} onPageChange - Callback for page change
     */
    updatePagination: (paginationElement, totalPages, currentPage, onPageChange) => {
        if (!paginationElement) return;

        let html = '';

        // Previous button
        html += `
            <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${currentPage - 1}">Previous</a>
            </li>`;

        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            html += `
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>`;
        }

        // Next button
        html += `
            <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${currentPage + 1}">Next</a>
            </li>`;

        paginationElement.innerHTML = html;

        // Add click handlers
        paginationElement.querySelectorAll('.page-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = parseInt(e.target.dataset.page);
                if (!isNaN(page) && page > 0 && page <= totalPages) {
                    onPageChange(page);
                }
            });
        });
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