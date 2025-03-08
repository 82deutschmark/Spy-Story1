
// Main JavaScript file for the application

// DOM elements
const startStoryForm = document.getElementById('start-story-form');
const characterSelection = document.getElementById('character-selection');
const charactersContainer = document.querySelector('.characters-container');
const selectedCharactersList = document.querySelector('.selected-characters-list');
const storyContainer = document.getElementById('story-container');
const storyContentContainer = document.getElementById('story-content');
const characterProfilesContainer = document.getElementById('character-profiles');
const formFields = document.querySelectorAll('.form-field');
const storiesTab = document.getElementById('stories-tab');
const loadingOverlayContainer = document.getElementById('loading-overlay-container');
const errorContainer = document.getElementById('error-container');
const chapterNav = document.getElementById('chapter-nav');

// Global variables
let selectedCharacters = [];
let storyId = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Set up event listeners
    setupFormListeners();
    setupChoiceForms();
    setupPopstate();
    setupCharacterCardEvents();
    
    // Check if we're on a storyboard page
    if (window.location.pathname.includes('/storyboard/')) {
        initializeStoryboard();
    }
}

function setupFormListeners() {
    // Character selection event listeners
    if (characterSelection) {
        const characterCheckboxes = characterSelection.querySelectorAll('input[type="checkbox"]');
        
        characterCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                updateSelectedCharacters();
            });
        });
    }

    // Start story form event listener
    if (startStoryForm) {
        startStoryForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Basic validation
            if (!validateForm()) {
                return;
            }
            
            // Submit the form
            submitStartStoryForm();
        });
    }
}

function validateForm() {
    // Check if characters are selected
    if (selectedCharacters.length === 0) {
        showToast('Error', 'Please select at least one character.');
        return false;
    }
    
    return true;
}

function updateSelectedCharacters() {
    if (!characterSelection) return;
    
    const characterCheckboxes = characterSelection.querySelectorAll('input[type="checkbox"]:checked');
    selectedCharacters = Array.from(characterCheckboxes).map(cb => {
        return {
            id: cb.value,
            name: cb.dataset.name,
            image: cb.dataset.image
        };
    });
    
    // Update the visual list of selected characters
    updateSelectedCharactersList();
}

function updateSelectedCharactersList() {
    if (!selectedCharactersList) return;
    
    selectedCharactersList.innerHTML = '';
    
    selectedCharacters.forEach(character => {
        const badge = document.createElement('div');
        badge.className = 'selected-character-badge';
        badge.innerHTML = `
            <img src="${character.image}" alt="${character.name}" class="selected-character-img">
            <span>${character.name}</span>
        `;
        selectedCharactersList.appendChild(badge);
    });
}

function submitStartStoryForm() {
    // Create loading overlay
    const loadingPercent = createLoadingOverlay('Creating your story...');
    
    // Set up progress simulation
    let progress = 0;
    const progressInterval = setInterval(() => {
        progress += Math.random() * 10;
        if (progress > 98) {
            progress = 98;
            clearInterval(progressInterval);
        }
        updateLoadingPercent(loadingPercent, progress);
    }, 500);
    
    // Get form data
    const formData = new FormData(startStoryForm);
    
    // Add character IDs to form data
    selectedCharacters.forEach((character, index) => {
        formData.append(`characters[${index}]`, character.id);
    });
    
    // Submit the form
    fetch(startStoryForm.action, {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to start story');
        }
        return response.json();
    })
    .then(data => {
        clearInterval(progressInterval);
        
        if (data.success && data.redirect) {
            updateLoadingPercent(loadingPercent, 100);
            setTimeout(() => {
                window.location.href = data.redirect;
            }, 1000);
        } else {
            throw new Error(data.error || 'Failed to start story');
        }
    })
    .catch(error => {
        console.error('Start story error:', error);
        showToast('Error', error.message || 'Failed to start story. Please try again.');
        
        clearInterval(progressInterval);
        const overlay = loadingPercent.closest('.loading-overlay');
        if (overlay) overlay.remove();
    });
}

