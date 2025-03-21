/**
 * storyboard_enhanced.js - Enhanced Storyboard Experience
 * ===================================================
 * 
 * This module extends the basic storyboard functionality with improved
 * interactions, animations, and responsive design features.
 * 
 * It works alongside the existing ChoiceHandler and CharacterMentions modules
 * without adding bloat to main.js
 */

class StoryboardEnhanced {
    constructor() {
        // Configuration
        this.config = {
            characterToggleSelector: '.character-panel-toggle',
            characterPanelSelector: '.character-panel',
            characterCardSelector: '.character-card',
            characterMentionSelector: '.character-mention',
            storyContentSelector: '.story-content',
            choicesContainerSelector: '.choices-container',
            choiceButtonSelector: '.choice-btn',
            toastContainerSelector: '.toast-container',
            characterHighlightClass: 'highlighted'
        };
        
        // State
        this.state = {
            isCharacterPanelExpanded: false,
            highlightedCharacter: null,
            lastScrollPosition: 0,
            isScrolling: false
        };
        
        // Initialize
        this.initialize();
    }
    
    /**
     * Initialize the enhanced storyboard
     */
    initialize() {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('Initializing enhanced storyboard experience');
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Initialize features
            this.highlightCharactersInText();
            this.fadeInChoices();
            this.setupParallaxEffect();
            this.setupScrollHighlighting();
            this.setupAccessibility();
            
            console.log('Enhanced storyboard initialized');
        });
    }
    
    /**
     * Set up all event listeners
     */
    setupEventListeners() {
        // Character gallery toggle on mobile
        const toggleBtn = document.querySelector(this.config.characterToggleSelector);
        if (toggleBtn) {
            toggleBtn.addEventListener('click', this.handleGalleryToggle.bind(this));
        }
        
        // Character portrait click
        const characterCards = document.querySelectorAll(this.config.characterCardSelector);
        characterCards.forEach(card => {
            card.addEventListener('click', this.handleCharacterPortraitClick.bind(this));
        });
        
        // Character mention clicks
        document.addEventListener('click', (event) => {
            if (event.target.classList.contains('character-mention')) {
                this.handleCharacterMentionClick(event);
            }
        });
    }
    
    /**
     * Toggle character gallery on mobile
     */
    handleGalleryToggle(event) {
        const panel = document.querySelector(this.config.characterPanelSelector);
        panel.classList.toggle('expanded');
        this.state.isCharacterPanelExpanded = panel.classList.contains('expanded');
        
        // Update toggle button icon
        const icon = event.currentTarget.querySelector('i');
        if (icon) {
            if (this.state.isCharacterPanelExpanded) {
                icon.className = 'fas fa-chevron-up';
            } else {
                icon.className = 'fas fa-chevron-down';
            }
        }
        
        // Show feedback
        const message = this.state.isCharacterPanelExpanded ? 
            'Character gallery expanded' : 'Character gallery collapsed';
        this.showFeedbackToast(message);
    }
    
    /**
     * Handle clicks on character portraits
     */
    handleCharacterPortraitClick(event) {
        // Find the character card element
        const card = event.currentTarget.closest(this.config.characterCardSelector);
        if (!card) return;
        
        // Get character name
        const nameElement = card.querySelector('.character-name');
        const characterName = nameElement ? nameElement.textContent : null;
        
        if (!characterName) return;
        
        // Highlight character card
        this.highlightCharacter(card);
        
        // Highlight character mentions in text
        this.highlightMentionsInText(characterName);
        
        // Show feedback
        this.showFeedbackToast(`Highlighted character: ${characterName}`);
    }
    
    /**
     * Handle clicks on character mentions in story text
     */
    handleCharacterMentionClick(event) {
        const mention = event.target;
        const characterName = mention.textContent.trim();
        
        // Find matching character card
        const characterCards = document.querySelectorAll(this.config.characterCardSelector);
        characterCards.forEach(card => {
            const nameElement = card.querySelector('.character-name');
            if (nameElement && nameElement.textContent.trim() === characterName) {
                // Highlight character card
                this.highlightCharacter(card);
                
                // Scroll to character card if not visible
                card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        });
        
        // Highlight all mentions of this character in text
        this.highlightMentionsInText(characterName);
    }
    
    /**
     * Highlight a character card and remove highlight from others
     */
    highlightCharacter(cardElement) {
        // Remove highlight from all cards
        const allCards = document.querySelectorAll(this.config.characterCardSelector);
        allCards.forEach(card => {
            card.classList.remove(this.config.characterHighlightClass);
        });
        
        // Add highlight to selected card
        cardElement.classList.add(this.config.characterHighlightClass);
        
        // Update state
        this.state.highlightedCharacter = cardElement.querySelector('.character-name').textContent;
    }
    
    /**
     * Highlight all mentions of a character in the story text
     */
    highlightMentionsInText(characterName) {
        const mentions = document.querySelectorAll(this.config.characterMentionSelector);
        mentions.forEach(mention => {
            if (mention.textContent.trim() === characterName) {
                mention.classList.add(this.config.characterHighlightClass);
            } else {
                mention.classList.remove(this.config.characterHighlightClass);
            }
        });
    }
    
    /**
     * Show a small feedback toast message
     */
    showFeedbackToast(message, duration = 3000) {
        // Find or create toast container
        let toastContainer = document.querySelector(this.config.toastContainerSelector);
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container';
            document.body.appendChild(toastContainer);
        }
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = 'toast fade-in';
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'polite');
        
        // Add toast content
        toast.innerHTML = `
            <div class="toast-body">
                ${message}
            </div>
        `;
        
        // Add to container
        toastContainer.appendChild(toast);
        
        // Auto remove after duration
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, duration);
    }
    
    /**
     * Process text nodes to highlight character names
     */
    highlightCharactersInText() {
        const storyContent = document.querySelector(this.config.storyContentSelector);
        if (!storyContent) return;
        
        // Get all character names
        const characterNames = Array.from(
            document.querySelectorAll(`${this.config.characterCardSelector} .character-name`)
        ).map(element => element.textContent.trim());
        
        // Sort by length (longest first) to ensure proper matching
        characterNames.sort((a, b) => b.length - a.length);
        
        // Process all text nodes
        const treeWalker = document.createTreeWalker(
            storyContent,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        
        const nodesToProcess = [];
        let currentNode;
        
        // Collect nodes first to avoid modification during traversal
        while (currentNode = treeWalker.nextNode()) {
            nodesToProcess.push(currentNode);
        }
        
        // Process each node
        nodesToProcess.forEach(node => {
            processNode(node);
        });
        
        // Function to process a text node
        function processNode(node) {
            if (!node.textContent.trim()) return;
            
            // Skip if parent is already a character mention
            if (node.parentNode.classList && 
                node.parentNode.classList.contains('character-mention')) {
                return;
            }
            
            let html = node.textContent;
            let replaced = false;
            
            // Replace character names with highlighted spans
            characterNames.forEach(name => {
                // Use word boundary to ensure we match whole words
                const regex = new RegExp(`\\b${name}\\b`, 'g');
                if (regex.test(html)) {
                    html = html.replace(regex, `<span class="character-mention" data-character="${name}">${name}</span>`);
                    replaced = true;
                }
            });
            
            // Only replace if we found matches
            if (replaced) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = html;
                
                // Insert all child nodes
                const fragment = document.createDocumentFragment();
                while (tempDiv.firstChild) {
                    fragment.appendChild(tempDiv.firstChild);
                }
                
                // Replace original node with our processed fragments
                node.parentNode.replaceChild(fragment, node);
            }
        }
    }
    
    /**
     * Add fade-in animation to choices
     */
    fadeInChoices() {
        const choices = document.querySelectorAll(this.config.choiceButtonSelector);
        choices.forEach((choice, index) => {
            choice.style.opacity = '0';
            setTimeout(() => {
                choice.style.opacity = '1';
                choice.classList.add('fade-in');
            }, 300 + (index * 100)); // Staggered animation
        });
    }
    
    /**
     * Set up subtle parallax effect for background
     */
    setupParallaxEffect() {
        const background = document.querySelector('.enhanced-background img');
        if (!background) return;
        
        window.addEventListener('scroll', () => {
            const scrollPosition = window.scrollY;
            const offset = scrollPosition * 0.3; // Parallax factor (adjust to taste)
            background.style.transform = `translateY(${offset}px)`;
        });
        
        window.addEventListener('mousemove', (e) => {
            const mouseX = e.clientX / window.innerWidth;
            const mouseY = e.clientY / window.innerHeight;
            const offsetX = 5 * (0.5 - mouseX);
            const offsetY = 5 * (0.5 - mouseY);
            
            background.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
        });
    }
    
    /**
     * Setup scroll highlighting for story content
     */
    setupScrollHighlighting() {
        const storyContent = document.querySelector(this.config.storyContentSelector);
        if (!storyContent) return;
        
        storyContent.addEventListener('scroll', () => {
            if (this.state.isScrolling) return;
            
            this.state.isScrolling = true;
            
            // Add active class to story content
            storyContent.classList.add('scrolling');
            
            // Add visual indicator for scroll position
            const scrollPercentage = (storyContent.scrollTop / 
                (storyContent.scrollHeight - storyContent.clientHeight)) * 100;
            
            // Show scroll position in a subtle way if needed
            
            // Remove active class after scrolling stops
            clearTimeout(this.state.scrollTimeout);
            this.state.scrollTimeout = setTimeout(() => {
                storyContent.classList.remove('scrolling');
                this.state.isScrolling = false;
            }, 100);
        });
    }
    
    /**
     * Setup accessibility enhancements
     */
    setupAccessibility() {
        // Add ARIA attributes
        const characterPanel = document.querySelector(this.config.characterPanelSelector);
        if (characterPanel) {
            characterPanel.setAttribute('role', 'region');
            characterPanel.setAttribute('aria-label', 'Character gallery');
            
            const toggle = characterPanel.querySelector(this.config.characterToggleSelector);
            if (toggle) {
                toggle.setAttribute('aria-expanded', 'false');
                toggle.setAttribute('aria-controls', 'character-grid-container');
                
                // Update aria attributes when toggled
                toggle.addEventListener('click', () => {
                    const isExpanded = characterPanel.classList.contains('expanded');
                    toggle.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
                });
            }
        }
        
        // Make choice buttons more accessible
        const choices = document.querySelectorAll(this.config.choiceButtonSelector);
        choices.forEach((choice, index) => {
            choice.setAttribute('role', 'button');
            choice.setAttribute('aria-label', `Choice ${index + 1}: ${choice.textContent.trim()}`);
            
            // Add keyboard accessibility
            choice.setAttribute('tabindex', '0');
            choice.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    choice.click();
                }
            });
        });
        
        // Add focus outline styles (already in CSS)
    }
}

// Initialize the enhanced storyboard
const storyboardEnhanced = new StoryboardEnhanced();

// Export for use in other modules if needed
export default storyboardEnhanced;