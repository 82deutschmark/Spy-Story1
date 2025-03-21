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

import CharacterMentions from '/static/js/modules/CharacterMentions.js';
import ChoiceHandler from '/static/js/modules/ChoiceHandler.js';

class StoryboardEnhanced {
    constructor() {
        // References to existing modules
        this.characterMentions = null;
        this.choiceHandler = null;
        
        // DOM elements
        this.storyContent = null;
        this.characterGallery = null;
        this.charactersGrid = null;
        this.galleryToggle = null;
        
        // Bind methods to this
        this.handleGalleryToggle = this.handleGalleryToggle.bind(this);
        this.handleCharacterPortraitClick = this.handleCharacterPortraitClick.bind(this);
        this.highlightCharactersInText = this.highlightCharactersInText.bind(this);
        this.fadeInChoices = this.fadeInChoices.bind(this);
        this.setupParallaxEffect = this.setupParallaxEffect.bind(this);
        this.setupScrollHighlighting = this.setupScrollHighlighting.bind(this);
    }

    /**
     * Initialize the enhanced storyboard
     */
    initialize() {
        // Initialize existing modules if available
        if (typeof CharacterMentions === 'function') {
            this.characterMentions = new CharacterMentions();
            this.characterMentions.initialize();
        }
        
        if (typeof ChoiceHandler === 'function') {
            this.choiceHandler = new ChoiceHandler();
            this.choiceHandler.initialize();
        }
        
        // Get DOM elements
        this.storyContent = document.getElementById('story-content-text');
        this.characterGallery = document.querySelector('.character-gallery');
        this.charactersGrid = document.querySelector('.character-portraits-grid');
        this.galleryToggle = document.querySelector('.btn-collapse-gallery');
        
        if (this.galleryToggle && this.characterGallery) {
            this.galleryToggle.addEventListener('click', this.handleGalleryToggle);
        }
        
        // Setup character portrait clicks
        const portraits = document.querySelectorAll('.character-portrait-item');
        portraits.forEach(portrait => {
            portrait.addEventListener('click', this.handleCharacterPortraitClick);
        });
        
        // Setup enhanced functionality
        this.setupParallaxEffect();
        this.setupScrollHighlighting();
        this.highlightCharactersInText();
        this.fadeInChoices();
        this.setupAccessibility();
        
        // Scroll story content to bottom if it contains new content
        if (this.storyContent) {
            const scrollContainer = document.querySelector('.story-scroll-container');
            if (scrollContainer) {
                scrollContainer.scrollTop = 0; // Start at the top for new story segments
            }
        }
    }

    /**
     * Toggle character gallery on mobile
     */
    handleGalleryToggle(event) {
        const header = event.currentTarget.closest('.gallery-header');
        if (header) {
            header.classList.toggle('active');
            
            // Toggle icon
            const icon = this.galleryToggle.querySelector('i');
            if (icon) {
                if (header.classList.contains('active')) {
                    icon.classList.remove('fa-chevron-down');
                    icon.classList.add('fa-chevron-up');
                } else {
                    icon.classList.remove('fa-chevron-up');
                    icon.classList.add('fa-chevron-down');
                }
            }
        }
    }

    /**
     * Handle clicks on character portraits
     */
    handleCharacterPortraitClick(event) {
        const portrait = event.currentTarget;
        const characterName = portrait.dataset.characterName;
        
        // Remove highlight from all portraits
        document.querySelectorAll('.character-portrait-item').forEach(p => {
            p.classList.remove('highlighted');
        });
        
        // Add highlight to clicked portrait
        portrait.classList.add('highlighted');
        
        // Find and highlight character mentions in text
        if (this.storyContent && characterName) {
            // Convert dataset format (kebab-case) to regular name format with spaces
            const displayName = characterName.replace(/-/g, ' ')
                                            .replace(/\b\w/g, l => l.toUpperCase());
            
            // Find mentions in text
            const mentions = this.storyContent.querySelectorAll('.character-mention');
            let foundMention = false;
            
            mentions.forEach(mention => {
                if (mention.textContent.trim() === displayName) {
                    // Scroll to the mention
                    mention.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    
                    // Add highlight animation
                    mention.classList.add('highlight-pulse');
                    setTimeout(() => {
                        mention.classList.remove('highlight-pulse');
                    }, 2000);
                    
                    foundMention = true;
                }
            });
            
            // If character not found in text, show a small feedback toast
            if (!foundMention) {
                this.showFeedbackToast(`${displayName} doesn't appear in this part of the story.`);
            }
        }
    }

