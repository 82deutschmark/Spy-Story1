
/**
 * User Progress Module
 * Manages user level and experience data
 */
export default {
    /**
     * Updates user progress displays
     * @param {number} level - User level
     * @param {number} experience - User experience points
     * @param {Object} currencies - User currency balances
     * @param {Array} choiceHistory - User's story choice history
     * @param {Object} characters - User's encountered characters
     * @param {Array} activePlotArcs - User's active plot arcs
     * @param {Array} activeMissions - User's active missions
     */
    updateUserProgress(level, experience, currencies, choiceHistory, characters, activePlotArcs, activeMissions) {
        console.log("Updating user progress UI", { level, experience, currencies });
        
        // Don't require all parameters to update what we have
        if (!level && !experience && !currencies) return;

        // Update level display in header/navbar
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

        // Update currency displays in header/navbar
        if (currencies) {
            for (const [currency, amount] of Object.entries(currencies)) {
                const currencyElement = document.querySelector(`.currency-${currency}`);
                if (currencyElement) {
                    currencyElement.textContent = `${currency}: ${amount}`;
                }
            }
        }

        // Update progress modal if open
        const progressModal = document.getElementById('progressModal');
        if (progressModal) {
            // Update player stats
            if (level || experience) {
                const statsElements = progressModal.querySelectorAll('.card-body strong');
                statsElements.forEach(elem => {
                    // Update level
                    if (elem.textContent === 'Level:' && level) {
                        const nextNode = elem.nextSibling;
                        if (nextNode) {
                            nextNode.textContent = ` ${level}`;
                        }
                    }
                    
                    // Update experience
                    if (elem.textContent === 'XP:' && experience) {
                        const nextNode = elem.nextSibling;
                        if (nextNode) {
                            nextNode.textContent = ` ${experience}`;
                        }
                    }
                    
                    // Update next level
                    if (elem.textContent === 'Next Level:' && experience) {
                        const nextNode = elem.nextSibling;
                        if (nextNode) {
                            nextNode.textContent = ` ${Math.floor(experience / 100) + 1}`;
                        }
                    }
                });
            }
            
            // Update currency balances
            if (currencies) {
                const currencyContainer = progressModal.querySelector('.currency-balances');
                if (currencyContainer) {
                    currencyContainer.innerHTML = '';
                    for (const [currency, amount] of Object.entries(currencies)) {
                        const currencyElement = document.createElement('div');
                        currencyElement.className = 'mb-2';
                        currencyElement.innerHTML = `<strong>${currency}:</strong> ${amount}`;
                        currencyContainer.appendChild(currencyElement);
                    }
                }
            }
            
            // Update character relationships if data is provided
            if (characters) {
                const charContainer = progressModal.querySelector('.character-relationships');
                if (charContainer) {
                    charContainer.innerHTML = '';
                    
                    if (Object.keys(characters).length === 0) {
                        charContainer.innerHTML = '<p>No character relationships yet.</p>';
                    } else {
                        for (const [charId, charData] of Object.entries(characters)) {
                            const charElement = document.createElement('div');
                            charElement.className = 'mb-3 char-relationship';
                            charElement.innerHTML = `
                                <h6>${charData.name}</h6>
                                <div class="progress mb-1">
                                    <div class="progress-bar ${this.getRelationshipColorClass(charData.relationship_level)}" 
                                         style="width: ${Math.min(100, Math.max(0, charData.relationship_level + 50))}%">
                                        ${charData.relationship_level}
                                    </div>
                                </div>
                                <div class="small text-muted">Encounters: ${charData.encounters_count}</div>
                            `;
                            charContainer.appendChild(charElement);
                        }
                    }
                }
            }
            
            // Update choice history if data is provided
            if (choiceHistory && choiceHistory.length > 0) {
                const choicesContainer = progressModal.querySelector('.choice-history');
                if (choicesContainer) {
                    choicesContainer.innerHTML = '';
                    
                    // Only show last 5 choices
                    const recentChoices = choiceHistory.slice(-5).reverse();
                    
                    recentChoices.forEach(choice => {
                        const choiceElement = document.createElement('div');
                        choiceElement.className = 'mb-2 p-2 border rounded';
                        
                        // Format timestamp
                        let timestamp = 'Unknown time';
                        try {
                            const date = new Date(choice.timestamp);
                            timestamp = date.toLocaleString();
                        } catch (e) {
                            console.error('Error parsing choice timestamp', e);
                        }
                        
                        choiceElement.innerHTML = `
                            <div class="choice-text">${choice.choice_text}</div>
                            <div class="small text-muted mt-1">${timestamp}</div>
                        `;
                        choicesContainer.appendChild(choiceElement);
                    });
                }
            }
        }
    },
    
    /**
     * Gets CSS class for relationship level
     * @param {number} level - Relationship level value 
     * @returns {string} - CSS class name
     */
    getRelationshipColorClass(level) {
        if (level < -25) return 'bg-danger';
        if (level < 0) return 'bg-warning';
        if (level > 25) return 'bg-success';
        return 'bg-info';
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
