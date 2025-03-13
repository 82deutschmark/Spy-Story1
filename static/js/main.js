
// Main JavaScript entry point
import NotebookManager from './modules/NotebookManager.js';
import UserProgressManager from './modules/UserProgressManager.js';

document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded, initializing modules...");
    
    // Initialize notebook manager
    const notebookManager = new NotebookManager();
    if (typeof notebookManager.initialize === 'function') {
        notebookManager.initialize();
    }
    
    // Initialize user progress manager
    const userProgressManager = new UserProgressManager();
    if (typeof userProgressManager.initialize === 'function') {
        userProgressManager.initialize();
    }

    // Set up event listener for continue story button in the agent details section
    setupContinueStoryButton();
});

// Function to set up event listener for continue story button
function setupContinueStoryButton() {
    const continueStoryBtn = document.getElementById('continueStoryBtn');
    if (continueStoryBtn) {
        continueStoryBtn.addEventListener('click', function() {
            const lastStoryId = localStorage.getItem('lastStoryId');
            if (lastStoryId) {
                window.location.href = `/storyboard?story_id=${lastStoryId}`;
            } else {
                showNotification('No previous story found to continue', 'warning');
            }
        });
    }
}

// Utility function for showing notifications
function showNotification(message, type = 'info') {
    const toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) return;

    const toast = document.getElementById('notificationToast');
    const toastTitle = document.getElementById('toastTitle');
    const toastMessage = document.getElementById('toastMessage');
    
    // Set appropriate title and icon based on type
    let title = 'Notification';
    let icon = 'fa-info-circle';
    
    switch (type) {
        case 'success':
            title = 'Success';
            icon = 'fa-check-circle';
            break;
        case 'danger':
            title = 'Error';
            icon = 'fa-exclamation-circle';
            break;
        case 'warning':
            title = 'Warning';
            icon = 'fa-exclamation-triangle';
            break;
    }
    
    // Update toast content
    if (toastTitle) toastTitle.innerHTML = `<i class="fas ${icon} me-2"></i>${title}`;
    if (toastMessage) toastMessage.textContent = message;
    
    // Show the toast
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
}