    /**
     * Show a small feedback toast message
     */
    showFeedbackToast(message, duration = 3000) {
        // Create toast container if it doesn't exist
        let toastContainer = document.querySelector('.feedback-toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'feedback-toast-container';
            document.body.appendChild(toastContainer);
            
            // Add styles if not already in CSS
            const style = document.createElement('style');
            style.textContent = `
                .feedback-toast-container {
                    position: fixed;
                    bottom: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    z-index: 9999;
                }
                .feedback-toast {
                    background: rgba(0, 0, 0, 0.7);
                    color: white;
                    padding: 10px 20px;
                    border-radius: 20px;
                    margin-top: 10px;
                    font-size: 14px;
                    opacity: 0;
                    transform: translateY(20px);
                    transition: all 0.3s ease;
                }
                .feedback-toast.visible {
                    opacity: 1;
                    transform: translateY(0);
                }
            `;
            document.head.appendChild(style);
        }
        
        // Create and show the toast
        const toast = document.createElement('div');
        toast.className = 'feedback-toast';
        toast.textContent = message;
        toastContainer.appendChild(toast);
        
        // Trigger animation
        setTimeout(() => {
            toast.classList.add('visible');
        }, 10);
        
        // Remove after duration
        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, duration);
    }

    /**
     * Process text nodes to highlight character names
     */
    highlightCharactersInText() {
        // If CharacterMentions is already handling this, we don't need to duplicate
        if (this.characterMentions) return;
        
        // Only proceed if we have both story content and character portraits
        if (!this.storyContent || !this.charactersGrid) return;
        
        // Get all character names from portrait items
        const characters = Array.from(document.querySelectorAll('.character-portrait-item')).map(portrait => ({
            name: portrait.querySelector('.portrait-name').textContent.trim(),
            id: portrait.dataset.characterName,
            element: portrait,
            image: portrait.querySelector('.character-portrait-img').src
        }));
        
        // Sort by name length (longest first) to avoid partial matches
        characters.sort((a, b) => b.name.length - a.name.length);
        
        // Create a temporary container to process the HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(this.storyContent.innerHTML, 'text/html');
        
        // Process text nodes to add highlighting
        function processNode(node) {
            if (node.nodeType === Node.TEXT_NODE) {
                let text = node.textContent;
                let lastIndex = 0;
                let fragments = [];
                
                characters.forEach(character => {
                    const regex = new RegExp(`\\b${character.name}\\b`, 'g');
                    let match;
                    
                    while ((match = regex.exec(text)) !== null) {
                        // Add text before match
                        if (match.index > lastIndex) {
                            fragments.push(text.substring(lastIndex, match.index));
                        }
                        
                        // Add highlighted character name
                        fragments.push(`<span class="character-mention" data-character="${character.id}">${match[0]}<span class="character-tooltip"><img src="${character.image}" alt="${match[0]}"><div>${match[0]}</div></span></span>`);
                        
                        lastIndex = regex.lastIndex;
                    }
                });
                
                // Add remaining text
                if (lastIndex < text.length) {
                    fragments.push(text.substring(lastIndex));
                }
                
                if (fragments.length > 1) {
                    const span = document.createElement('span');
                    span.innerHTML = fragments.join('');
                    node.parentNode.replaceChild(span, node);
                }
            } else {
                // Skip processing existing character mentions
                if (node.classList && node.classList.contains('character-mention')) {
                    return;
                }
                
                // Process child nodes
                Array.from(node.childNodes).forEach(child => processNode(child));
            }
        }
        
        // Process the document
        processNode(doc.body);
        
        // Update the story content
        this.storyContent.innerHTML = doc.body.innerHTML;
        
        // Add click handlers to mentions
        this.storyContent.querySelectorAll('.character-mention').forEach(mention => {
            mention.addEventListener('click', event => {
                const characterId = event.currentTarget.dataset.character;
                const targetPortrait = document.querySelector(`.character-portrait-item[data-character-name="${characterId}"]`);
                
                // Remove highlight from all portraits
                document.querySelectorAll('.character-portrait-item').forEach(p => {
                    p.classList.remove('highlighted');
                });
                
                // Highlight target portrait
                if (targetPortrait) {
                    targetPortrait.classList.add('highlighted');
                    targetPortrait.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    
                    // Remove highlight after delay
                    setTimeout(() => {
                        targetPortrait.classList.remove('highlighted');
                    }, 3000);
                }
            });
        });
    }

    /**
     * Add fade-in animation to choices
     */
    fadeInChoices() {
        const choices = document.querySelectorAll('.choice-btn');
        choices.forEach((choice, index) => {
            choice.style.opacity = '0';
            choice.style.transform = 'translateY(20px)';
            choice.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            
            // Stagger the animations
            setTimeout(() => {
                choice.style.opacity = '1';
                choice.style.transform = 'translateY(0)';
            }, 100 + (index * 150));
        });
    }

    /**
     * Set up subtle parallax effect for background
     */
    setupParallaxEffect() {
        const background = document.querySelector('.story-background');
        if (!background) return;
        
        // Subtle parallax on scroll
        window.addEventListener('scroll', () => {
            const scrollPosition = window.scrollY;
            background.style.transform = `scale(1.1) translateY(${scrollPosition * 0.05}px)`;
        });
    }

    /**
     * Setup scroll highlighting for story content
     */
    setupScrollHighlighting() {
        const scrollContainer = document.querySelector('.story-scroll-container');
        if (!scrollContainer) return;
        
        // Update progress bar as user scrolls
        const progressBar = document.querySelector('.story-progress-indicator .progress-bar');
        if (progressBar) {
            scrollContainer.addEventListener('scroll', () => {
                const scrollPercentage = (scrollContainer.scrollTop / (scrollContainer.scrollHeight - scrollContainer.clientHeight)) * 100;
                progressBar.style.width = `${Math.min(scrollPercentage, 100)}%`;
            });
        }
        
        // Add smooth scroll behavior
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                
                document.querySelector(this.getAttribute('href')).scrollIntoView({
                    behavior: 'smooth'
                });
            });
        });
    }

    /**
     * Setup accessibility enhancements
     */
    setupAccessibility() {
        // Add ARIA attributes to improve screen reader experience
        const choiceButtons = document.querySelectorAll('.choice-btn');
        choiceButtons.forEach((button, index) => {
            button.setAttribute('aria-labelledby', `choice-${index}-text`);
            
            const choiceText = button.querySelector('.choice-text');
            if (choiceText) {
                choiceText.id = `choice-${index}-text`;
            }
            
            const consequence = button.querySelector('.choice-consequence');
            if (consequence) {
                consequence.id = `choice-${index}-consequence`;
                button.setAttribute('aria-describedby', `choice-${index}-consequence`);
            }
        });
        
        // Add focus indicators
        const style = document.createElement('style');
        style.textContent = `
            .choice-btn:focus-visible {
                outline: 3px solid var(--primary-color);
                outline-offset: 2px;
            }
            
            .character-portrait-item:focus-visible {
                outline: 3px solid var(--primary-color);
                outline-offset: 2px;
            }
        `;
        document.head.appendChild(style);
    }
}

// Initialize the enhanced storyboard
document.addEventListener('DOMContentLoaded', () => {
    const storyboardEnhanced = new StoryboardEnhanced();
    storyboardEnhanced.initialize();
});

export default StoryboardEnhanced;