/**
 * Main application entry point
 * Initializes and coordinates all game modules
 */

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', initializeApplication);

/**
 * Initialize the application
 */
function initializeApplication() {
    console.log('Initializing application...');

    // Check for story container to determine if on storyboard page
    const storyContainer = document.getElementById('storyContainer');
    if (storyContainer) {
        initializeStoryMode();
    } else {
        // Initialize other pages as needed
        initializeGeneralPage();
    }

    // Check for PayPal integration
    initializePayPalIntegration();
}

/**
 * Initialize story mode specific features
 */
function initializeStoryMode() {
    console.log('Initializing story mode...');

    // Get story ID if available
    const storyIdElement = document.getElementById('storyId');
    const storyId = storyIdElement ? storyIdElement.value : null;

    // Get initial currency balances if available
    const currencyDataElement = document.getElementById('currencyData');
    let initialBalances = {};

    if (currencyDataElement) {
        try {
            initialBalances = JSON.parse(currencyDataElement.value);
        } catch (error) {
            console.error('Error parsing currency data:', error);
        }
    }

    // Initialize currency handler
    CurrencyHandler.initialize(initialBalances);

    // Initialize story handler
    StoryHandler.initialize(storyId);

    // Setup background animation if applicable
    setupBackgroundAnimation();
}

/**
 * Initialize general page features (non-story pages)
 */
function initializeGeneralPage() {
    console.log('Initializing general page...');

    // Set up general page event listeners
    setupNavigationListeners();
    setupFormValidation();
}

/**
 * Set up background animation for story pages
 */
function setupBackgroundAnimation() {
    const storyBg = document.querySelector('.story-bg-overlay');
    if (storyBg) {
        // Add subtle parallax effect on mouse move
        document.addEventListener('mousemove', (e) => {
            const moveX = (e.clientX - window.innerWidth / 2) * 0.01;
            const moveY = (e.clientY - window.innerHeight / 2) * 0.01;
            storyBg.style.transform = `translate(${moveX}px, ${moveY}px)`;
        });
    }
}

/**
 * Set up navigation listeners
 */
function setupNavigationListeners() {
    // Handle navigation menu toggles if present
    const navToggle = document.querySelector('.navbar-toggler');
    if (navToggle) {
        navToggle.addEventListener('click', () => {
            const target = document.querySelector(navToggle.dataset.bsTarget);
            if (target) {
                target.classList.toggle('show');
            }
        });
    }
}

/**
 * Set up form validation for any forms
 */
function setupFormValidation() {
    // Add validation for all forms with the 'needs-validation' class
    const forms = document.querySelectorAll('.needs-validation');

    Array.from(forms).forEach(form => {
        form.addEventListener('submit', (event) => {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }

            form.classList.add('was-validated');
        }, false);
    });
}

/**
 * Initialize PayPal integration if applicable
 */
function initializePayPalIntegration() {
    console.log('Checking PayPal integration...');

    // Check if PayPal SDK is loaded
    const paypalLoaded = typeof paypal !== 'undefined';
    console.log('PayPal SDK loaded:', paypalLoaded);

    // Check if PayPal button container exists
    const buttonContainer = document.getElementById('paypal-button-container');
    console.log('PayPal button container exists:', !!buttonContainer);

    if (buttonContainer) {
        console.log('Initializing PayPal integration...');

        // Check for client ID
        const clientIdElement = document.getElementById('paypal-client-id');
        const clientIdAvailable = !!clientIdElement;
        console.log('PayPal Client ID available:', clientIdAvailable);

        if (paypalLoaded && clientIdAvailable) {
            // Initialize PayPal buttons (implement based on your PayPal integration)
            initializePayPalButtons(clientIdElement.value);
        } else {
            // Load PayPal SDK if not loaded yet
            loadPayPalSDK();
        }
    }
}

/**
 * Load PayPal SDK dynamically if needed
 */
