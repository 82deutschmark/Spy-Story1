// Loading overlay functions
function createLoadingOverlay(message = 'Generating Story...') {
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
        <div class="loading-content">
            <div class="loading-spinner"></div>
            <div class="loading-percentage">0%</div>
        </div>
    `;
    document.body.appendChild(overlay);
    overlay.style.display = 'flex';
    return overlay.querySelector('.loading-percentage');
}

function updateLoadingPercent(element, percent) {
    element.textContent = `${Math.round(percent)}%`;
}

function removeLoadingOverlay(overlay) {
    overlay.closest('.loading-overlay').remove();
}

// Toast notification function
function showToast(title, message) {
    const toastEl = document.getElementById('notificationToast');
    if (toastEl) {
        const toast = new bootstrap.Toast(toastEl);
        document.getElementById('toastTitle').textContent = title;
        document.getElementById('toastMessage').textContent = message;
        toast.show();
    }
}

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

            const response = await fetch('/make_choice', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({
                    choice_id: formData.get('choice_id'),
                    custom_choice: isCustom ? formData.get('custom_choice') : null,
                    currency_requirements: currencyReq
                })
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


// Character highlighting in story text
document.addEventListener('DOMContentLoaded', function() {
    // Function to highlight characters in story text
    function highlightCharactersInStory() {
        const storyContent = document.querySelector('.story-content');
        if (!storyContent) return;

        // Get all character names from the mini-portraits
        const characterPortraits = document.querySelectorAll('.character-portrait-mini');
        const characterNames = Array.from(characterPortraits).map(portrait => {
            return {
                name: portrait.querySelector('.character-mini-name').textContent.trim(),
                image: portrait.querySelector('img').src,
                element: portrait
            };
        });

        // Sort names by length (longest first) to avoid partial matches
        characterNames.sort((a, b) => b.name.length - a.name.length);

        // Get the story text
        let storyText = storyContent.innerHTML;

        // Replace character names with highlighted spans
        characterNames.forEach(character => {
            const regex = new RegExp(`\\b${character.name}\\b`, 'gi');
            storyText = storyText.replace(regex, match => {
                return `<span class="character-mention" data-character="${character.name.toLowerCase().replace(/\s/g, '-')}">${match}<span class="character-tooltip"><img src="${character.image}" alt="${match}">${match}</span></span>`;
            });
        });

        // Update the story content
        storyContent.innerHTML = storyText;

        // Add click event to highlight corresponding mini-portrait
        document.querySelectorAll('.character-mention').forEach(mention => {
            mention.addEventListener('click', function() {
                const characterId = this.dataset.character;
                const targetPortrait = document.querySelector(`.character-portrait-mini[data-character-name="${characterId}"]`);

                // Remove highlight from all portraits
                document.querySelectorAll('.character-mini-img').forEach(img => {
                    img.classList.remove('character-mini-highlight');
                });

                // Add highlight to this portrait
                if (targetPortrait) {
                    const portraitImg = targetPortrait.querySelector('.character-mini-img');
                    portraitImg.classList.add('character-mini-highlight');

                    // Scroll to the portrait if needed
                    targetPortrait.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

                    // Remove highlight after 3 seconds
                    setTimeout(() => {
                        portraitImg.classList.remove('character-mini-highlight');
                    }, 3000);
                }
            });
        });
    }

    // Run the highlighting function when page loads
    highlightCharactersInStory();

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

// Update currency displays function
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


// PayPal button rendering
function initializePayPal() {
    console.log('Initializing PayPal integration...');
    const container = document.getElementById('paypal-button-container');

    if (!container) {
        console.error('PayPal button container not found');
        return;
    }

    if (typeof paypal === 'undefined') {
        console.error('PayPal SDK not loaded');
        showToast('Error', 'Payment system not available. Please try again later.');
        return;
    }

    console.log('PayPal SDK loaded, configuring buttons...');
    let selectedAmount = 100; // Default amount
    let selectedPrice = 1;    // Default price

    // Handle diamond package selection
    document.querySelectorAll('.diamond-package').forEach(button => {
        button.addEventListener('click', function() {
            selectedAmount = parseInt(this.dataset.amount);
            selectedPrice = parseInt(this.dataset.price);
            console.log(`Selected package: ${selectedAmount} diamonds for $${selectedPrice}`);

            // Update active state
            document.querySelectorAll('.diamond-package').forEach(btn => {
                btn.classList.remove('active');
            });
            this.classList.add('active');

            // Re-render PayPal buttons with new amount
            renderPayPalButtons();
        });
    });

    function renderPayPalButtons() {
        console.log('Rendering PayPal buttons...');
        container.innerHTML = ''; // Clear existing buttons

        try {
            paypal.Buttons({
                createOrder: function(data, actions) {
                    console.log(`Creating order for ${selectedAmount} diamonds at $${selectedPrice}`);
                    return actions.order.create({
                        purchase_units: [{
                            amount: {
                                value: selectedPrice.toString(),
                                currency_code: 'USD'
                            },
                            description: `Purchase ${selectedAmount} diamonds 💎`
                        }]
                    });
                },
                onApprove: function(data, actions) {
                    console.log('Payment approved, capturing funds...');
                    return actions.order.capture().then(function(details) {
                        // Show loading state
                        const loadingPercent = createLoadingOverlay('Processing payment...');
                        updateLoadingPercent(loadingPercent, 50);

                        // Handle successful payment
                        fetch('/api/purchase/diamonds/success', {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/json'
                            }
                        })
                            .then(response => response.json())
                            .then(data => {
                                updateLoadingPercent(loadingPercent, 100);
                                if (data.success) {
                                    // Update all currency displays with new balance
                                    updateCurrencyDisplays(data.new_balances);
                                    showToast('Success', `Successfully purchased ${selectedAmount} diamonds!`);

                                    // Close modal
                                    const modal = bootstrap.Modal.getInstance(document.getElementById('purchaseModal'));
                                    if (modal) {
                                        modal.hide();
                                    }
                                } else {
                                    showToast('Error', data.error || 'Failed to process purchase');
                                }
                                removeLoadingOverlay(loadingPercent);
                            })
                            .catch(error => {
                                console.error('Error processing purchase:', error);
                                showToast('Error', 'Failed to process purchase');
                                removeLoadingOverlay(loadingPercent);
                            });
                    });
                },
                onError: function(err) {
                    console.error('PayPal button error:', err);
                    showToast('Error', 'Payment system error. Please try again later.');
                }
            }).render('#paypal-button-container')
                .then(() => {
                    console.log('PayPal buttons rendered successfully');
                })
                .catch(err => {
                    console.error('Error rendering PayPal buttons:', err);
                    showToast('Error', 'Failed to initialize payment system');
                });
        } catch (error) {
            console.error('Error setting up PayPal buttons:', error);
            showToast('Error', 'Failed to set up payment system');
        }
    }

    // Initial render of PayPal buttons
    renderPayPalButtons();
}

// Initialize PayPal when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, checking PayPal integration...');
    // Give PayPal SDK a moment to load
    setTimeout(() => {
        initializePayPal();
    }, 1000);
});

// Handle currency trading
const tradeForm = document.getElementById('tradeForm');
if (tradeForm) {
    tradeForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const fromCurrency = document.getElementById('fromCurrency').value;
        const toCurrency = document.getElementById('toCurrency').value;
        const amount = parseInt(document.getElementById('tradeAmount').value);

        if (fromCurrency === toCurrency) {
            showToast('Error', 'Please select different currencies to trade');
            return;
        }

        if (isNaN(amount) || amount <= 0) {
            showToast('Error', 'Please enter a valid amount');
            return;
        }

        // Show loading state
        const loadingPercent = createLoadingOverlay('Processing trade...');
        updateLoadingPercent(loadingPercent, 50);

        fetch('/api/currency/trade', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from_currency: fromCurrency,
                to_currency: toCurrency,
                amount: amount
            })
        })
            .then(response => response.json())
            .then(data => {
                updateLoadingPercent(loadingPercent, 100);
                if (data.success) {
                    // Update all currency displays
                    updateCurrencyDisplays(data.new_balances);
                    showToast('Success', data.message);

                    // Reset form
                    document.getElementById('tradeAmount').value = '';

                    // Close modal
                    const modal = bootstrap.Modal.getInstance(document.getElementById('tradeModal'));
                    if (modal) {
                        modal.hide();
                    }
                } else {
                    showToast('Error', data.error || 'Failed to trade currencies');
                }
                removeLoadingOverlay(loadingPercent);
            })
            .catch(error => {
                console.error('Error trading currencies:', error);
                showToast('Error', 'Failed to trade currencies');
                removeLoadingOverlay(loadingPercent);
            });
    });
}

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