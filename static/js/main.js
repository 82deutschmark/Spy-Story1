document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('imageForm');
    const resultDiv = document.getElementById('result');
    const contentDiv = document.getElementById('generatedContent');
    const generateBtn = document.getElementById('generateBtn');
    const copyBtn = document.getElementById('copyBtn');
    const toast = new bootstrap.Toast(document.getElementById('notificationToast'));
    
    function showNotification(title, message, success = true) {
        document.getElementById('toastTitle').textContent = title;
        document.getElementById('toastMessage').textContent = message;
        document.getElementById('notificationToast').classList.toggle('bg-success', success);
        document.getElementById('notificationToast').classList.toggle('bg-danger', !success);
        toast.show();
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Generating...';
        
        try {
            const response = await fetch('/generate', {
                method: 'POST',
                body: new FormData(form)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                contentDiv.textContent = data.caption;
                resultDiv.style.display = 'block';
                showNotification('Success', 'Instagram post generated successfully!', true);
            } else {
                showNotification('Error', data.error || 'Failed to generate post', false);
            }
        } catch (error) {
            showNotification('Error', 'An error occurred while generating the post', false);
        } finally {
            generateBtn.disabled = false;
            generateBtn.innerHTML = '<i class="fas fa-magic me-2"></i>Generate Post';
        }
    });

    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(contentDiv.textContent)
            .then(() => showNotification('Success', 'Copied to clipboard!', true))
            .catch(() => showNotification('Error', 'Failed to copy text', false));
    });
});
document.addEventListener('DOMContentLoaded', function() {
    const imageForm = document.getElementById('imageForm');
    const generateBtn = document.getElementById('generateBtn');
    const resultDiv = document.getElementById('result');
    const generatedContent = document.getElementById('generatedContent');
    const copyBtn = document.getElementById('copyBtn');
    const toast = new bootstrap.Toast(document.getElementById('notificationToast'));
    const toastTitle = document.getElementById('toastTitle');
    const toastMessage = document.getElementById('toastMessage');

    if (imageForm) {
        imageForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Show loading state
            generateBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Generating...';
            generateBtn.disabled = true;
            resultDiv.style.display = 'none';
            
            const formData = new FormData(imageForm);
            
            fetch('/generate', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                generateBtn.innerHTML = '<i class="fas fa-magic me-2"></i>Generate Post';
                generateBtn.disabled = false;
                
                if (data.error) {
                    // Show error toast
                    toastTitle.textContent = 'Error';
                    toastMessage.textContent = data.error;
                    toast.show();
                } else {
                    // Display the result
                    resultDiv.style.display = 'block';
                    generatedContent.textContent = data.caption;
                    
                    // Show success toast
                    toastTitle.textContent = 'Success';
                    toastMessage.textContent = 'Post generated successfully!';
                    toast.show();
                }
            })
            .catch(error => {
                console.error('Error:', error);
                generateBtn.innerHTML = '<i class="fas fa-magic me-2"></i>Generate Post';
                generateBtn.disabled = false;
                
                // Show error toast
                toastTitle.textContent = 'Error';
                toastMessage.textContent = 'Failed to generate post. Please try again.';
                toast.show();
            });
        });
    }
    
    if (copyBtn) {
        copyBtn.addEventListener('click', function() {
            navigator.clipboard.writeText(generatedContent.textContent)
                .then(() => {
                    toastTitle.textContent = 'Success';
                    toastMessage.textContent = 'Copied to clipboard!';
                    toast.show();
                })
                .catch(err => {
                    console.error('Could not copy text: ', err);
                    toastTitle.textContent = 'Error';
                    toastMessage.textContent = 'Failed to copy to clipboard';
                    toast.show();
                });
        });
    }
});