function loadPayPalSDK() {
    const clientIdElement = document.getElementById('paypal-client-id');
    if (!clientIdElement) return;

    const clientId = clientIdElement.value;
    if (!clientId) return;

    // Create script element
    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD`;
    script.onload = () => {
        console.log('PayPal SDK loaded dynamically');
        initializePayPalButtons(clientId);
    };

    // Append to document
    document.body.appendChild(script);
}

/**
 * Initialize PayPal buttons with client ID
 * @param {string} clientId - PayPal client ID
 */
function initializePayPalButtons(clientId) {
    if (typeof paypal === 'undefined' || !paypal.Buttons) {
        console.error('PayPal SDK not properly loaded');
        return;
    }

    // Implement PayPal button rendering based on your specific implementation
    // This is a placeholder - adjust as needed
    paypal.Buttons({
        createOrder: function(data, actions) {
            // Get package ID or amount from the page
            const packageId = document.getElementById('selected-package').value;
            const amount = document.getElementById('package-amount').value;

            return actions.order.create({
                purchase_units: [{
                    description: `Currency Package #${packageId}`,
                    amount: {
                        currency_code: 'USD',
                        value: amount
                    }
                }]
            });
        },
        onApprove: function(data, actions) {
            return actions.order.capture().then(function(details) {
                console.log('Transaction completed', details);

                // Call your server to process the transaction
                return fetch('/api/process_payment', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        order_id: data.orderID,
                        details: details
                    })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        UI.showToast('Success', 'Payment processed successfully!', 'success');

                        // Update currency balances if provided
                        if (data.new_balances) {
                            CurrencyHandler.updateBalances(data.new_balances);
                        }

                        // Redirect if needed
                        if (data.redirect_url) {
                            setTimeout(() => {
                                window.location.href = data.redirect_url;
                            }, 1500);
                        }
                    } else {
                        UI.showToast('Error', data.error || 'Payment processing failed', 'error');
                    }
                });
            });
        }
    }).render('#paypal-button-container');
}


// Loading overlay functions
function createLoadingOverlay(message = 'Loading...') {
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';

    const spinner = document.createElement('div');
    spinner.className = 'spinner-border text-light';
    spinner.setAttribute('role', 'status');

    const loadingText = document.createElement('div');
    loadingText.className = 'loading-text';
    loadingText.textContent = message;

    const progressContainer = document.createElement('div');
    progressContainer.className = 'progress mt-2';
    progressContainer.style.width = '200px';

    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';
    progressBar.style.width = '0%';
    progressBar.setAttribute('aria-valuenow', '0');
    progressBar.setAttribute('aria-valuemin', '0');
    progressBar.setAttribute('aria-valuemax', '100');

    progressContainer.appendChild(progressBar);
    overlay.appendChild(spinner);
    overlay.appendChild(loadingText);
    overlay.appendChild(progressContainer);
    document.body.appendChild(overlay);

    return progressBar;
}

function updateLoadingPercent(progressBar, percent) {
    if (progressBar) {
        progressBar.style.width = `${percent}%`;
        progressBar.setAttribute('aria-valuenow', percent);
    }
}

function removeLoadingOverlay(progressBar) {
    if (progressBar) {
        const overlay = progressBar.closest('.loading-overlay');
        if (overlay) {
            document.body.removeChild(overlay);
        }
    }
}

// Toast notification function
function showToast(title, message) {
    const toast = document.getElementById('notificationToast');
    if (toast) {
        const toastTitle = document.getElementById('toastTitle');
        const toastBody = document.getElementById('toastBody');

        if (toastTitle) toastTitle.textContent = title;
        if (toastBody) toastBody.textContent = message;

        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
    } else {
        console.log(`${title}: ${message}`);
    }
}

