
/**
 * User Progress Module
 * Manages user level and experience data
 */
export default {
    /**
     * Updates user progress displays
     * @param {number} level - User level
     * @param {number} experience - User experience points
     */
    updateUserProgress(level, experience) {
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
            
            // After a choice, refresh the adventure progress section
            this.refreshAdventureProgress();
        }
    },
    
    /**
     * Refreshes the adventure progress section with updated data
     */
    refreshAdventureProgress() {
        // Make an AJAX call to get updated progress data
        fetch('/user-progress/current', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                this.updateAdventureUI(data.progress);
            }
        })
        .catch(error => console.error('Error refreshing adventure progress:', error));
    },
    
    /**
     * Updates the adventure progress UI elements with new data
     * @param {Object} progress - User progress data
     */
    updateAdventureUI(progress) {
        // Update active missions display
        const activeMissionsBody = document.querySelector('.card-header:contains("Active Missions")').nextElementSibling;
        if (activeMissionsBody && progress.active_missions && progress.active_missions.length > 0) {
            let missionHTML = '<ul class="list-group">';
            for (const missionId of progress.active_missions) {
                missionHTML += `<li class="list-group-item">Mission #${missionId}</li>`;
            }
            missionHTML += '</ul>';
            activeMissionsBody.innerHTML = missionHTML;
        } else if (activeMissionsBody) {
            activeMissionsBody.innerHTML = '<p class="text-muted">No active missions.</p>';
        }
        
        // Update plot arcs display
        const plotArcsBody = document.querySelector('.card-header:contains("Active Plot Arcs")').nextElementSibling;
        if (plotArcsBody && progress.active_plot_arcs && progress.active_plot_arcs.length > 0) {
            let arcsHTML = '<ul class="list-group">';
            for (const arcId of progress.active_plot_arcs) {
                arcsHTML += `<li class="list-group-item">Plot Arc #${arcId}</li>`;
            }
            arcsHTML += '</ul>';
            plotArcsBody.innerHTML = arcsHTML;
        } else if (plotArcsBody) {
            plotArcsBody.innerHTML = '<p class="text-muted">No active plot arcs.</p>';
        }
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
};
