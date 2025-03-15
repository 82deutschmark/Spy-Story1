/**
 * EventHandlers.js - Core event handling for the application
 */

// Create EventHandlers object
const EventHandlers = {
    initialize() {
        console.log('EventHandlers properly initialized');
        this.setupEventListeners();
    },

    setupEventListeners() {
        // Setup core event listeners
        document.addEventListener('DOMContentLoaded', () => {
            console.log('DOM fully loaded - setting up event handlers');
            this.setupFormHandlers();
            this.setupCharacterSelection();
            this.setupUIInteractions();
        });
    },

    setupFormHandlers() {
        // Handle form submissions
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            form.addEventListener('submit', this.handleFormSubmit);
        });
    },

    handleFormSubmit(event) {
        // Prevent default form submission
        event.preventDefault();
        console.log('Form submitted:', event.target.id);
        // Process form data here
    },

    setupCharacterSelection() {
        // Setup character selection functionality
        const characterElements = document.querySelectorAll('.character-select');
        characterElements.forEach(element => {
            element.addEventListener('click', this.handleCharacterSelect);
        });
    },

    handleCharacterSelect(event) {
        // Handle character selection
        const characterId = event.currentTarget.dataset.characterId;
        console.log('Character selected:', characterId);
        // Additional character selection logic
    },

    setupUIInteractions() {
        // Setup other UI interactions
        console.log('Setting up additional UI interactions');
    }
};

// Export as ES module (named and default export)
export { EventHandlers };
export default EventHandlers;