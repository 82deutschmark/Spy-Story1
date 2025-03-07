
document.addEventListener('DOMContentLoaded', function() {
    // Get random background image from the API
    fetch('/api/random-background')
        .then(response => response.json())
        .then(data => {
            if (data.image_url) {
                // Apply the background image
                document.body.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url('${data.image_url}')`;
                
                // Add image attribution if available
                if (data.attribution) {
                    const attribution = document.createElement('div');
                    attribution.className = 'bg-image-attribution';
                    attribution.innerHTML = `Background: ${data.attribution}`;
                    document.body.appendChild(attribution);
                }
            }
        })
        .catch(error => {
            console.error('Error fetching background image:', error);
        });
});
