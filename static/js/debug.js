
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('imageForm');
    const resultDiv = document.getElementById('result');
    const contentDiv = document.getElementById('generatedContent');
    const descriptionDiv = document.getElementById('generatedDescription');
    const analyzedImage = document.getElementById('analyzedImage');
    const generateBtn = document.getElementById('generateBtn');
    const copyBtn = document.getElementById('copyBtn');
    const refreshBtn = document.getElementById('refreshRecords');
    const toast = new bootstrap.Toast(document.getElementById('notificationToast'));
    const recordModal = new bootstrap.Modal(document.getElementById('recordModal'));
    
    // Initialize function to add event listeners for dynamic content
    function initEventListeners() {
        // Add click events for view buttons
        document.querySelectorAll('.view-record').forEach(button => {
            button.addEventListener('click', function() {
                const recordId = this.getAttribute('data-id');
                viewRecord(recordId);
            });
        });
        
        // Add click events for delete buttons
        document.querySelectorAll('.delete-record').forEach(button => {
            button.addEventListener('click', function() {
                const recordId = this.getAttribute('data-id');
                if (confirm('Are you sure you want to delete this record?')) {
                    deleteRecord(recordId);
                }
            });
        });
    }
    
    // Initialize event listeners when page loads
    initEventListeners();
    
    function showNotification(title, message, success = true) {
        document.getElementById('toastTitle').textContent = title;
        document.getElementById('toastMessage').textContent = message;
        document.getElementById('notificationToast').classList.toggle('bg-success', success);
        document.getElementById('notificationToast').classList.toggle('bg-danger', !success);
        toast.show();
    }
    
    // Image analysis form submission
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const imageUrl = formData.get('image_url');
            
            if (!imageUrl) {
                showNotification('Error', 'Please enter an image URL.', false);
                return;
            }
            
            // Show loading state
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
                    analyzedImage.src = imageUrl;
                    descriptionDiv.textContent = data.description;
                    contentDiv.textContent = JSON.stringify(data.analysis, null, 2);
                    
                    // Refresh the records table
                    refreshRecords();
                    
                    showNotification('Success', 'Image analyzed successfully!');
                } else {
                    throw new Error(data.error || 'An error occurred during analysis.');
                }
            })
            .catch(error => {
                showNotification('Error', error.message, false);
            })
            .finally(() => {
                // Reset button state
                generateBtn.disabled = false;
                generateBtn.innerHTML = '<i class="fas fa-magic me-1"></i>Analyze';
            });
        });
    }
    
    // Copy analysis button
    if (copyBtn) {
        copyBtn.addEventListener('click', function() {
            const textToCopy = contentDiv.textContent;
            navigator.clipboard.writeText(textToCopy)
                .then(() => {
                    showNotification('Success', 'Analysis copied to clipboard!');
                })
                .catch(() => {
                    showNotification('Error', 'Failed to copy to clipboard', false);
                });
        });
    }
    
    // Refresh records button
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            refreshRecords();
        });
    }
    
    // Function to refresh records
    function refreshRecords() {
        fetch('/api/records')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    updateRecordsTable(data.records);
                    showNotification('Success', 'Records refreshed successfully!');
                } else {
                    throw new Error(data.error || 'Failed to refresh records');
                }
            })
            .catch(error => {
                showNotification('Error', error.message, false);
            });
    }
    
    // Function to update records table
    function updateRecordsTable(records) {
        const tableBody = document.getElementById('recordsTable');
        
        // Clear existing rows
        tableBody.innerHTML = '';
        
        // Add new rows
        records.forEach(record => {
            const row = document.createElement('tr');
            row.setAttribute('data-id', record.id);
            
            let characterName = '-';
            if (record.analysis_result && record.analysis_result.name) {
                characterName = record.analysis_result.name;
            }
            
            row.innerHTML = `
                <td>${record.id}</td>
                <td>
                    <a href="${record.image_url}" target="_blank">
                        <img src="${record.image_url}" alt="Thumbnail" class="img-thumbnail" style="max-width: 100px; max-height: 100px;">
                    </a>
                </td>
                <td>${record.image_type || '-'}</td>
                <td>${record.image_width || 0}x${record.image_height || 0}</td>
                <td>${record.image_format || '-'}</td>
                <td>${formatFileSize(record.image_size_bytes)}</td>
                <td>${characterName}</td>
                <td>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-info view-record" data-id="${record.id}">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-danger delete-record" data-id="${record.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            
            tableBody.appendChild(row);
        });
        
        // Re-initialize event listeners for new buttons
        initEventListeners();
    }
    
    // View record details
    function viewRecord(recordId) {
        fetch(`/api/records/${recordId}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Populate modal
                    document.getElementById('modalImage').src = data.record.image_url;
                    document.getElementById('modalAnalysis').textContent = JSON.stringify(data.record.analysis_result, null, 2);
                    
                    // Create metadata HTML
                    const metaHTML = `
                        <div class="card">
                            <div class="card-body">
                                <p><strong>ID:</strong> ${data.record.id}</p>
                                <p><strong>Type:</strong> ${data.record.image_type || '-'}</p>
                                <p><strong>Dimensions:</strong> ${data.record.image_width || 0}x${data.record.image_height || 0}</p>
                                <p><strong>Format:</strong> ${data.record.image_format || '-'}</p>
                                <p><strong>Size:</strong> ${formatFileSize(data.record.image_size_bytes)}</p>
                                <p><strong>Created:</strong> ${new Date(data.record.created_at).toLocaleString()}</p>
                            </div>
                        </div>
                    `;
                    document.getElementById('modalMeta').innerHTML = metaHTML;
                    
                    // Show modal
                    recordModal.show();
                } else {
                    throw new Error(data.error || 'Failed to get record details');
                }
            })
            .catch(error => {
                showNotification('Error', error.message, false);
            });
    }
    
    // Delete record
    function deleteRecord(recordId) {
        fetch(`/api/records/${recordId}`, {
            method: 'DELETE'
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Remove row from table
                    const row = document.querySelector(`tr[data-id="${recordId}"]`);
                    if (row) {
                        row.remove();
                    }
                    showNotification('Success', 'Record deleted successfully!');
                } else {
                    throw new Error(data.error || 'Failed to delete record');
                }
            })
            .catch(error => {
                showNotification('Error', error.message, false);
            });
    }
    
    // Helper function to format file size
    function formatFileSize(bytes) {
        if (!bytes) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
});
