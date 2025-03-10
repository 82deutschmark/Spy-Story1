/**
 * DOM manipulation utilities
 */

export const dom = {
    /**
     * Show a toast notification
     * @param {string} title - Toast title
     * @param {string} message - Toast message
     */
    showToast(title, message) {
        const toastEl = document.getElementById('notificationToast');
        if (toastEl) {
            const toast = new bootstrap.Toast(toastEl);
            document.getElementById('toastTitle').textContent = title;
            document.getElementById('toastMessage').textContent = message;
            toast.show();
        }
    },

    /**
     * Create a loading overlay
     * @param {string} message - Loading message
     * @returns {HTMLElement} - The loading percentage element
     */
    createLoadingOverlay(message = 'Generating Story...') {
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <div class="loading-percentage">0%</div>
            </div>
        `;
        document.body.appendChild(overlay);
        overlay.style.display = 'flex';
        return overlay.querySelector('.loading-percentage');
    },

    /**
     * Update loading percentage
     * @param {HTMLElement} element - Loading percentage element
     * @param {number} percent - Loading percentage
     */
    updateLoadingPercent(element, percent) {
        element.textContent = `${Math.round(percent)}%`;
    },

    /**
     * Remove loading overlay
     * @param {HTMLElement} overlay - Loading percentage element
     */
    removeLoadingOverlay(overlay) {
        overlay.closest('.loading-overlay').remove();
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