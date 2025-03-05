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
