document.addEventListener('DOMContentLoaded', function() {
    // Image URL validation
    const imageUrlInput = document.getElementById('image_url');
    if (imageUrlInput) {
        imageUrlInput.addEventListener('change', function() {
            const url = this.value;
            if (url && !url.match(/\.(jpg|jpeg|png|gif)$/i)) {
                alert('Please enter a valid image URL (jpg, jpeg, png, or gif)');
                this.value = '';
            }
        });
    }

    // Bootstrap tooltips initialization
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Hashtag validation
    const hashtagInput = document.querySelector('input[name="hashtag"]');
    if (hashtagInput) {
        hashtagInput.addEventListener('input', function() {
            let value = this.value;
            if (value && !value.startsWith('#')) {
                this.value = '#' + value;
            }
        });
    }
});