// Character highlighting in story text
document.addEventListener('DOMContentLoaded', function() {
    // Function to safely escape special regex characters
    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // Function to highlight characters in story text
    function highlightCharactersInStory() {
        const storyContent = document.querySelector('.story-content');
        if (!storyContent) {
            console.log('Story content element not found');
            return;
        }

        // Get all character names from the mini-portraits
        const characterPortraits = document.querySelectorAll('.character-portrait-mini');
        if (characterPortraits.length === 0) {
            console.log('No character portraits found');
            return;
        }

        const characterNames = [];

        // Collect character data, handling possible missing elements
        characterPortraits.forEach(portrait => {
            const nameElement = portrait.querySelector('.character-mini-name');
            const imageElement = portrait.querySelector('img');

            if (nameElement && imageElement) {
                const name = nameElement.textContent.trim();
                if (name) { // Only add if name is not empty
                    const dataName = portrait.getAttribute('data-character-name') || name.toLowerCase().replace(/\s/g, '-');
                    characterNames.push({
                        name: name,
                        image: imageElement.src,
                        dataName: dataName
                    });
                }
            }
        });

        if (characterNames.length === 0) {
            console.log('No valid character names found');
            return;
        }

        console.log(`Found ${characterNames.length} characters to highlight`);

        // Sort names by length (longest first) to avoid partial matches
        characterNames.sort((a, b) => b.name.length - a.name.length);

        // Get the story text content
        let storyHTML = storyContent.innerHTML;
        const originalHTML = storyHTML;

        // Replace character names with highlighted spans
        characterNames.forEach(character => {
            try {
                const escapedName = escapeRegExp(character.name);
                // Only match whole words
                const regex = new RegExp(`\\b${escapedName}\\b(?![^<]*>)`, 'gi');

                storyHTML = storyHTML.replace(regex, match => {
                    return `<span class="character-mention" data-character="${character.dataName}">${match}<span class="character-tooltip"><img src="${character.image}" alt="${match}">${match}</span></span>`;
                });
            } catch (error) {
                console.error(`Error highlighting character ${character.name}:`, error);
            }
        });

        // Only update if changes were made
        if (storyHTML !== originalHTML) {
            storyContent.innerHTML = storyHTML;

            // Add click event to highlight corresponding mini-portrait
            document.querySelectorAll('.character-mention').forEach(mention => {
                mention.addEventListener('click', function() {
                    const characterId = this.dataset.character;
                    if (!characterId) return;

                    // Remove highlight from all portraits
                    document.querySelectorAll('.character-mini-img').forEach(img => {
                        img.classList.remove('character-mini-highlight');
                    });

                    // Add highlight to this portrait
                    const targetPortrait = document.querySelector(`.character-portrait-mini[data-character-name="${characterId}"]`);
                    if (targetPortrait) {
                        const portraitImg = targetPortrait.querySelector('.character-mini-img');
                        if (portraitImg) {
                            portraitImg.classList.add('character-mini-highlight');

                            // Scroll to the portrait if needed
                            targetPortrait.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

                            // Remove highlight after 3 seconds
                            setTimeout(() => {
                                portraitImg.classList.remove('character-mini-highlight');
                            }, 3000);
                        }
                    }
                });
            });

            console.log('Character highlighting applied successfully');
        } else {
            console.log('No character names matched in the story text');
        }
    }

    // Run the highlighting function when page loads
    try {
        highlightCharactersInStory();
    } catch (error) {
        console.error('Error in character highlighting:', error);
    }

    // Also run when a story choice is made (if needed)
    const choiceForms = document.querySelectorAll('.choice-form');
    if (choiceForms.length > 0) {
        choiceForms.forEach(form => {
            form.addEventListener('submit', function() {
                // We'll re-run the function when the new page loads
                // This is handled by the DOMContentLoaded event
            });
        });
    }
});

//Handle currency trading.  This will be moved to currencyHandler.js
function setupCurrencyTradeHandlers() {
    // Trade form submission is now handled by the currency manager
    // This function is kept for backward compatibility
    console.log('Currency trade handling delegated to currency manager');
}

