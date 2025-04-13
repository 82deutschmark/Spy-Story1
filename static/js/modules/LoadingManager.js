/**
 * LoadingManager.js - Loading State Management
 * ==========================================
 * 
 * This module provides a centralized way to manage loading states and animations
 * across the application. It handles both button loading states and full-page
 * loading overlays.
 * 
 * Key Features:
 * ------------
 * - Button loading states with spinner
 * - Full-page loading overlay with progress
 * - Context-specific loading messages
 * - Automatic cleanup of loading states
 * 
 * Integration Points:
 * -----------------
 * - Forms: Manages loading states during form submission
 * - Buttons: Handles button state changes during loading
 * - UI: Provides visual feedback during async operations
 * 
 * Usage:
 * -----
 * 1. Initialize with LoadingManager.initialize()
 * 2. Use startLoading() to show loading state
 * 3. Use stopLoading() to clear loading state
 * 4. Use updateProgress() to update loading progress
 */

class LoadingManager {
    constructor() {
        this.loadingStates = new Map();
        this.progressIntervals = new Map();
    }

    /**
     * Initialize the loading manager
     * Sets up event listeners for cleanup
     */
    initialize() {
        // Clean up loading states on page unload
        window.addEventListener('beforeunload', () => {
            this.cleanupAllLoadingStates();
        });
    }

    /**
     * Start loading state for a button
     * @param {HTMLElement} button - The button element
     * @param {string} message - Loading message to display
     * @returns {Object} Loading state object with cleanup function
     */
    startButtonLoading(button, message = 'Processing...') {
        // Instead of applying a button spinner, disable the button and show a full-screen overlay.
        const originalText = button.innerHTML;
        button.disabled = true;
        const loadingState = this.startLoadingOverlay(message);
        // Store button info along with the overlay state
        this.loadingStates.set(button, { overlayState: loadingState, originalText });
        return loadingState;
    }

    /**
     * Stop loading state for a button
     * @param {HTMLElement} button - The button element
     */
    stopButtonLoading(button) {
        const state = this.loadingStates.get(button);
        if (state) {
            button.disabled = false;
            this.stopLoadingOverlay(state.overlayState.overlay);
            this.loadingStates.delete(button);
        }
    }

    /**
     * Start a full-page loading overlay
     * @param {string} message - Loading message to display
     * @returns {Object} Loading overlay object with cleanup function
     */
    startLoadingOverlay(message = 'Loading...') {
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        // Add critical styles inline to ensure visibility
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
        overlay.style.display = 'flex';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.style.zIndex = '99999'; // Extremely high z-index
        // Notice the spinner-border here comes from Bootstrap and auto-animates:
        overlay.innerHTML = `
            <div class="loading-content">
                <div class="spinner-border text-primary mb-3" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <div class="loading-message">${message}</div>
                <div class="loading-flair" style="font-style: italic; color: #28a745; margin-bottom: 10px;">
                    Please wait, we're making magic happen!
                </div>
                <div class="loading-percentage" style="font-weight: bold;">0%</div>
                <div class="progress mt-3" style="width: 250px;">
                    <div class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" style="width: 0%"></div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const loadingState = {
            overlay,
            progressBar: overlay.querySelector('.progress-bar'),
            percentage: overlay.querySelector('.loading-percentage'),
            message: overlay.querySelector('.loading-message'),
            fakeProgressInterval: null,
            cleanup: () => {
                clearInterval(loadingState.fakeProgressInterval);
                this.stopLoadingOverlay(overlay);
            }
        };

        // Start fake progress update with variability for realism during long API calls
        let fakeProgress = 0;
        loadingState.fakeProgressInterval = setInterval(() => {
            // Add variability - sometimes progress faster, sometimes slower or pause
            // This makes the progress bar more realistic for long API calls
            const increment = Math.random() < 0.7 ? 1 : 0; // 30% chance of pausing
            fakeProgress += increment;
            
            // Slow down as we approach higher percentages - simulates API calls taking longer
            if (fakeProgress > 70 && Math.random() < 0.5) {
                // 50% chance of not incrementing when over 70%
                fakeProgress = fakeProgress;
            }
            
            // Cap at 90% - leave the final 10% for actual completion
            if (fakeProgress >= 90) {
                fakeProgress = 90;
                clearInterval(loadingState.fakeProgressInterval);
            }
            
            this.updateProgress(loadingState, fakeProgress);
        }, 300); // Using 300ms to make progress much slower

        this.loadingStates.set(overlay, loadingState);
        return loadingState;
    }

    /**
     * Stop a full-page loading overlay
     * @param {HTMLElement} overlay - The overlay element to remove
     */
    stopLoadingOverlay(overlay) {
        overlay.remove();
        this.loadingStates.delete(overlay);
    }

    /**
     * Update loading progress
     * @param {Object} loadingState - The loading state object
     * @param {number} progress - Progress percentage (0-100)
     */
    updateProgress(loadingState, progress) {
        if (loadingState.progressBar) {
            const pct = Math.min(100, Math.max(0, progress));
            loadingState.progressBar.style.width = `${pct}%`;
            if(loadingState.percentage) {
                loadingState.percentage.textContent = `${pct}%`;
            }
        }
    }

    /**
     * Update loading message
     * @param {Object} loadingState - The loading state object
     * @param {string} message - New loading message
     */
    updateMessage(loadingState, message) {
        if (loadingState.message) {
            loadingState.message.textContent = message;
        }
    }

    /**
     * Start a progress animation
     * @param {Object} loadingState - The loading state object
     * @param {number} duration - Duration in milliseconds
     * @param {number} targetProgress - Target progress percentage
     */
    startProgressAnimation(loadingState, duration = 6000, targetProgress = 100) { // Modified duration to 6000ms (twice as slow as original 3000ms)
        const startTime = Date.now();
        const startProgress = 0;

        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(
                startProgress + (elapsed / duration) * targetProgress,
                targetProgress
            );

            this.updateProgress(loadingState, progress);

            if (progress >= targetProgress) {
                clearInterval(interval);
                this.progressIntervals.delete(loadingState);
            }
        }, 50);

        this.progressIntervals.set(loadingState, interval);
    }

    /**
     * Stop a progress animation
     * @param {Object} loadingState - The loading state object
     */
    stopProgressAnimation(loadingState) {
        const interval = this.progressIntervals.get(loadingState);
        if (interval) {
            clearInterval(interval);
            this.progressIntervals.delete(loadingState);
        }
    }

    /**
     * Clean up all loading states
     */
    cleanupAllLoadingStates() {
        // Stop all progress animations
        this.progressIntervals.forEach((interval) => {
            clearInterval(interval);
        });
        this.progressIntervals.clear();

        // Clean up all loading states
        this.loadingStates.forEach((state) => {
            if (state.cleanup) {
                state.cleanup();
            }
        });
        this.loadingStates.clear();
    }
}

// Export the LoadingManager class
export default LoadingManager;