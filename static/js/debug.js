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

    // Determine if this is a character analysis
    function determineIfCharacter(analysis) {
        if (analysis.image_type === 'character') return true;
        if (analysis.image_type === 'scene') return false;

        // Try to infer from contents
        if (analysis.character && typeof analysis.character === 'object') return true;
        if (analysis.character_name || analysis.character_traits) return true;
        if (analysis.scene_type || analysis.dramatic_moments) return false;

        // Default to character
        return true;
    }

    // Populate edit fields with data from analysis
    function populateEditFields(analysis) {
        const imageName = document.getElementById('imageName');
        const imageType = document.getElementById('imageType');
        const characterRole = document.getElementById('characterRole');
        const characterTraits = document.getElementById('characterTraits');
        const plotLines = document.getElementById('plotLines');
        const sceneType = document.getElementById('sceneType');
        const sceneSetting = document.getElementById('sceneSetting');
        const dramaticMoments = document.getElementById('dramaticMoments');

        // Determine if this is a character or scene
        let isCharacter = determineIfCharacter(analysis);

        // Set image type
        imageType.value = isCharacter ? 'character' : 'scene';

        // Toggle appropriate fields
        if (isCharacter) {
            document.getElementById('characterFields').style.display = 'block';
            document.getElementById('sceneFields').style.display = 'none';
        } else {
            document.getElementById('characterFields').style.display = 'none';
            document.getElementById('sceneFields').style.display = 'block';
        }

        // Extract name
        let name = '';
        if (isCharacter) {
            if (analysis.character && analysis.character.name) {
                name = analysis.character.name;
            } else if (analysis.character_name) {
                name = analysis.character_name;
            } else if (analysis.name) {
                name = analysis.name;
            }
        } else {
            name = analysis.setting || '';
        }
        imageName.value = name;

        // Extract character-specific fields
        if (isCharacter) {
            let role = '';
            if (analysis.character && analysis.character.role) {
                role = analysis.character.role;
            } else if (analysis.role) {
                role = analysis.role;
            }
            characterRole.value = role || 'neutral';

            let traits = [];
            if (analysis.character && analysis.character.character_traits) {
                traits = analysis.character.character_traits;
            } else if (analysis.character_traits) {
                traits = analysis.character_traits;
            }
            characterTraits.value = Array.isArray(traits) ? traits.join(', ') : traits;

            let plots = [];
            if (analysis.character && analysis.character.plot_lines) {
                plots = analysis.character.plot_lines;
            } else if (analysis.plot_lines) {
                plots = analysis.plot_lines;
            }
            plotLines.value = Array.isArray(plots) ? plots.join('\n') : plots;
        } 
        // Extract scene-specific fields
        else {
            sceneType.value = analysis.scene_type || 'narrative';
            sceneSetting.value = analysis.setting || '';

            let moments = analysis.dramatic_moments || [];
            dramaticMoments.value = Array.isArray(moments) ? moments.join('\n') : moments;
        }
    }

    // Apply edits from form to analysis object
    function applyEditsToAnalysis(originalAnalysis) {
        // Clone the original analysis to avoid modifying it directly
        const analysis = JSON.parse(JSON.stringify(originalAnalysis));

        const imageName = document.getElementById('imageName').value;
        const imageType = document.getElementById('imageType').value;
        const characterRole = document.getElementById('characterRole').value;
        const characterTraits = document.getElementById('characterTraits').value;
        const plotLines = document.getElementById('plotLines').value;
        const sceneType = document.getElementById('sceneType').value;
        const sceneSetting = document.getElementById('sceneSetting').value;
        const dramaticMoments = document.getElementById('dramaticMoments').value;

        // Update image type
        analysis.image_type = imageType;

        if (imageType === 'character') {
            // Update character fields

            // Ensure character object exists
            if (!analysis.character) {
                analysis.character = {};
            }

            // Update name in all possible locations
            analysis.name = imageName;
            analysis.character_name = imageName;
            analysis.character.name = imageName;

            // Update role
            analysis.role = characterRole;
            analysis.character.role = characterRole;

            // Update traits - convert comma separated string to array
            const traitsArray = characterTraits.split(',').map(t => t.trim()).filter(t => t);
            analysis.character_traits = traitsArray;
            analysis.character.character_traits = traitsArray;

            // Update plot lines - convert newline separated string to array
            const plotArray = plotLines.split('\n').map(p => p.trim()).filter(p => p);
            analysis.plot_lines = plotArray;
            analysis.character.plot_lines = plotArray;

            // Clean up scene-specific fields
            delete analysis.scene_type;
            delete analysis.setting;
            delete analysis.dramatic_moments;
        } else {
            // Update scene fields
            analysis.scene_type = sceneType;
            analysis.setting = sceneSetting;

            // Update dramatic moments - convert newline separated string to array
            const momentsArray = dramaticMoments.split('\n').map(m => m.trim()).filter(m => m);
            analysis.dramatic_moments = momentsArray;

            // Clean up character-specific fields
            delete analysis.character;
            delete analysis.character_name;
            delete analysis.character_traits;
            delete analysis.role;
            delete analysis.plot_lines;
            analysis.name = sceneSetting;
        }

        return analysis;
    }

    // Get the edited analysis for saving
    function getEditedAnalysis(originalAnalysis) {
        // If edit mode is not enabled, return the original
        const editModeSwitch = document.getElementById('editModeSwitch');
        if (!editModeSwitch.checked) {
            return originalAnalysis;
        }

        // Apply edits and return the modified analysis
        return applyEditsToAnalysis(originalAnalysis);
    }

    // Function to setup the analysis editing UI
    function setupAnalysisEditing(analysis) {
        const editModeSwitch = document.getElementById('editModeSwitch');
        const editContainer = document.getElementById('editContainer');
        const imageTypeSelect = document.getElementById('imageType');
        const characterFields = document.getElementById('characterFields');
        const sceneFields = document.getElementById('sceneFields');
        const applyChangesBtn = document.getElementById('applyChangesBtn');

        // Populate edit fields with current analysis data
        populateEditFields(analysis);

        // Event listeners for edit mode toggle
        editModeSwitch.addEventListener('change', function() {
            if (this.checked) {
                editContainer.style.display = 'block';
            } else {
                editContainer.style.display = 'none';
            }
        });

        // Event listener for image type change
        imageTypeSelect.addEventListener('change', function() {
            if (this.value === 'character') {
                characterFields.style.display = 'block';
                sceneFields.style.display = 'none';
            } else {
                characterFields.style.display = 'none';
                sceneFields.style.display = 'block';
            }
        });

        // Event listener for apply changes button
        applyChangesBtn.addEventListener('click', function() {
            const generatedContent = document.getElementById('generatedContent');
            const updatedAnalysis = applyEditsToAnalysis(analysis);
            generatedContent.textContent = JSON.stringify(updatedAnalysis, null, 2);
            showToast('Success', 'Changes applied to analysis. Review before saving.');
        });
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
                        const saveDiv = document.createElement('div');
                        saveDiv.className = 'text-center mt-3';
                        saveDiv.innerHTML = `
                            <div class="alert alert-info mb-3">
                                <i class="fas fa-info-circle me-2"></i>
                                Please review the analysis results above before saving to the database.
                            </div>
                            <button class="btn btn-success" id="saveAnalysisBtn">
                                <i class="fas fa-save me-2"></i>Save to Database
                            </button>
                            <button class="btn btn-outline-secondary ms-2" id="rejectAnalysisBtn">
                                <i class="fas fa-times me-2"></i>Reject Analysis
                            </button>
                        `;
                        resultDiv.appendChild(saveDiv);

                        // Add click handler for save button
                        document.getElementById('saveAnalysisBtn').addEventListener('click', function() {
                            this.disabled = true;
                            this.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
                            document.getElementById('rejectAnalysisBtn').disabled = true;

                            // Get the edited analysis
                            const editedAnalysis = getEditedAnalysis(data.analysis);

                            // Send the analysis to be saved
                            fetch('/save_analysis', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                    image_url: data.image_url,
                                    analysis: editedAnalysis
                                })
                            })
                            .then(response => {
                                if (!response.ok) {
                                    throw new Error(`Server returned ${response.status}: ${response.statusText}`);
                                }
                                return response.json();
                            })
                            .then(saveData => {
                                if (saveData.success) {
                                    this.innerHTML = '<i class="fas fa-check me-2"></i>Saved';
                                    showToast('Success', 'Analysis saved to database.');

                                    // Don't automatically refresh images table after saving
                                    // Let the user manually refresh when they're ready

                                } else {
                                    this.disabled = false;
                                    this.innerHTML = '<i class="fas fa-save me-2"></i>Save to Database';
                                    showToast('Error', saveData.error || 'Error saving analysis.');
                                }
                            })
                            .catch(error => {
                                console.error("Save error:", error);
                                this.disabled = false;
                                this.innerHTML = '<i class="fas fa-save me-2"></i>Save to Database';
                                document.getElementById('rejectAnalysisBtn').disabled = false;
                                showToast('Error', `Failed to save analysis: ${error.message}`);
                            });
                        });

                        // Add click handler for reject button
                        document.getElementById('rejectAnalysisBtn').addEventListener('click', function() {
                            // Remove the save confirmation area
                            saveDiv.remove();
                            showToast('Info', 'Analysis rejected. You can try analyzing the image again.');
                        });
                    }
                    generatedContent.textContent = JSON.stringify(data.analysis, null, 2);
                    showToast('Success', 'Image analysis completed. Review and edit results before saving.');

                    // Setup analysis editing UI
                    setupAnalysisEditing(data.analysis);
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
                runHealthCheckBtn.disabled = false;
                runHealthCheckBtn.innerHTML = '<i class="fas fa-stethoscope me-1"></i>Run Health Check';
            }, 1000);
        });

        // Run a health check on page load
        runHealthCheck();
    }
});