//This will be moved to currencyHandler.js
function updateCurrencyDisplays(balances) {
    if (!balances) return;

    Object.entries(balances).forEach(([currency, balance]) => {
        const displays = document.querySelectorAll(`.currency-item[data-currency="${currency}"] .currency-amount`);
        displays.forEach(display => {
            display.textContent = balance;
        });

        // Update currency requirement indicators
        document.querySelectorAll(`.currency-req-item`).forEach(reqItem => {
            if (reqItem.textContent.includes(currency)) {
                const required = parseInt(reqItem.textContent.replace(currency, ''));
                if (required > balance) {
                    reqItem.classList.add('currency-req-insufficient');
                } else {
                    reqItem.classList.remove('currency-req-insufficient');
                }
            }
        });
    });
}

//This section will be moved to a separate file, likely storyHandler.js
document.addEventListener('DOMContentLoaded', function() {
    // Character selection elements
    const characterCards = document.querySelectorAll('.character-select-card');
    const characterCheckboxes = document.querySelectorAll('.character-checkbox');
    const storyForm = document.getElementById('storyForm');
    const characterSelectionError = document.getElementById('characterSelectionError');
    const generateStoryBtn = document.getElementById('generateStoryBtn');

    // Add hidden input fields for selected images
    function updateSelectedImagesInput() {
        if (!storyForm) return;

        // Remove any existing hidden inputs
        document.querySelectorAll('input[name="selected_images[]"]').forEach(el => el.remove());

        // Add new hidden inputs for each selected character
        document.querySelectorAll('.character-checkbox:checked').forEach(checkbox => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = 'selected_images[]';
            input.value = checkbox.value;
            storyForm.appendChild(input);
        });
    }

    // Clear all selections
    function clearAllSelections() {
        characterCards.forEach(card => {
            card.classList.remove('selected');
            const indicator = card.querySelector('.selection-indicator');
            if (indicator) {
                indicator.style.display = 'none';
            }
        });

        characterCheckboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
    }

    // Handle character selection when clicking on card
    characterCards.forEach(card => {
        card.addEventListener('click', function() {
            const characterId = this.dataset.id;
            const checkbox = document.getElementById(`character${characterId}`);
            const selectionIndicator = this.querySelector('.selection-indicator');

            if (!checkbox || !selectionIndicator) return;

            // For single-select behavior
            clearAllSelections();

            // Select this character
            checkbox.checked = true;
            selectionIndicator.style.display = 'block';
            this.classList.add('selected');

            updateSelectedImagesInput();

            // Show toast notification
            showToast('Character Selected', 'Character has been selected for your story.');
        });
    });

    // Handle select character button clicks
    const selectButtons = document.querySelectorAll('.select-character-btn');
    selectButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();

            const characterId = this.dataset.characterId;
            const characterCard = document.querySelector(`.character-select-card[data-id="${characterId}"]`);

            if (!characterCard) return;

            const checkbox = document.getElementById(`character${characterId}`);
            const selectionIndicator = characterCard.querySelector('.selection-indicator');

            if (!checkbox || !selectionIndicator) return;

            // For single-select behavior
            clearAllSelections();

            // Select this character
            checkbox.checked = true;
            selectionIndicator.style.display = 'block';
            characterCard.classList.add('selected');

            updateSelectedImagesInput();

            // Show toast notification
            showToast('Character Selected', 'Character has been selected for your story.');
        });
    });

    // Handle reroll buttons
    const rerollButtons = document.querySelectorAll('.reroll-btn');
    rerollButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();

            const cardContainer = this.closest('.character-container');

            if (!cardContainer) return;

            const characterCard = cardContainer.querySelector('.character-select-card');

            if (!characterCard) return;

            // Show loading state
            this.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Rerolling...';

            // Fetch a new random character
            fetch('/api/random_character')
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Update image
                        const cardImg = characterCard.querySelector('img');
                        if (cardImg) {
                            cardImg.src = data.image_url;
                        }

                        // Update character ID
                        characterCard.dataset.id = data.id;

                        // Update character name
                        const nameElement = cardContainer.querySelector('.character-name');
                        if (nameElement) {
                            nameElement.textContent = data.name;
                        }

                        // Update traits
                        const traitsContainer = cardContainer.querySelector('.character-traits-list');
                        if (traitsContainer) {
                            traitsContainer.innerHTML = '';
                            if (data.character_traits && data.character_traits.length > 0) {
                                data.character_traits.forEach(trait => {
                                    const traitBadge = document.createElement('span');
                                    traitBadge.className = 'trait-badge';
                                    traitBadge.textContent = trait;
                                    traitsContainer.appendChild(traitBadge);
                                });
                            }
                        }

                        // Update select button data attribute
                        const selectBtn = cardContainer.querySelector('.select-character-btn');
                        if (selectBtn) {
                            selectBtn.dataset.characterId = data.id;
                        }

                        // Update hidden input
                        const checkbox = cardContainer.querySelector('.character-checkbox');
                        if (checkbox) {
                            checkbox.value = data.id;
                            checkbox.id = `character${data.id}`;
                        }

                        // Show toast notification
                        showToast('Character Updated', 'A new character has been loaded!');
                    } else {
                        showToast('Error', 'Failed to load a new character. Please try again.');
                    }

                    // Reset button
                    this.innerHTML = '<i class="fas fa-dice me-1"></i> Reroll Character';
                })
                .catch(error => {
                    console.error('Error fetching random character:', error);
                    this.innerHTML = '<i class="fas fa-dice me-1"></i> Reroll Character';
                    showToast('Error', 'Failed to load a new character. Please try again.');
                });
        });
    });

    // Form submission handling
    if (storyForm) {
        storyForm.addEventListener('submit', function(e) {
            e.preventDefault();

            // Check if at least one character is selected
            const selectedCharacters = document.querySelectorAll('.character-checkbox:checked');
            if (selectedCharacters.length !== 1) {
                if (characterSelectionError) {
                    characterSelectionError.style.display = 'block';
                    characterSelectionError.textContent = 'Please select a character for your story';
                    window.scrollTo(0, 0);
                }
                showToast('Selection Needed', 'Please select a character before continuing');
                return;
            }

            // Hide error message if shown
            if (characterSelectionError) {
                characterSelectionError.style.display = 'none';
            }

            // Create loading overlay with percentage
            const loadingPercent = createLoadingOverlay('Generating your adventure...');

            if (generateStoryBtn) {
                generateStoryBtn.disabled = true;
                generateStoryBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Generating Story...';
            }

            let progress = 0;
            const progressInterval = setInterval(() => {
                if (progress < 90) {
                    progress += 5;
                    updateLoadingPercent(loadingPercent, progress);
                }
            }, 500);

            // Update selected images input
            updateSelectedImagesInput();

            // Submit the form
            const formData = new FormData(this);
            fetch('/generate_story', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })
                .then(response => response.json())
                .then(data => {
                    clearInterval(progressInterval);

                    if (data.success && data.redirect) {
                        updateLoadingPercent(loadingPercent, 100);
                        setTimeout(() => {
                            window.location.href = data.redirect;
                        }, 500);
                    } else {
                        throw new Error(data.error || 'Failed to generate story');
                    }
                })
                .catch(error => {
                    console.error('Error generating story:', error);
                    showToast('Error', error.message || 'Failed to generate story. Please try again.');

                    clearInterval(progressInterval);
                    const overlay = loadingPercent.closest('.loading-overlay');
                    if (overlay) overlay.remove();

                    if (generateStoryBtn) {
                        generateStoryBtn.disabled = false;
                        generateStoryBtn.innerHTML = '<i class="fas fa-pen-fancy me-2"></i>Begin Your Adventure';
                    }
                });
        });
    }

    // Story choice form submission - use delegated event handling to prevent duplicates
    document.addEventListener('submit', async function(e) {
        // Only process choice forms
        if (!e.target.classList.contains('choice-form')) return;

        e.preventDefault();
        const form = e.target;
        const btn = form.querySelector('button');

        // Prevent double-submission
        if (btn.disabled) return;

        // Get currency requirements from data attribute
        const currencyReq = btn.dataset.currencyReq ? JSON.parse(btn.dataset.currencyReq) : null;
        const isCustomChoice = form.querySelector('.custom-choice-input') !== null;

        btn.disabled = true;
        btn.classList.add('loading');

        const loadingPercent = createLoadingOverlay('Processing your choice...');
        let progress = 0;
        const progressInterval = setInterval(() => {
            if (progress < 90) {
                progress += 5;
                updateLoadingPercent(loadingPercent, progress);
            }
        }, 500);

        try {
            // Make the choice
            const formData = new FormData(form);
            const isCustom = form.querySelector('.custom-choice-input') !== null;

            // Handle currency requirements for story choices
            let choiceData = {};
            if (isCustom) {
                choiceData = {
                    custom_choice: formData.get('custom_choice')
                };
            } else {
                choiceData = {
                    choice_id: form.querySelector('button').dataset.choiceId,
                    previous_choice: formData.get('previous_choice')
                };
            }

            const response = await fetch('/make_choice', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(choiceData)
            });

            const data = await response.json();
            clearInterval(progressInterval);

            if (!response.ok) {
                // Handle insufficient funds error
                if (response.status === 400 && data.error.includes('Insufficient')) {
                    let errorMessage = isCustomChoice ?
                        `Insufficient diamonds. You need 100 💎 but only have ${data.current_balance} 💎.` :
                        'Insufficient funds for this choice.';

                    showToast('Error', errorMessage);
                    btn.disabled = false;
                    btn.classList.remove('loading');
                    const overlay = loadingPercent.closest('.loading-overlay');
                    if (overlay) overlay.remove();
                    return;
                }
                throw new Error(data.error || 'Failed to process choice');
            }

            if (data.success) {
                // Update currency displays with new balances
                if (data.new_balances) {
                    updateCurrencyDisplays(data.new_balances);
                }

                // Generate next part of the story
                const storyResponse = await fetch('/generate_story', {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });

                const storyData = await storyResponse.json();

                if (storyData.success && storyData.redirect) {
                    updateLoadingPercent(loadingPercent, 100);
                    setTimeout(() => {
                        window.location.href = storyData.redirect;
                    }, 500);
                } else {
                    throw new Error(storyData.error || 'Failed to generate next story part');
                }
            } else {
                throw new Error(data.error || 'Failed to process choice');
            }
        } catch (error) {
            console.error('Error processing choice:', error);
            showToast('Error', error.message || 'Failed to process your choice');
            btn.disabled = false;
            btn.classList.remove('loading');
            clearInterval(progressInterval);
            const overlay = loadingPercent.closest('.loading-overlay');
            if (overlay) overlay.remove();
        }
    });

    // Debug page enhancements
    const editModeSwitch = document.getElementById('editModeSwitch');
    const generatedContent = document.getElementById('generatedContent');

    if (editModeSwitch && generatedContent) {
        editModeSwitch.addEventListener('change', function() {
            if (this.checked) {
                generatedContent.contentEditable = true;
                generatedContent.classList.add('editable');
                generatedContent.focus();
            } else {
                generatedContent.contentEditable = false;
                generatedContent.classList.remove('editable');
            }
        });
    }

    // Check radio buttons on page load to restore selection state
    if (characterCheckboxes && characterCheckboxes.length > 0 && characterCards && characterCards.length > 0) {
        characterCheckboxes.forEach((checkbox, index) => {
            if (checkbox.checked && index < characterCards.length) {
                characterCards[index].classList.add('selected');
                const indicator = characterCards[index].querySelector('.selection-indicator');
                if (indicator) {
                    indicator.style.display = 'block';
                }
            }
        });
    }
});