function initializeStoryboard() {
    // Extract story ID from URL
    const urlParts = window.location.pathname.split('/');
    storyId = urlParts[urlParts.length - 1];
    
    // Initialize character cards
    updateCharacterCards();
    
    // Set up chapter navigation
    setupChapterNav();
}

function setupChapterNav() {
    if (!chapterNav) return;
    
    const chapterLinks = chapterNav.querySelectorAll('a');
    chapterLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    });
}

function setupChoiceForms() {
    const choiceForms = document.querySelectorAll('.choice-form');
    if (choiceForms.length === 0) return;
    
    choiceForms.forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Disable the button to prevent multiple submissions
            const btn = this.querySelector('button');
            if (btn) btn.disabled = true;
            
            // Create loading overlay
            const loadingPercent = createLoadingOverlay('Continuing your story...');
            
            // Set up progress simulation
            let progress = 0;
            const progressInterval = setInterval(() => {
                progress += Math.random() * 8;
                if (progress > 98) {
                    progress = 98;
                    clearInterval(progressInterval);
                }
                updateLoadingPercent(loadingPercent, progress);
            }, 500);
            
            // Submit the form
            const formData = new FormData(this);
            
            fetch(this.action, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                clearInterval(progressInterval);
                
                if (data.success && data.redirect) {
                    // Successful response with redirect
                    updateLoadingPercent(loadingPercent, 100);
                    setTimeout(() => {
                        window.location.href = data.redirect;
                    }, 1000);
                } else {
                    // Error in the response
                    throw new Error(data.error || 'Failed to continue story');
                }
            })
            .catch(error => {
                // Handle any errors
                console.error('Story continuation error:', error);
                showToast('Error', error.message || 'Failed to continue story. Please try again.');
                
                // Reset the button state
                if (btn) btn.disabled = false;
                
                // Remove the loading overlay
                clearInterval(progressInterval);
                if (loadingPercent) {
                    const overlay = loadingPercent.closest('.loading-overlay');
                    if (overlay) overlay.remove();
                }
            });
        });
    });
}

function setupPopstate() {
    window.addEventListener('popstate', function(event) {
        if (event.state && event.state.storyboard) {
            // Handle back/forward navigation
            location.reload();
        }
    });
}

function setupCharacterCardEvents() {
    document.addEventListener('click', function(e) {
        // Check if the click was on a character detail toggle
        if (e.target.classList.contains('character-detail-toggle') || 
            e.target.closest('.character-detail-toggle')) {
            
            const card = e.target.closest('.character-card');
            if (card) {
                toggleCharacterDetails(card);
            }
        }
    });
}

function toggleCharacterDetails(card) {
    if (!card) return;
    
    const detailsContainer = card.querySelector('.character-details');
    const arrow = card.querySelector('.toggle-arrow');
    
    if (detailsContainer && arrow) {
        detailsContainer.classList.toggle('show');
        arrow.classList.toggle('rotated');
    }
}

function updateCharacterCards() {
    // This function is called when character mentions are found in the story
    const storyText = document.querySelector('.story-text');
    if (!storyText) return;
    
    // Process all character mentions
    document.querySelectorAll('.character-mention').forEach(mention => {
        if (!mention.dataset.processed) {
            const characterId = mention.dataset.characterId;
            const characterName = mention.dataset.characterName;
            const characterImage = mention.dataset.characterImage;
            
            if (characterId && characterName && characterImage) {
                createOrUpdateCharacterCard(characterId, characterName, characterImage);
                mention.dataset.processed = "true";
            }
        }
    });
}

