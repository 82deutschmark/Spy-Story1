
document.addEventListener('DOMContentLoaded', function() {
    // Image analysis form
    const analyzeImageForm = document.getElementById('analyzeImageForm');
    if (analyzeImageForm) {
        analyzeImageForm.addEventListener('submit', function(e) {
            e.preventDefault();
            analyzeImage();
        });
    }

    // Delete buttons
    setupDeleteButtons();
    
    // Delete all buttons
    const deleteAllImagesBtn = document.getElementById('deleteAllImagesBtn');
    if (deleteAllImagesBtn) {
        deleteAllImagesBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to delete ALL image records? This cannot be undone.')) {
                deleteAllImages();
            }
        });
    }
    
    const deleteAllStoriesBtn = document.getElementById('deleteAllStoriesBtn');
    if (deleteAllStoriesBtn) {
        deleteAllStoriesBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to delete ALL story records? This cannot be undone.')) {
                deleteAllStories();
            }
        });
    }
    
    // Refresh buttons
    const refreshImagesBtn = document.getElementById('refreshImagesBtn');
    if (refreshImagesBtn) {
        refreshImagesBtn.addEventListener('click', function() {
            window.location.reload();
        });
    }
    
    const refreshStoriesBtn = document.getElementById('refreshStoriesBtn');
    if (refreshStoriesBtn) {
        refreshStoriesBtn.addEventListener('click', function() {
            window.location.reload();
        });
    }
    
    // Save analysis button (initially hidden)
    const saveAnalysisBtn = document.getElementById('saveAnalysisBtn');
    if (saveAnalysisBtn) {
        saveAnalysisBtn.addEventListener('click', function() {
            saveAnalysis();
        });
    }
    
    // Check database health
    checkDbHealth();
});

function analyzeImage() {
    // Get form data
    const imageUrl = document.getElementById('imageUrl').value;
    const forceType = document.querySelector('input[name="forceType"]:checked')?.value;
    
    if (!imageUrl) {
        showToast('Please enter an image URL', 'warning');
        return;
    }
    
    // Show loading state
    const analyzeBtn = document.getElementById('analyzeBtn');
    const resultsContainer = document.getElementById('analysisResults');
    
    if (analyzeBtn) {
        analyzeBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Analyzing...';
        analyzeBtn.disabled = true;
    }
    
    if (resultsContainer) {
        resultsContainer.innerHTML = '<div class="text-center mt-3"><div class="spinner-border" role="status"></div><p class="mt-2">Analyzing image...</p></div>';
    }
    
    // Send request
    const formData = new FormData();
    formData.append('image_url', imageUrl);
    if (forceType) {
        formData.append('force_type', forceType);
    }
    
    fetch('/generate', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (analyzeBtn) {
            analyzeBtn.innerHTML = 'Analyze Image';
            analyzeBtn.disabled = false;
        }
        
        if (data.error) {
            if (resultsContainer) {
                resultsContainer.innerHTML = `<div class="alert alert-danger mt-3">${data.error}</div>`;
            }
            showToast(data.error, 'danger');
        } else {
            displayAnalysisResults(data);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        if (analyzeBtn) {
            analyzeBtn.innerHTML = 'Analyze Image';
            analyzeBtn.disabled = false;
        }
        
        if (resultsContainer) {
            resultsContainer.innerHTML = `<div class="alert alert-danger mt-3">An error occurred: ${error.message}</div>`;
        }
        
        showToast('An error occurred while analyzing the image', 'danger');
    });
}