//This will be moved to currencyHandler.js
// Temporary placeholder for PayPal functionality
document.addEventListener('DOMContentLoaded', function() {
    const purchaseModal = document.getElementById('purchaseModal');
    if (purchaseModal) {
        const paypalContainer = document.getElementById('paypal-button-container');
        if (paypalContainer) {
            paypalContainer.innerHTML = '<div class="alert alert-info">Payment functionality is temporarily disabled.</div>';
        }
    }
});


//This section will be moved to a separate file, likely storyHandler.js
// Update choice buttons to show currency requirements
document.querySelectorAll('.choice-form').forEach(form => {
    const button = form.querySelector('button');
    if (button && button.dataset.currencyReq) {
        const requirements = JSON.parse(button.dataset.currencyReq);
        const reqDiv = document.createElement('div');
        reqDiv.className = 'choice-currency-req';

        Object.entries(requirements).forEach(([currency, amount]) => {
            const reqItem = document.createElement('span');
            reqItem.className = 'currency-req-item';
            reqItem.innerHTML = `${currency}${amount}`;
            reqDiv.appendChild(reqItem);
        });

        button.parentNode.insertBefore(reqDiv, button.nextSibling);
    }
});

//This section will be moved to a separate file, likely storyHandler.js
// Handle choice form submission
document.querySelectorAll('.choice-form').forEach(form => {
    form.addEventListener('submit', function(e) {
        e.preventDefault();

        const choiceId = this.querySelector('input[name="choice_id"]').value;
        const currencyReq = this.querySelector('button').dataset.currencyReq;
        const requirements = currencyReq ? JSON.parse(currencyReq) : null;

        if (!choiceId) {
            showToast('Error', 'No choice selected');
            return;
        }

        // Use currency manager to process the choice
        window.currencyManager.processChoice(choiceId, requirements, (data) => {
            if (data.success) {
                // Handle successful choice
                showToast('Success', 'Your choice has been processed');

                // Submit the form to continue the story
                this.submit();
            }
        });
    });
});

