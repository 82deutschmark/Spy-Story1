
document.addEventListener('DOMContentLoaded', function() {
    // Form and element references
    const imageForm = document.getElementById('imageForm');
    const resultDiv = document.getElementById('result');
    const generatedContent = document.getElementById('generatedContent');
    const copyBtn = document.getElementById('copyBtn');
    const notificationToast = document.getElementById('notificationToast');
    const viewDetailsBtns = document.querySelectorAll('.view-details-btn');
    
    // Bootstrap toast instance
    const toast = new bootstrap.Toast(notificationToast);
    
    // Show toast notification
    function showToast(title, message) {
        document.getElementById('toastTitle').textContent = title;
        document.getElementById('toastMessage').textContent = message;
        toast.show();
    }
    
    // Image analysis form
    if (imageForm) {
        imageForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const imageUrl = formData.get('image_url');
            
            if (!imageUrl) {
                showToast('Error', 'Please enter an image URL.');
                return;
            }
            
            // Show loading state
            const generateBtn = document.getElementById('generateBtn');
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
                    generatedContent.textContent = JSON.stringify(data.analysis, null, 2);
                    showToast('Success', 'Image analysis completed and saved to database.');
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
});
