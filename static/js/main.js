
// UI Utilities Module
const UIUtils = (function() {
    // Loading overlay functions
    function createLoadingOverlay(message = 'Loading...') {
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
        if (element) {
            element.textContent = `${Math.round(percent)}%`;
        }
    }

    function removeLoadingOverlay(overlay) {
        if (overlay && overlay.closest('.loading-overlay')) {
            overlay.closest('.loading-overlay').remove();
        }
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

    // Alias for showToast for compatibility
    function showNotification(title, message) {
        showToast(title, message);
    }

    return {
        createLoadingOverlay,
        updateLoadingPercent,
        removeLoadingOverlay,
        showToast,
        showNotification
    };
})();

// Currency Manager Module
const CurrencyManager = (function() {
    function updateCurrencyDisplays(balances) {
        if (!balances) return;

        Object.entries(balances).forEach(([currency, balance]) => {
            const displays = document.querySelectorAll(`.currency-item .currency-amount`);
            displays.forEach(display => {
                const currencySymbol = display.previousElementSibling;
                if (currencySymbol && currencySymbol.textContent === currency) {
                    display.textContent = balance;
                }
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

    function processTradeRequest(fromCurrency, toCurrency, amount) {
        if (fromCurrency === toCurrency) {
            UIUtils.showToast('Error', 'Please select different currencies to trade');
            return Promise.reject('Same currency');
        }

        if (isNaN(amount) || amount <= 0) {
            UIUtils.showToast('Error', 'Please enter a valid amount');
            return Promise.reject('Invalid amount');
        }

        // Show loading state
        const loadingPercent = UIUtils.createLoadingOverlay('Processing trade...');
        UIUtils.updateLoadingPercent(loadingPercent, 50);

        return fetch('/api/currency/trade', {
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
                UIUtils.updateLoadingPercent(loadingPercent, 100);
                if (data.success) {
                    // Update all currency displays
                    updateCurrencyDisplays(data.new_balances);
                    UIUtils.showToast('Success', data.message);
                    return data;
                } else {
                    throw new Error(data.error || 'Failed to trade currencies');
                }
            })
            .catch(error => {
                console.error('Error trading currencies:', error);
                UIUtils.showToast('Error', error.message || 'Failed to trade currencies');
                throw error;
            })
            .finally(() => {
                UIUtils.removeLoadingOverlay(loadingPercent);
            });
    }

    return {
        updateCurrencyDisplays,
        processTradeRequest
    };
})();

// User Progress Module
const UserProgressManager = (function() {
    function updateUserProgress(level, experience) {
        if (!level && !experience) return;

        // Update level display
        const levelDisplay = document.querySelector('.user-level');
        if (levelDisplay && level) {
            levelDisplay.textContent = `Level ${level}`;
        }

        // Update XP bar
        const xpProgress = document.querySelector('.xp-progress');
        if (xpProgress && experience) {
            const xpPercent = experience % 100;
            xpProgress.style.width = `${xpPercent}%`;
        }

        // Update progress modal if open
        if (document.getElementById('progressModal')) {
            // Find all strong elements in the progress modal
            const strongElements = document.querySelectorAll('#progressModal .card-body strong');

            // Update level
            if (level) {
                strongElements.forEach(elem => {
                    if (elem.textContent === 'Level:') {
                        const nextNode = elem.nextSibling;
                        if (nextNode) {
                            nextNode.textContent = ` ${level}`;
                        }
                    }
                });
            }

            // Update XP
            if (experience) {
                strongElements.forEach(elem => {
                    if (elem.textContent === 'XP:') {
                        const nextNode = elem.nextSibling;
                        if (nextNode) {
                            nextNode.textContent = ` ${experience}`;
                        }
                    }
                });

                // Update Next Level
                strongElements.forEach(elem => {
                    if (elem.textContent === 'Next Level:') {
                        const nextNode = elem.nextSibling;
                        if (nextNode) {
                            nextNode.textContent = ` ${Math.floor(experience / 100) + 1}`;
                        }
                    }
                });
            }

            // Update progress bar
            const progressBar = document.querySelector('#progressModal .progress-bar');
            if (progressBar && experience) {
                const xpPercent = experience % 100;
                progressBar.style.width = `${xpPercent}%`;
                progressBar.setAttribute('aria-valuenow', xpPercent);
                progressBar.textContent = `${xpPercent}%`;
            }
        }
    }

    return {
        updateUserProgress
    };
})();

// Character Management Module
const CharacterManager = (function() {
    function clearAllSelections() {
        const characterCards = document.querySelectorAll('.character-select-card');
        const characterCheckboxes = document.querySelectorAll('.character-checkbox');
        
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

    function updateSelectedImagesInput() {
        const storyForm = document.getElementById('storyForm');
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

    function fetchRandomCharacter() {
        return fetch('/api/random_character')
            .then(response => response.json())
            .then(data => {
                if (!data.success) {
                    throw new Error(data.error || 'Failed to load character');
                }
                return data;
            });
    }

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

    return {
        clearAllSelections,
        updateSelectedImagesInput,
        fetchRandomCharacter,
        highlightCharactersInStory
    };
})();

// Story Generation Module
const StoryManager = (function() {
    function generateStory(formData) {
        // Create loading overlay with percentage
        const loadingPercent = UIUtils.createLoadingOverlay('Generating your adventure...');
        
        const generateStoryBtn = document.getElementById('generateStoryBtn');
        if (generateStoryBtn) {
            generateStoryBtn.disabled = true;
            generateStoryBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Generating Story...';
        }

        let progress = 0;
        const progressInterval = setInterval(() => {
            if (progress < 90) {
                progress += 5;
                UIUtils.updateLoadingPercent(loadingPercent, progress);
            }
        }, 500);

        return fetch('/generate_story', {
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
                    UIUtils.updateLoadingPercent(loadingPercent, 100);
                    setTimeout(() => {
                        window.location.href = data.redirect;
                    }, 500);
                    return data;
                } else {
                    throw new Error(data.error || 'Failed to generate story');
                }
            })
            .catch(error => {
                console.error('Error generating story:', error);
                UIUtils.showToast('Error', error.message || 'Failed to generate story. Please try again.');
                clearInterval(progressInterval);
                
                if (generateStoryBtn) {
                    generateStoryBtn.disabled = false;
                    generateStoryBtn.innerHTML = '<i class="fas fa-pen-fancy me-2"></i>Begin Your Adventure';
                }
                
                UIUtils.removeLoadingOverlay(loadingPercent);
                throw error;
            });
    }

    function processChoice(form) {
        const btn = form.querySelector('button');

        // Prevent double-submission by checking if button is disabled
        if (btn.disabled) return Promise.reject('Button is disabled');

        // Get currency requirements from data attribute
        const currencyReq = btn.dataset.currencyReq ? JSON.parse(btn.dataset.currencyReq) : null;
        const isCustomChoice = form.querySelector('.custom-choice-input') !== null;

        btn.disabled = true;
        btn.classList.add('loading');

        const loadingPercent = UIUtils.createLoadingOverlay('Processing your choice...');
        let progress = 0;
        const progressInterval = setInterval(() => {
            if (progress < 90) {
                progress += 5;
                UIUtils.updateLoadingPercent(loadingPercent, progress);
            }
        }, 500);

        // Prepare form data
        const formData = new FormData(form);
        const isCustom = form.querySelector('.custom-choice-input') !== null;

        return fetch('/make_choice', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({
                choice_id: formData.get('choice_id'),
                custom_choice: isCustom ? formData.get('custom_choice') : null,
                currency_requirements: currencyReq,
                story_id: document.querySelector('input[name="story_id"]')?.value || null
            })
        })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(data => {
                        if (response.status === 400 && data.error && data.error.includes('Insufficient')) {
                            let errorMessage = isCustomChoice ?
                                `Insufficient diamonds. You need 100 💎 but only have ${data.current_balance} 💎.` :
                                'Insufficient funds for this choice.';
                    
                            throw new Error(errorMessage);
                        }
                        throw new Error(data.error || 'Failed to process choice');
                    });
                }
                return response.json();
            })
            .then(data => {
                if (!data.success) {
                    throw new Error(data.error || 'Failed to process choice');
                }

                // Update currency displays with new balances
                if (data.new_balances) {
                    CurrencyManager.updateCurrencyDisplays(data.new_balances);
                }

                // Update user level and XP if provided
                if (data.level && data.experience) {
                    UserProgressManager.updateUserProgress(data.level, data.experience);
                }

                // Generate next part of the story
                return fetch('/generate_story', {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });
            })
            .then(response => response.json())
            .then(storyData => {
                clearInterval(progressInterval);

                if (storyData.success && storyData.redirect) {
                    UIUtils.updateLoadingPercent(loadingPercent, 100);
                    setTimeout(() => {
                        window.location.href = storyData.redirect;
                    }, 500);
                    return storyData;
                } else {
                    throw new Error(storyData.error || 'Failed to generate next story part');
                }
            })
            .catch(error => {
                console.error('Error processing choice:', error);
                UIUtils.showToast('Error', error.message || 'Failed to process your choice');
                btn.disabled = false;
                btn.classList.remove('loading');
                clearInterval(progressInterval);
                UIUtils.removeLoadingOverlay(loadingPercent);
                throw error;
            });
    }

    return {
        generateStory,
        processChoice
    };
})();

// Mission Management Module
const MissionManager = (function() {
    function loadMissionDetails(missionId) {
        // Reset modal content
        document.querySelector('#missionDetailsModal .mission-content').style.display = 'none';
        document.querySelector('#missionDetailsModal .mission-loading').style.display = 'block';
        document.querySelector('#progressUpdatesList').innerHTML = '';

        // Show modal
        const missionModal = new bootstrap.Modal(document.getElementById('missionDetailsModal'));
        missionModal.show();

        // Fetch mission details
        return fetch(`/api/missions/${missionId}`)
            .then(response => response.json())
            .then(response => {
                if (response.success && response.mission) {
                    const mission = response.mission;

                    // Fill in mission details
                    document.getElementById('missionDetailTitle').textContent = mission.title;
                    document.getElementById('missionObjective').textContent = mission.objective;
                    document.getElementById('missionDescription').textContent = mission.description;
                    document.getElementById('missionDifficulty').textContent = mission.difficulty;
                    document.getElementById('missionStatus').textContent = mission.status;
                    document.getElementById('missionDeadline').textContent = mission.deadline;
                    document.getElementById('missionReward').textContent = `${mission.reward_currency} ${mission.reward_amount}`;

                    // Update progress bar
                    const progress = mission.progress || 0;
                    const progressBar = document.getElementById('missionProgressBar');
                    progressBar.style.width = `${progress}%`;
                    progressBar.setAttribute('aria-valuenow', progress);
                    progressBar.textContent = `${progress}%`;

                    // Set character information
                    document.getElementById('missionGiver').textContent = mission.giver?.name || 'Unknown';
                    document.getElementById('missionTarget').textContent = mission.target?.name || 'Unknown';

                    // Set up button actions
                    document.getElementById('completeBtn').dataset.missionId = mission.id;
                    document.getElementById('failBtn').dataset.missionId = mission.id;

                    // Show/hide buttons based on mission status
                    document.getElementById('missionActions').style.display = 
                        mission.status !== 'active' ? 'none' : 'block';

                    // Add progress updates
                    const updatesList = document.getElementById('progressUpdatesList');
                    if (mission.progress_updates && mission.progress_updates.length > 0) {
                        mission.progress_updates.forEach(function(update) {
                            const date = new Date(update.timestamp);
                            const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();

                            let updateHtml = `
                                <div class="list-group-item">
                                    <div class="d-flex w-100 justify-content-between">
                                        <h6 class="mb-1">Progress: ${update.progress}%</h6>
                                        <small>${formattedDate}</small>
                                    </div>
                            `;

                            if (update.description) {
                                updateHtml += `<p class="mb-1">${update.description}</p>`;
                            }

                            if (update.status) {
                                updateHtml += `<span class="badge ${update.status === 'completed' ? 'bg-success' : 'bg-danger'}">${update.status}</span>`;
                            }

                            updateHtml += `</div>`;
                            updatesList.innerHTML += updateHtml;
                        });
                    } else {
                        updatesList.innerHTML = '<p class="text-muted">No progress updates yet.</p>';
                    }

                    // Show content, hide loading
                    document.querySelector('#missionDetailsModal .mission-loading').style.display = 'none';
                    document.querySelector('#missionDetailsModal .mission-content').style.display = 'block';
                    
                    return mission;
                } else {
                    throw new Error(response.error || 'Failed to load mission details');
                }
            })
            .catch(error => {
                console.error('Error loading mission details:', error);
                missionModal.hide();
                UIUtils.showToast('Error', 'Failed to load mission details');
                throw error;
            });
    }

    function completeMission(missionId) {
        if (!confirm('Are you sure you want to mark this mission as completed?')) {
            return Promise.reject('User cancelled');
        }

        return fetch(`/api/missions/${missionId}/complete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        })
            .then(response => response.json())
            .then(response => {
                if (response.success) {
                    // Close the modal
                    const missionModal = bootstrap.Modal.getInstance(document.getElementById('missionDetailsModal'));
                    if (missionModal) {
                        missionModal.hide();
                    }
                    
                    UIUtils.showToast('Success', 'Mission completed successfully!');

                    // Update currency display if provided
                    if (response.new_balances) {
                        CurrencyManager.updateCurrencyDisplays(response.new_balances);
                    }

                    // Reload page to refresh mission list
                    setTimeout(function() {
                        location.reload();
                    }, 2000);
                    
                    return response;
                } else {
                    throw new Error(response.error || 'Failed to complete mission');
                }
            })
            .catch(error => {
                console.error('Error completing mission:', error);
                UIUtils.showToast('Error', 'Failed to complete mission');
                throw error;
            });
    }

    function failMission(missionId) {
        const reason = prompt('Please provide a reason for failing the mission (optional):');
        
        if (!confirm('Are you sure you want to mark this mission as failed?')) {
            return Promise.reject('User cancelled');
        }

        return fetch(`/api/missions/${missionId}/fail`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ reason: reason })
        })
            .then(response => response.json())
            .then(response => {
                if (response.success) {
                    // Close the modal
                    const missionModal = bootstrap.Modal.getInstance(document.getElementById('missionDetailsModal'));
                    if (missionModal) {
                        missionModal.hide();
                    }
                    
                    UIUtils.showToast('Info', 'Mission marked as failed');

                    // Reload page to refresh mission list
                    setTimeout(function() {
                        location.reload();
                    }, 2000);
                    
                    return response;
                } else {
                    throw new Error(response.error || 'Failed to fail mission');
                }
            })
            .catch(error => {
                console.error('Error failing mission:', error);
                UIUtils.showToast('Error', 'Failed to update mission status');
                throw error;
            });
    }

    return {
        loadMissionDetails,
        completeMission,
        failMission
    };
})();

// PayPal Integration Module
const PaymentManager = (function() {
    let selectedAmount = 100; // Default amount
    let selectedPrice = 1;    // Default price

    function initializePayPal() {
        console.log('Initializing PayPal integration...');
        const container = document.getElementById('paypal-button-container');

        if (!container) {
            console.error('PayPal button container not found');
            return;
        }

        if (typeof paypal === 'undefined') {
            console.error('PayPal SDK not loaded');
            UIUtils.showToast('Error', 'Payment system not available. Please try again later.');
            return;
        }

        console.log('PayPal SDK loaded, configuring buttons...');
        
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

                // Re-render PayPal buttons
                renderPayPalButtons();
            });
        });

        renderPayPalButtons();
    }

    function renderPayPalButtons() {
        console.log('Rendering PayPal buttons...');
        const container = document.getElementById('paypal-button-container');
        if (!container) return;
        
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
                        const loadingPercent = UIUtils.createLoadingOverlay('Processing payment...');
                        UIUtils.updateLoadingPercent(loadingPercent, 50);

                        // Handle successful payment
                        return fetch('/api/purchase/diamonds/success', {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/json'
                            }
                        })
                            .then(response => response.json())
                            .then(data => {
                                UIUtils.updateLoadingPercent(loadingPercent, 100);
                                if (data.success) {
                                    // Update all currency displays with new balance
                                    CurrencyManager.updateCurrencyDisplays(data.new_balances);
                                    UIUtils.showToast('Success', `Successfully purchased ${selectedAmount} diamonds!`);

                                    // Close modal
                                    const modal = bootstrap.Modal.getInstance(document.getElementById('purchaseModal'));
                                    if (modal) {
                                        modal.hide();
                                    }
                                } else {
                                    UIUtils.showToast('Error', data.error || 'Failed to process purchase');
                                }
                                UIUtils.removeLoadingOverlay(loadingPercent);
                            })
                            .catch(error => {
                                console.error('Error processing purchase:', error);
                                UIUtils.showToast('Error', 'Failed to process purchase');
                                UIUtils.removeLoadingOverlay(loadingPercent);
                            });
                    });
                },
                onError: function(err) {
                    console.error('PayPal button error:', err);
                    UIUtils.showToast('Error', 'Payment system error. Please try again later.');
                }
            }).render('#paypal-button-container')
                .then(() => {
                    console.log('PayPal buttons rendered successfully');
                })
                .catch(err => {
                    console.error('Error rendering PayPal buttons:', err);
                    UIUtils.showToast('Error', 'Failed to initialize payment system');
                });
        } catch (error) {
            console.error('Error setting up PayPal buttons:', error);
            UIUtils.showToast('Error', 'Failed to set up payment system');
        }
    }

    return {
        initializePayPal
    };
})();

// Event Handler Setup
function setupEventHandlers() {
    // Character selection
    const characterCards = document.querySelectorAll('.character-select-card');
    characterCards.forEach(card => {
        card.addEventListener('click', function() {
            const characterId = this.dataset.id;
            const checkbox = document.getElementById(`character${characterId}`);
            const selectionIndicator = this.querySelector('.selection-indicator');

            if (!checkbox || !selectionIndicator) return;

            // For single-select behavior
            CharacterManager.clearAllSelections();

            // Select this character
            checkbox.checked = true;
            selectionIndicator.style.display = 'block';
            this.classList.add('selected');

            CharacterManager.updateSelectedImagesInput();

            // Show toast notification
            UIUtils.showToast('Character Selected', 'Character has been selected for your story.');
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
            CharacterManager.clearAllSelections();

            // Select this character
            checkbox.checked = true;
            selectionIndicator.style.display = 'block';
            characterCard.classList.add('selected');

            CharacterManager.updateSelectedImagesInput();

            // Show toast notification
            UIUtils.showToast('Character Selected', 'Character has been selected for your story.');
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
            CharacterManager.fetchRandomCharacter()
                .then(data => {
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
                    UIUtils.showToast('Character Updated', 'A new character has been loaded!');
                })
                .catch(error => {
                    console.error('Error fetching random character:', error);
                    UIUtils.showToast('Error', 'Failed to load a new character. Please try again.');
                })
                .finally(() => {
                    // Reset button
                    this.innerHTML = '<i class="fas fa-dice me-1"></i> Reroll Character';
                });
        });
    });

    // Form submission handling
    const storyForm = document.getElementById('storyForm');
    if (storyForm) {
        storyForm.addEventListener('submit', function(e) {
            e.preventDefault();

            // Check if at least one character is selected
            const selectedCharacters = document.querySelectorAll('.character-checkbox:checked');
            const characterSelectionError = document.getElementById('characterSelectionError');

            if (selectedCharacters.length !== 1) {
                if (characterSelectionError) {
                    characterSelectionError.style.display = 'block';
                    characterSelectionError.textContent = 'Please select a character for your story';
                    window.scrollTo(0, 0);
                }
                UIUtils.showToast('Selection Needed', 'Please select a character before continuing');
                return;
            }

            // Hide error message if shown
            if (characterSelectionError) {
                characterSelectionError.style.display = 'none';
            }

            // Update selected images input
            CharacterManager.updateSelectedImagesInput();

            // Submit the form
            const formData = new FormData(this);
            StoryManager.generateStory(formData)
                .catch(error => {
                    console.error('Story generation failed:', error);
                });
        });
    }

    // Story choice form submission - use delegated event handling to prevent duplicates
    document.addEventListener('submit', function(e) {
        // Only process choice forms
        if (!e.target.classList.contains('choice-form')) return;
        e.preventDefault();
        
        StoryManager.processChoice(e.target)
            .catch(error => {
                console.error('Choice processing failed:', error);
            });
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

    // Trade form handling
    const tradeForm = document.getElementById('tradeForm');
    if (tradeForm) {
        tradeForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const fromCurrency = document.getElementById('fromCurrency').value;
            const toCurrency = document.getElementById('toCurrency').value;
            const amount = parseInt(document.getElementById('tradeAmount').value);

            CurrencyManager.processTradeRequest(fromCurrency, toCurrency, amount)
                .then(() => {
                    // Reset form
                    document.getElementById('tradeAmount').value = '';

                    // Close modal
                    const modal = bootstrap.Modal.getInstance(document.getElementById('tradeModal'));
                    if (modal) {
                        modal.hide();
                    }
                })
                .catch(error => {
                    console.error('Trade request failed:', error);
                });
        });
    }

    // Handle character offer trade buttons
    document.addEventListener('click', function(e) {
        if (!e.target.matches('.accept-trade-btn')) return;
        
        const fromCurrency = e.target.dataset.from;
        const toCurrency = e.target.dataset.to;
        const rate = parseFloat(e.target.dataset.rate);

        // Default to 1 unit if rate is not a number
        const amount = 1;

        CurrencyManager.processTradeRequest(fromCurrency, toCurrency, amount)
            .then(() => {
                // Hide the trade offer
                const tradeOffer = document.querySelector('.currency-trade-offer');
                if (tradeOffer) {
                    tradeOffer.style.display = 'none';
                }
            })
            .catch(error => {
                console.error('Trade offer acceptance failed:', error);
            });
    });

    // Handle mission details button click
    document.addEventListener('click', function(e) {
        if (!e.target.matches('.mission-details-btn')) return;
        
        const missionId = e.target.dataset.missionId;
        MissionManager.loadMissionDetails(missionId)
            .catch(error => {
                console.error('Failed to load mission details:', error);
            });
    });

    // Handle mission completion button
    document.addEventListener('click', function(e) {
        if (!e.target.matches('#completeBtn')) return;
        
        const missionId = e.target.dataset.missionId;
        MissionManager.completeMission(missionId)
            .catch(error => {
                console.error('Failed to complete mission:', error);
            });
    });

    // Handle mission failure button
    document.addEventListener('click', function(e) {
        if (!e.target.matches('#failBtn')) return;
        
        const missionId = e.target.dataset.missionId;
        MissionManager.failMission(missionId)
            .catch(error => {
                console.error('Failed to fail mission:', error);
            });
    });

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
}

// Initialize on document ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize UI components
    setupEventHandlers();
    
    // Highlight characters in story
    CharacterManager.highlightCharactersInStory();
    
    // Check radio buttons on page load to restore selection state
    const characterCheckboxes = document.querySelectorAll('.character-checkbox');
    const characterCards = document.querySelectorAll('.character-select-card');
    
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
    
    // Initialize PayPal
    console.log('DOM loaded, checking PayPal integration...');
    // Give PayPal SDK a moment to load
    setTimeout(() => {
        PaymentManager.initializePayPal();
    }, 1000);
});