function displayAnalysisResults(data) {
    const resultsContainer = document.getElementById('analysisResults');
    if (!resultsContainer) {
        console.error('Results container not found');
        return;
    }
    
    // Store the analysis data for later use
    window.currentAnalysis = data;
    
    // Determine if it's a character or scene
    const isCharacter = data.analysis && data.analysis.name;
    
    // Build results HTML
    let html = `
        <div class="card mt-3">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h5 class="mb-0">${isCharacter ? 'Character' : 'Scene'} Analysis Results</h5>
                <button id="saveAnalysisBtn" class="btn btn-success btn-sm">
                    <i class="fas fa-save me-1"></i>Save to Database
                </button>
            </div>
            <div class="card-body">
                <div class="row">
                    <div class="col-md-4">
                        <img src="${data.image_url}" class="img-fluid rounded" alt="Analyzed image">
                    </div>
                    <div class="col-md-8">
                        <h5>${isCharacter ? data.analysis.name : 'Scene Analysis'}</h5>
                        <p>${data.description}</p>
                        <div class="analysis-details">
    `;
    
    // Add specific fields based on character or scene
    if (isCharacter) {
        html += `
            <div class="mb-2"><strong>Alignment:</strong> ${data.analysis.alignment || 'Unknown'}</div>
            <div class="mb-2"><strong>Traits:</strong> 
                <div class="character-traits">
        `;
        
        if (data.analysis.traits && data.analysis.traits.length) {
            data.analysis.traits.forEach(trait => {
                html += `<span class="badge bg-primary me-1">${trait}</span>`;
            });
        }
        
        html += `
                </div>
            </div>
            <div class="mb-2"><strong>Art Style:</strong> ${data.analysis.artStyle || 'Not specified'}</div>
            <div class="mb-2"><strong>Potential Plot Lines:</strong>
                <ul>
        `;
        
        if (data.analysis.plotLines && data.analysis.plotLines.length) {
            data.analysis.plotLines.forEach(plot => {
                html += `<li>${plot}</li>`;
            });
        }
        
        html += `
                </ul>
            </div>
        `;
    } else {
        // Scene-specific fields
        html += `
            <div class="mb-2"><strong>Scene Type:</strong> ${data.analysis.sceneType || 'Not specified'}</div>
            <div class="mb-2"><strong>Setting:</strong> ${data.analysis.setting || 'Not specified'}</div>
            <div class="mb-2"><strong>Setting Description:</strong> ${data.analysis.setting_description || 'Not provided'}</div>
            <div class="mb-2"><strong>Story Fit:</strong> ${data.analysis.storyFit || 'Not specified'}</div>
            <div class="mb-2"><strong>Dramatic Moments:</strong>
                <ul>
        `;
        
        if (data.analysis.dramaticMoments && data.analysis.dramaticMoments.length) {
            data.analysis.dramaticMoments.forEach(moment => {
                html += `<li>${moment}</li>`;
            });
        }
        
        html += `
                </ul>
            </div>
        `;
    }
    
    // Close all the divs
    html += `
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    resultsContainer.innerHTML = html;
    
    // Add event listener to the save button
    const saveAnalysisBtn = document.getElementById('saveAnalysisBtn');
    if (saveAnalysisBtn) {
        saveAnalysisBtn.addEventListener('click', function() {
            saveAnalysis();
        });
    }
    
    // Show toast
    showToast('Analysis completed successfully!', 'success');
}

function saveAnalysis() {
    if (!window.currentAnalysis) {
        showToast('No analysis data to save', 'warning');
        return;
    }
    
    const saveBtn = document.getElementById('saveAnalysisBtn');
    if (saveBtn) {
        saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
        saveBtn.disabled = true;
    }
    
    fetch('/save_analysis', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(window.currentAnalysis)
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            showToast(data.error, 'danger');
        } else {
            showToast('Analysis saved to database!', 'success');
            // Optionally, refresh the page after a delay to show the new entry
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showToast('An error occurred while saving the analysis', 'danger');
    })
    .finally(() => {
        if (saveBtn) {
            saveBtn.innerHTML = '<i class="fas fa-save me-1"></i>Save to Database';
            saveBtn.disabled = false;
        }
    });
}

function setupDeleteButtons() {
    // Delete image buttons
    const deleteImageBtns = document.querySelectorAll('.delete-image-btn');
    deleteImageBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const imageId = this.getAttribute('data-id');
            if (confirm('Are you sure you want to delete this image record?')) {
                deleteImage(imageId);
            }
        });
    });
    
    // Delete story buttons
    const deleteStoryBtns = document.querySelectorAll('.delete-story-btn');
    deleteStoryBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const storyId = this.getAttribute('data-id');
            if (confirm('Are you sure you want to delete this story record?')) {
                deleteStory(storyId);
            }
        });
    });
}

function deleteImage(imageId) {
    fetch(`/api/image/${imageId}`, {
        method: 'DELETE',
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            showToast(data.error, 'danger');
        } else {
            showToast('Image deleted successfully!', 'success');
            // Remove the row from the table
            const row = document.querySelector(`tr[data-image-id="${imageId}"]`);
            if (row) {
                row.remove();
            }
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showToast('An error occurred while deleting the image', 'danger');
    });
}

function deleteStory(storyId) {
    fetch(`/api/story/${storyId}`, {
        method: 'DELETE',
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            showToast(data.error, 'danger');
        } else {
            showToast('Story deleted successfully!', 'success');
            // Remove the row from the table
            const row = document.querySelector(`tr[data-story-id="${storyId}"]`);
            if (row) {
                row.remove();
            }
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showToast('An error occurred while deleting the story', 'danger');
    });
}

function deleteAllImages() {
    fetch('/api/db/delete-all-images', {
        method: 'POST',
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            showToast(data.error, 'danger');
        } else {
            showToast(data.message, 'success');
            // Reload page after a short delay
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showToast('An error occurred while deleting all images', 'danger');
    });
}

function deleteAllStories() {
    fetch('/api/db/delete-all-stories', {
        method: 'POST',
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            showToast(data.error, 'danger');
        } else {
            showToast(data.message, 'success');
            // Reload page after a short delay
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showToast('An error occurred while deleting all stories', 'danger');
    });
}

function checkDbHealth() {
    const healthStatusContainer = document.getElementById('dbHealthStatus');
    if (!healthStatusContainer) return;
    
    healthStatusContainer.innerHTML = '<div class="text-center"><div class="spinner-border" role="status"></div><p>Checking database health...</p></div>';
    
    fetch('/api/db/health-check')
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            healthStatusContainer.innerHTML = `<div class="alert alert-danger">${data.error}</div>`;
        } else {
            let html = `
                <div class="card">
                    <div class="card-header">
                        <h5 class="mb-0">Database Health Status</h5>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-6">
                                <h6>Statistics</h6>
                                <ul class="list-group">
                                    <li class="list-group-item d-flex justify-content-between align-items-center">
                                        Total Images
                                        <span class="badge bg-primary rounded-pill">${data.stats.image_count}</span>
                                    </li>
                                    <li class="list-group-item d-flex justify-content-between align-items-center">
                                        Characters
                                        <span class="badge bg-primary rounded-pill">${data.stats.character_count}</span>
                                    </li>
                                    <li class="list-group-item d-flex justify-content-between align-items-center">
                                        Scenes
                                        <span class="badge bg-primary rounded-pill">${data.stats.scene_count}</span>
                                    </li>
                                    <li class="list-group-item d-flex justify-content-between align-items-center">
                                        Stories
                                        <span class="badge bg-primary rounded-pill">${data.stats.story_count}</span>
                                    </li>
                                    <li class="list-group-item d-flex justify-content-between align-items-center">
                                        Orphaned Images
                                        <span class="badge bg-warning rounded-pill">${data.stats.orphaned_images}</span>
                                    </li>
                                    <li class="list-group-item d-flex justify-content-between align-items-center">
                                        Empty Stories
                                        <span class="badge bg-warning rounded-pill">${data.stats.empty_stories}</span>
                                    </li>
                                </ul>
                            </div>
                            <div class="col-md-6">
                                <h6>Issues ${data.has_issues ? '<span class="badge bg-danger">Issues Found</span>' : '<span class="badge bg-success">All Good</span>'}</h6>
            `;
            
            if (data.issues && data.issues.length > 0) {
                html += '<ul class="list-group">';
                data.issues.forEach(issue => {
                    let badgeClass = 'bg-warning';
                    if (issue.severity === 'error') {
                        badgeClass = 'bg-danger';
                    } else if (issue.severity === 'info') {
                        badgeClass = 'bg-info';
                    }
                    
                    html += `
                        <li class="list-group-item">
                            <span class="badge ${badgeClass} me-2">${issue.severity}</span>
                            ${issue.message}
                        </li>
                    `;
                });
                html += '</ul>';
            } else {
                html += '<p class="text-success">No issues detected!</p>';
            }
            
            // Close the divs
            html += `
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            healthStatusContainer.innerHTML = html;
        }
    })
    .catch(error => {
        console.error('Error:', error);
        healthStatusContainer.innerHTML = `<div class="alert alert-danger">Error connecting to database: ${error.message}</div>`;
    });
}

function showToast(message, type) {
    const toastEl = document.getElementById('notificationToast');
    const toastBodyEl = document.getElementById('toastMessage');
    
    if (!toastEl || !toastBodyEl) {
        console.error('Toast elements not found in the DOM');
        alert(message); // Fallback to alert if toast elements don't exist
        return;
    }
    
    // Set content
    toastBodyEl.textContent = message;
    
    // Set class based on type
    toastEl.classList.remove('bg-success', 'bg-danger', 'bg-warning');
    if (type === 'danger') {
        toastEl.classList.add('bg-danger', 'text-white');
    } else if (type === 'warning') {
        toastEl.classList.add('bg-warning');
    } else {
        toastEl.classList.add('bg-success', 'text-white');
    }
    
    // Show toast
    const toast = new bootstrap.Toast(toastEl);
    toast.show();
}
