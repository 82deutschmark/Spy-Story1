
// UserProgress.js - Handles displaying and updating user progress information

class UserProgress {
    constructor() {
        this.progressModal = document.getElementById('progressModal');
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Update progress data when modal is opened
        if (this.progressModal) {
            this.progressModal.addEventListener('show.bs.modal', () => {
                this.fetchAndUpdateProgressData();
            });
        }

        // Listen for mission detail button clicks
        document.addEventListener('click', (event) => {
            if (event.target.classList.contains('mission-details-btn') || 
                event.target.closest('.mission-details-btn')) {
                const button = event.target.closest('.mission-details-btn');
                const missionId = button.dataset.missionId;
                this.showMissionDetails(missionId);
            }
        });
    }

    fetchAndUpdateProgressData() {
        // Fetch the latest user progress data
        fetch('/api/user-progress')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to fetch user progress');
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    this.updateProgressUI(data.user_progress);
                }
            })
            .catch(error => {
                console.error('Error fetching user progress:', error);
            });
    }

    updateProgressUI(progressData) {
        // Update player stats
        this.updateElement('level', progressData.level);
        this.updateElement('experience_points', progressData.experience_points);
        this.updateElement('next_level', Math.floor(progressData.experience_points / 100) + 1);
        
        // Update XP progress bar
        const xpPercentage = progressData.experience_points % 100;
        const progressBar = document.querySelector('#progressModal .progress-bar');
        if (progressBar) {
            progressBar.style.width = `${xpPercentage}%`;
            progressBar.setAttribute('aria-valuenow', xpPercentage);
            progressBar.textContent = `${xpPercentage}%`;
        }
        
        // Update choices made count
        const choicesMade = progressData.choice_history ? progressData.choice_history.length : 0;
        this.updateElement('choices_made', choicesMade);
        
        // Update currency balances
        this.updateCurrencyBalances(progressData.currency_balances);
        
        // Update character relationships
        this.updateCharacterRelationships(progressData.encountered_characters);
        
        // Update plot arcs
        this.updatePlotArcs(progressData.active_plot_arcs);
        
        // Update missions
        this.updateMissions(progressData.active_missions);
    }
    
    updateElement(dataName, value) {
        const elements = document.querySelectorAll(`[data-progress="${dataName}"]`);
        elements.forEach(element => {
            element.textContent = value;
        });
    }
    
    updateCurrencyBalances(balances) {
        const currencyContainer = document.querySelector('#progressModal .currency-dashboard');
        if (!currencyContainer || !balances) return;
        
        let html = '';
        for (const [currency, amount] of Object.entries(balances)) {
            const currencyName = this.getCurrencyName(currency);
            html += `
            <div class="currency-dashboard-item">
                <div class="currency-icon">${currency}</div>
                <div class="currency-details">
                    <div class="currency-name">${currencyName}</div>
                    <div class="currency-value">${amount}</div>
                </div>
            </div>`;
        }
        currencyContainer.innerHTML = html;
    }
    
    getCurrencyName(currency) {
        const names = {
            '💎': 'Diamonds',
            '💷': 'Pounds',
            '💶': 'Euros',
            '💴': 'Yen',
            '💵': 'Dollars'
        };
        return names[currency] || currency;
    }
    
    updateCharacterRelationships(characters) {
        const container = document.querySelector('#progressModal .card-header:contains("Character Relationships")').closest('.card').querySelector('.card-body');
        if (!container || !characters || Object.keys(characters).length === 0) {
            container.innerHTML = '<p class="text-muted">You haven\'t established relationships with any characters yet.</p>';
            return;
        }
        
        let html = '<div class="row">';
        for (const [charId, charData] of Object.entries(characters)) {
            let relationshipText, relationshipClass;
            
            if (charData.relationship_level > 7) {
                relationshipText = 'Excellent';
                relationshipClass = 'text-success';
            } else if (charData.relationship_level > 3) {
                relationshipText = 'Good';
                relationshipClass = 'text-primary';
            } else if (charData.relationship_level > 0) {
                relationshipText = 'Neutral';
                relationshipClass = 'text-info';
            } else if (charData.relationship_level > -4) {
                relationshipText = 'Poor';
                relationshipClass = 'text-warning';
            } else {
                relationshipText = 'Hostile';
                relationshipClass = 'text-danger';
            }
            
            html += `
            <div class="col-md-4 mb-3">
                <div class="card h-100">
                    <div class="card-body">
                        <h5 class="card-title">${charData.name}</h5>
                        <p class="card-text">
                            <strong>Relationship:</strong> 
                            <span class="${relationshipClass}">${relationshipText} (${charData.relationship_level})</span>
                        </p>
                        <p class="card-text"><small class="text-muted">Encounters: ${charData.encounters_count}</small></p>
                    </div>
                </div>
            </div>`;
        }
        html += '</div>';
        container.innerHTML = html;
    }
    
    updatePlotArcs(arcs) {
        const container = document.querySelector('#progressModal .card-header:contains("Active Plot Arcs")').closest('.card').querySelector('.card-body');
        if (!container || !arcs || arcs.length === 0) {
            container.innerHTML = '<p class="text-muted">No active plot arcs.</p>';
            return;
        }
        
        let html = '<ul class="list-group">';
        for (const arcId of arcs) {
            html += `<li class="list-group-item">Plot Arc #${arcId}</li>`;
        }
        html += '</ul>';
        container.innerHTML = html;
    }
    
    updateMissions(missions) {
        const container = document.querySelector('#progressModal .card-header:contains("Active Missions")').closest('.card').querySelector('.card-body');
        if (!container || !missions || missions.length === 0) {
            container.innerHTML = '<p class="text-muted">No active missions.</p>';
            return;
        }
        
        let html = '<div class="list-group">';
        for (const missionId of missions) {
            const progressPercentage = missionId % 100; // Temporary calculation for display
            html += `
            <div class="list-group-item">
                <h6 class="mb-1">Mission #${missionId}</h6>
                <div class="progress mb-2" style="height: 10px;">
                    <div class="progress-bar bg-success" role="progressbar" style="width: ${progressPercentage}%" 
                        aria-valuenow="${progressPercentage}" aria-valuemin="0" aria-valuemax="100">
                    </div>
                </div>
                <button class="btn btn-sm btn-outline-primary mission-details-btn" data-mission-id="${missionId}">
                    View Details
                </button>
            </div>`;
        }
        html += '</div>';
        container.innerHTML = html;
    }
    
    showMissionDetails(missionId) {
        const modal = document.getElementById('missionDetailsModal');
        if (!modal) return;
        
        // Show loading state
        document.querySelector('.mission-loading').style.display = 'block';
        document.querySelector('.mission-content').style.display = 'none';
        
        // Open the modal
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
        
        // Fetch mission details
        fetch(`/api/mission/${missionId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to fetch mission details');
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    this.displayMissionDetails(data.mission);
                }
            })
            .catch(error => {
                console.error('Error fetching mission details:', error);
                document.querySelector('.mission-loading').innerHTML = `
                    <div class="alert alert-danger">
                        Failed to load mission details: ${error.message}
                    </div>`;
            });
    }
    
    displayMissionDetails(mission) {
        // Hide loading, show content
        document.querySelector('.mission-loading').style.display = 'none';
        document.querySelector('.mission-content').style.display = 'block';
        
        // Update mission details
        document.getElementById('missionDetailTitle').textContent = mission.title || 'Mission Details';
        document.getElementById('missionObjective').textContent = mission.objective || 'Complete the mission';
        document.getElementById('missionDescription').textContent = mission.description || 'No description available';
        document.getElementById('missionDifficulty').textContent = mission.difficulty || 'Medium';
        document.getElementById('missionStatus').textContent = mission.status || 'Active';
        document.getElementById('missionDeadline').textContent = mission.deadline || 'None';
        document.getElementById('missionReward').textContent = mission.reward || 'Unknown';
        document.getElementById('missionGiver').textContent = mission.giver || 'Unknown';
        document.getElementById('missionTarget').textContent = mission.target || 'Unknown';
        
        // Update progress bar
        const progressBar = document.getElementById('missionProgressBar');
        const progress = mission.progress || 0;
        progressBar.style.width = `${progress}%`;
        progressBar.setAttribute('aria-valuenow', progress);
        progressBar.textContent = `${progress}%`;
        
        // Update progress updates list
        const updatesList = document.getElementById('progressUpdatesList');
        if (mission.updates && mission.updates.length > 0) {
            let html = '';
            for (const update of mission.updates) {
                html += `
                <div class="list-group-item">
                    <div class="d-flex justify-content-between">
                        <h6 class="mb-1">${update.title}</h6>
                        <small>${update.date}</small>
                    </div>
                    <p class="mb-1">${update.description}</p>
                </div>`;
            }
            updatesList.innerHTML = html;
        } else {
            updatesList.innerHTML = '<div class="list-group-item">No progress updates available</div>';
        }
    }
}

// Export the class
export default UserProgress;
