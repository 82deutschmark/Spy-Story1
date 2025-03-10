/**
 * DOM manipulation utilities
 */

export const dom = {
    /**
     * Create a loading overlay with progress indicator
     * @param {string} message - Loading message to display
     * @returns {HTMLElement} - Loading percentage element
     */
    createLoadingOverlay: (message) => {
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="loading-content">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="loading-message">${message || 'Loading...'}</p>
                <div class="loading-progress">
                    <div class="progress">
                        <div class="progress-bar" role="progressbar" style="width: 0%"></div>
                    </div>
                    <span class="loading-percent">0%</span>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        return overlay.querySelector('.loading-percent');
    },

    /**
     * Update loading percentage display
     * @param {HTMLElement} element - Loading percentage element
     * @param {number} percent - Percentage to display (0-100)
     */
    updateLoadingPercent: (element, percent) => {
        if (!element) return;
        const progress = Math.min(100, Math.max(0, percent));
        element.textContent = `${progress}%`;
        const progressBar = element.closest('.loading-overlay')?.querySelector('.progress-bar');
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }
    },

    /**
     * Remove loading overlay
     * @param {HTMLElement} element - Any element within loading overlay
     */
    removeLoadingOverlay: (element) => {
        if (!element) return;
        element.closest('.loading-overlay')?.remove();
    },

    /**
     * Show toast notification
     * @param {string} title - Toast title
     * @param {string} message - Toast message
     * @param {boolean} [isError=false] - Whether this is an error message
     */
    showToast: (title, message, isError = false) => {
        const toast = document.getElementById('notificationToast');
        if (!toast) return;

        const toastTitle = toast.querySelector('#toastTitle');
        const toastBody = toast.querySelector('#toastBody');

        if (toastTitle && toastBody) {
            toastTitle.textContent = title;
            toastBody.textContent = message;

            if (isError) {
                toast.classList.add('bg-danger', 'text-white');
            } else {
                toast.classList.remove('bg-danger', 'text-white');
            }

            const bsToast = new bootstrap.Toast(toast);
            bsToast.show();
        }
    },

    /**
     * Form utilities
     */
    form: {
        /**
         * Clear form inputs
         * @param {HTMLFormElement} form - Form to clear
         */
        clear: (form) => {
            if (!form) return;
            form.reset();
            form.querySelectorAll('input, select, textarea').forEach(input => {
                input.value = '';
            });
        },

        /**
         * Disable/enable form submission
         * @param {HTMLFormElement} form - Form to toggle
         * @param {boolean} disabled - Whether to disable the form
         */
        toggleSubmit: (form, disabled) => {
            if (!form) return;
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = disabled;
                submitBtn.classList.toggle('loading', disabled);
            }
        }
    },

    /**
     * Character selection utilities
     */
    character: {
        /**
         * Update character selection UI
         * @param {HTMLElement} card - Character card element
         * @param {boolean} selected - Whether character is selected
         */
        updateSelection: (card, selected) => {
            if (!card) return;
            const indicator = card.querySelector('.selection-indicator');
            const checkbox = card.querySelector('.character-checkbox');

            card.classList.toggle('selected', selected);
            if (indicator) {
                indicator.style.display = selected ? 'block' : 'none';
            }
            if (checkbox) {
                checkbox.checked = selected;
            }
        },

        /**
         * Clear all character selections
         */
        clearAllSelections: () => {
            document.querySelectorAll('.character-select-card').forEach(card => {
                dom.character.updateSelection(card, false);
            });
        }
    },

    /**
     * Modal utilities
     */
    modal: {
        /**
         * Show modal
         * @param {string} modalId - Modal element ID
         */
        show: (modalId) => {
            const modal = document.getElementById(modalId);
            if (modal) {
                const bsModal = new bootstrap.Modal(modal);
                bsModal.show();
            }
        },

        /**
         * Hide modal
         * @param {string} modalId - Modal element ID
         */
        hide: (modalId) => {
            const modal = document.getElementById(modalId);
            if (modal) {
                const bsModal = bootstrap.Modal.getInstance(modal);
                if (bsModal) {
                    bsModal.hide();
                }
            }
        }
    }
};
/**
 * DOM utility functions
 */
export const dom = {
    /**
     * Show a loading overlay with a progress indicator
     * @param {string} message - Message to display
     * @returns {HTMLElement} - The loading percentage element for updates
     */
    addLoadingOverlay(message = 'Loading...') {
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <div class="loading-percentage">0%</div>
                <div class="loading-message">${message}</div>
            </div>
        `;
        document.body.appendChild(overlay);
        overlay.style.display = 'flex';
        return overlay.querySelector('.loading-percentage');
    },

    /**
     * Update loading percentage
     * @param {HTMLElement} element - Loading percentage element
     * @param {number} percent - Percentage to display
     */
    updateLoadingPercent(element, percent) {
        if (element) {
            element.textContent = `${Math.round(percent)}%`;
        }
    },

    /**
     * Remove loading overlay
     * @param {HTMLElement} element - Loading percentage element
     */
    removeLoadingOverlay(element) {
        if (element && element.closest) {
            const overlay = element.closest('.loading-overlay');
            if (overlay) {
                overlay.remove();
            }
        }
    },

    /**
     * Show a toast notification
     * @param {string} title - Toast title
     * @param {string} message - Toast message
     * @param {boolean} isError - Whether this is an error message
     */
    showToast(title, message, isError = false) {
        const toastEl = document.getElementById('notificationToast');
        if (!toastEl) return;

        const toast = new bootstrap.Toast(toastEl);
        const titleEl = document.getElementById('toastTitle');
        const messageEl = document.getElementById('toastMessage') || document.getElementById('toastBody');
        
        if (titleEl) titleEl.textContent = title;
        if (messageEl) messageEl.textContent = message;
        
        if (isError) {
            toastEl.classList.add('bg-danger', 'text-white');
        } else {
            toastEl.classList.remove('bg-danger', 'text-white');
        }
        
        toast.show();
    }
};