function createOrUpdateCharacterCard(characterId, characterName, characterImage) {
    if (!characterProfilesContainer) return;
    
    // Check if the character card already exists
    let characterCard = document.getElementById(`character-card-${characterId}`);
    
    // If not, create a new one
    if (!characterCard) {
        characterCard = document.createElement('div');
        characterCard.id = `character-card-${characterId}`;
        characterCard.className = 'character-card';
        characterCard.innerHTML = `
            <div class="character-header">
                <img src="${characterImage}" alt="${characterName}" class="character-image">
                <div class="character-name">${characterName}</div>
                <div class="character-detail-toggle">
                    <i class="fas fa-chevron-down toggle-arrow"></i>
                </div>
            </div>
            <div class="character-details">
                <div class="character-description">Loading character details...</div>
            </div>
        `;
        
        characterProfilesContainer.appendChild(characterCard);
        
        // Load character details
        loadCharacterDetails(characterId, characterCard);
    }
}

function loadCharacterDetails(characterId, cardElement) {
    if (!characterId || !cardElement) return;
    
    // Find the details container
    const detailsContainer = cardElement.querySelector('.character-description');
    if (!detailsContainer) return;
    
    // Make API request to get character details
    fetch(`/api/character/${characterId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                detailsContainer.innerHTML = `
                    <div class="character-profile">
                        <div class="profile-item"><strong>Age:</strong> ${data.character.age || 'Unknown'}</div>
                        <div class="profile-item"><strong>Occupation:</strong> ${data.character.occupation || 'Unknown'}</div>
                        <div class="profile-item"><strong>Description:</strong> ${data.character.description || 'No description available.'}</div>
                    </div>
                `;
            } else {
                detailsContainer.innerHTML = 'Failed to load character details.';
            }
        })
        .catch(error => {
            console.error('Error loading character details:', error);
            detailsContainer.innerHTML = 'Error loading character details.';
        });
}

// Utility functions
function createLoadingOverlay(message) {
    if (!loadingOverlayContainer) return null;
    
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
        <div class="loading-content">
            <div class="loading-spinner"></div>
            <div class="loading-message">${message || 'Loading...'}</div>
            <div class="progress-container">
                <div class="progress-bar" style="width: 0%"></div>
            </div>
            <div class="progress-percent">0%</div>
        </div>
    `;
    
    loadingOverlayContainer.appendChild(overlay);
    
    return overlay.querySelector('.progress-percent');
}

function updateLoadingPercent(element, percent) {
    if (!element) return;
    
    const roundedPercent = Math.round(percent);
    element.textContent = `${roundedPercent}%`;
    
    const progressBar = element.closest('.loading-content').querySelector('.progress-bar');
    if (progressBar) {
        progressBar.style.width = `${percent}%`;
    }
}

function showToast(title, message, type = 'error', duration = 5000) {
    const toastContainer = document.getElementById('toast-container') || createToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-header">
            <i class="fas ${type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'} me-2"></i>
            <strong class="me-auto">${title}</strong>
            <button type="button" class="btn-close" aria-label="Close"></button>
        </div>
        <div class="toast-body">
            ${message}
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    // Auto-remove after duration
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, duration);
    
    // Close button functionality
    toast.querySelector('.btn-close').addEventListener('click', () => {
        toast.classList.add('fade-out');
        setTimeout(() => {
            toast.remove();
        }, 300);
    });
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
    return container;
}

// Function to process story text and highlight character mentions
function processStoryText() {
    const storyParagraphs = document.querySelectorAll('.story-paragraph');
    if (!storyParagraphs.length) return;
    
    storyParagraphs.forEach(paragraph => {
        // Only process paragraphs that haven't been processed yet
        if (paragraph.dataset.processed !== 'true') {
            // Get all character mentions in this paragraph
            const characterMentions = paragraph.querySelectorAll('.character-mention');
            
            characterMentions.forEach(mention => {
                const characterId = mention.dataset.characterId;
                const characterName = mention.dataset.characterName;
                const characterImage = mention.dataset.characterImage;
                
                if (characterId && characterName && characterImage) {
                    // Create or update the character card
                    createOrUpdateCharacterCard(characterId, characterName, characterImage);
                }
            });
            
            // Mark paragraph as processed
            paragraph.dataset.processed = 'true';
        }
    });
}

// Process story text when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    processStoryText();
});
