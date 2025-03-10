/**
 * DOM manipulation utilities
 */

export const dom = {
    /**
     * Create loading overlay with percentage display
     * @param {string} message - Loading message to display
     * @returns {HTMLElement} - Percentage element for updates
     */
    createLoadingOverlay(message = 'Loading...') {
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
     * Update loading percentage display
     * @param {HTMLElement} element - Percentage element
     * @param {number} percent - Percentage value (0-100)
     */
    updateLoadingPercent(element, percent) {
        if (element) {
            element.textContent = `${Math.round(percent)}%`;
        }
    },

    /**
     * Remove loading overlay
     * @param {HTMLElement} overlay - Percentage element
     */
    removeLoadingOverlay(overlay) {
        if (overlay) {
            const overlayEl = overlay.closest('.loading-overlay');
            if (overlayEl) {
                overlayEl.remove();
            }
        }
    },

    /**
     * Show toast notification
     * @param {string} title - Toast title
     * @param {string} message - Toast message
     */
    showToast(title, message) {
        const toastEl = document.getElementById('notificationToast');
        if (toastEl) {
            const toast = new bootstrap.Toast(toastEl);
            const titleEl = document.getElementById('toastTitle');
            const messageEl = document.getElementById('toastMessage') || document.getElementById('toastBody');

            if (titleEl) titleEl.textContent = title;
            if (messageEl) messageEl.textContent = message;

            toast.show();
        }
    }
};

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
};