//This section will be moved to a separate file, likely storyHandler.js
// Handle custom choice form submission
const customChoiceForm = document.querySelector('.custom-choice-form');
if (customChoiceForm) {
    customChoiceForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const customChoiceInput = this.querySelector('textarea[name="custom_choice"]');
        if (!customChoiceInput.value.trim()) {
            showToast('Error', 'Please enter your custom choice');
            return;
        }

        // Use currency manager to process the custom choice
        window.currencyManager.processCustomChoice(customChoiceInput.value, (data) => {
            if (data.success) {
                // Handle successful choice
                showToast('Success', 'Your custom choice has been processed');

                // Submit the form to continue the story
                this.submit();
            }
        });
    });
}

//This will be moved to currencyHandler.js
// Setup currency trade modal
// Initialize the currency manager
document.addEventListener('DOMContentLoaded', function() {
    if (!window.currencyManager) {
        window.currencyManager = new CurrencyManager();

        // Get initial currency balances
        fetch('/api/user/inventory')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    window.currencyManager.initialize(data.currency_balances);
                }
            })
            .catch(error => {
                console.error('Error fetching currency balances:', error);
            });
    }
});


//This section is a placeholder for a UI module.  The functions here should be moved to a UI module.
const UI = {
    showToast: function(title, message, type = 'info') {
        const toast = document.getElementById('notificationToast');
        if (toast) {
            const toastTitle = document.getElementById('toastTitle');
            const toastBody = document.getElementById('toastBody');
            const toastType = document.getElementById('toastType');

            if (toastTitle) toastTitle.textContent = title;
            if (toastBody) toastBody.textContent = message;
            if (toastType) toastType.className = `toast-header bg-${type}`;

            const bsToast = new bootstrap.Toast(toast);
            bsToast.show();
        } else {
            console.log(`${title}: ${message}`);
        }
    }
};