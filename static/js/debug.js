document.addEventListener('DOMContentLoaded', function() {
    // Form elements
    const imageForm = document.getElementById('imageForm');
    const generateBtn = document.getElementById('generateBtn');
    const resultDiv = document.getElementById('result');
    const generatedContent = document.getElementById('generatedContent');
    const copyBtn = document.getElementById('copyBtn');

    // Detail view elements
    const viewDetailsBtns = document.querySelectorAll('.view-details-btn');
    const deleteImageBtns = document.querySelectorAll('.delete-image-btn');
    const deleteStoryBtns = document.querySelectorAll('.delete-story-btn');

    // Database management buttons
    const deleteAllImagesBtn = document.getElementById('deleteAllImagesBtn');
    const deleteAllStoriesBtn = document.getElementById('deleteAllStoriesBtn');
    const refreshImagesBtn = document.getElementById('refreshImagesBtn');
    const refreshStoriesBtn = document.getElementById('refreshStoriesBtn');
    const runHealthCheckBtn = document.getElementById('runHealthCheckBtn');

    // Show toast notification
    function showToast(title, message) {
        const toastTitle = document.getElementById('toastTitle');
        const toastMessage = document.getElementById('toastMessage');
        const toast = new bootstrap.Toast(document.getElementById('notificationToast'));

        toastTitle.textContent = title;
        toastMessage.textContent = message;
        toast.show();
    }

    // Update database stats in the health tab
    function updateStats(stats) {
        document.getElementById('totalImages').textContent = stats.image_count;
        document.getElementById('characterImages').textContent = stats.character_count;
        document.getElementById('sceneImages').textContent = stats.scene_count;
        document.getElementById('totalStories').textContent = stats.story_count;
        document.getElementById('orphanedImages').textContent = stats.orphaned_images;
        document.getElementById('emptyStories').textContent = stats.empty_stories;
    }

    // Update issues list in the health tab
    function updateIssues(issues, hasIssues) {
        const noIssuesAlert = document.getElementById('noIssuesAlert');
        const issuesList = document.getElementById('issuesList');

        if (hasIssues) {
            noIssuesAlert.style.display = 'none';
            issuesList.style.display = 'block';

            // Clear previous issues
            issuesList.innerHTML = '';

            // Add new issues
            issues.forEach(issue => {
                const li = document.createElement('li');
                li.className = `list-group-item list-group-item-${issue.severity === 'error' ? 'danger' : 'warning'}`;

                const icon = document.createElement('i');
                icon.className = `fas fa-${issue.severity === 'error' ? 'exclamation-circle' : 'exclamation-triangle'} me-2`;

                const text = document.createTextNode(issue.message);

                li.appendChild(icon);
                li.appendChild(text);
                issuesList.appendChild(li);
            });
        } else {
            noIssuesAlert.style.display = 'block';
            issuesList.style.display = 'none';
        }
    }

    // Run health check function
    function runHealthCheck() {
        fetch('/api/db/health-check')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    updateStats(data.stats);
                    updateIssues(data.issues, data.has_issues);
                    showToast('Health Check', 'Database health check completed successfully');
                } else {
                    throw new Error(data.error || 'Failed to run health check');
                }
            })
            .catch(error => {
                showToast('Error', error.message);
            });
    }

    // Delete record function
    function deleteRecord(url, recordType, recordId) {
        if (confirm(`Are you sure you want to delete this ${recordType}? This action cannot be undone.`)) {
            fetch(url, {
                method: 'DELETE'
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Remove the row from the table
                    const row = document.querySelector(`tr[data-id="${recordId}"]`);
                    if (row) {
                        row.remove();
                    }
                    showToast('Success', data.message);
                } else {
                    throw new Error(data.error || `Failed to delete ${recordType}`);
                }
            })
            .catch(error => {
                showToast('Error', error.message);
            });
        }
    }

    // Initialize image analysis form
    if (imageForm && generateBtn) {
        imageForm.addEventListener('submit', function(e) {
            // Prevent the default form submission that would reload the page
            e.preventDefault();

            const formData = new FormData(imageForm);
            const imageUrl = formData.get('image_url');

            if (!imageUrl || !imageUrl.trim()) {
                showToast('Error', 'Please enter a valid image URL');
                return;
            }

            // Disable button and show loading indicator
            generateBtn.disabled = true;
            generateBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Analyzing...';

            fetch('/generate', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Display the results
                    resultDiv.style.display = 'block';

                    // Add save confirmation button if not already saved
                    if (!data.saved_to_db) {
                        // Create save buttons for the analysis
                        createSaveButtons(data);
                    }
                    generatedContent.textContent = JSON.stringify(data.analysis, null, 2);
                    showToast('Success', 'Image analysis completed. Please review results before saving to database.');
                } else {
                    throw new Error(data.error || 'An error occurred during analysis.');
                }
            })
            .catch(error => {
                showToast('Error', error.message);
            })
            .finally(() => {
                // Reset button state
                generateBtn.disabled = false;
                generateBtn.innerHTML = '<i class="fas fa-magic me-2"></i>Analyze Image';
            });
        });
    }

    // Function to create save and reject buttons
    function createSaveButtons(data) {
        // Remove any existing save buttons
        const existingSaveArea = document.getElementById('imageSaveArea');
        existingSaveArea.innerHTML = '';

        // Create a div for the save and reject buttons
        const saveDiv = document.createElement('div');
        saveDiv.className = 'mt-3 d-flex gap-2';

        // Create save button
        const saveButton = document.createElement('button');
        saveButton.className = 'btn btn-success';
        saveButton.innerHTML = '<i class="fas fa-save me-2"></i>Save to Database';
        saveDiv.appendChild(saveButton);

        // Create reject button
        const rejectButton = document.createElement('button');
        rejectButton.className = 'btn btn-danger';
        rejectButton.innerHTML = '<i class="fas fa-times me-2"></i>Reject Analysis';
        rejectButton.id = 'rejectAnalysisBtn';
        saveDiv.appendChild(rejectButton);

        // Add the save area to the page
        existingSaveArea.appendChild(saveDiv);

        // Add click handler for save button
        saveButton.addEventListener('click', function() {
            this.disabled = true;
            this.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Saving...';
            document.getElementById('rejectAnalysisBtn').disabled = true;

            // Prepare data to save
            const saveData = {
                image_url: data.image_url,
                analysis: data.analysis
            };

            // Send save request
            fetch('/save_analysis', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(saveData)
            })
            .then(response => response.json())
            .then(saveData => {
                if (saveData.success) {
                    this.innerHTML = '<i class="fas fa-check me-2"></i>Saved';
                    this.className = 'btn btn-outline-success';
                    document.getElementById('rejectAnalysisBtn').remove();
                    showToast('Success', 'Analysis saved to database.');

                    // Refresh the database stats
                    refreshDatabaseStats();
                } else {
                    this.disabled = false;
                    this.innerHTML = '<i class="fas fa-save me-2"></i>Save to Database';
                    showToast('Error', saveData.error || 'Error saving analysis.');
                }
            })
            .catch(error => {
                this.disabled = false;
                this.innerHTML = '<i class="fas fa-save me-2"></i>Save to Database';
                document.getElementById('rejectAnalysisBtn').disabled = false;
                showToast('Error', error.message);
            });
        });

        // Add click handler for reject button
        rejectButton.addEventListener('click', function() {
            // Remove the save confirmation area
            saveDiv.remove();
            showToast('Info', 'Analysis rejected. You can try analyzing the image again.');
        });
    }

    // Copy button
    if (copyBtn) {
        copyBtn.addEventListener('click', function() {
            const content = generatedContent.textContent;
            navigator.clipboard.writeText(content)
                .then(() => {
                    showToast('Success', 'Content copied to clipboard!');
                })
                .catch(err => {
                    showToast('Error', 'Failed to copy: ' + err);
                });
        });
    }

    // View details buttons
    if (viewDetailsBtns.length > 0) {
        viewDetailsBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');

                // Fetch the analysis details
                fetch(`/api/image/${id}`)
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            // Update modal content
                            document.getElementById('modalImage').src = data.image_url;
                            document.getElementById('modalContent').textContent = 
                                JSON.stringify(data.analysis, null, 2);

                            // Show modal
                            new bootstrap.Modal(document.getElementById('detailsModal')).show();
                        } else {
                            throw new Error(data.error || 'Failed to fetch image details');
                        }
                    })
                    .catch(error => {
                        showToast('Error', error.message);
                    });
            });
        });
    }

    // Delete image buttons
    if (deleteImageBtns.length > 0) {
        deleteImageBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                deleteRecord(`/api/image/${id}`, 'image', id);
            });
        });
    }

    // Delete story buttons
    if (deleteStoryBtns.length > 0) {
        deleteStoryBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                deleteRecord(`/api/story/${id}`, 'story', id);
            });
        });
    }

    // Delete all images button
    if (deleteAllImagesBtn) {
        deleteAllImagesBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to delete ALL image records? This action cannot be undone.')) {
                fetch('/api/db/delete-all-images', {
                    method: 'POST'
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Clear the table
                        const tableBody = document.getElementById('imagesTableBody');
                        if (tableBody) {
                            tableBody.innerHTML = '';
                        }
                        showToast('Success', data.message);

                        // Run health check
                        runHealthCheck();
                    } else {
                        throw new Error(data.error || 'Failed to delete all images');
                    }
                })
                .catch(error => {
                    showToast('Error', error.message);
                });
            }
        });
    }

    // Delete all stories button
    if (deleteAllStoriesBtn) {
        deleteAllStoriesBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to delete ALL story records? This action cannot be undone.')) {
                fetch('/api/db/delete-all-stories', {
                    method: 'POST'
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Clear the table
                        const tableBody = document.getElementById('storiesTableBody');
                        if (tableBody) {
                            tableBody.innerHTML = '';
                        }
                        showToast('Success', data.message);

                        // Run health check
                        runHealthCheck();
                    } else {
                        throw new Error(data.error || 'Failed to delete all stories');
                    }
                })
                .catch(error => {
                    showToast('Error', error.message);
                });
            }
        });
    }

    // Refresh images button
    if (refreshImagesBtn) {
        refreshImagesBtn.addEventListener('click', function() {
            location.reload();
        });
    }

    // Refresh stories button
    if (refreshStoriesBtn) {
        refreshStoriesBtn.addEventListener('click', function() {
            location.reload();
        });
    }

    // Run health check button
    if (runHealthCheckBtn) {
        runHealthCheckBtn.addEventListener('click', function() {
            runHealthCheckBtn.disabled = true;
            runHealthCheckBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Running...';

            runHealthCheck();

            setTimeout(() => {
                // Ensure the button still exists before trying to update it
                if (runHealthCheckBtn) {
                    runHealthCheckBtn.disabled = false;
                    runHealthCheckBtn.innerHTML = '<i class="fas fa-stethoscope me-1"></i>Run Health Check';
                }
            }, 1000);
        });

        // Run a health check on page load
        runHealthCheck();
    }
});

function refreshDatabaseStats() {
    runHealthCheck();
}