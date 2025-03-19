/**
 * DEPRECATED: EventHandlers.js
 * ===========================
 * 
 * This file is deprecated and has been replaced by a more modular architecture:
 * 
 * New Structure:
 * -------------
 * 1. FormHandler.js
 *    - Handles all form submissions
 *    - Manages loading states via LoadingManager
 *    - Handles errors via ErrorHandler
 *    - Manages character selection via CharacterSelector
 * 
 * 2. LoadingManager.js
 *    - Manages loading states and animations
 *    - Handles button state during form submission
 * 
 * 3. ErrorHandler.js
 *    - Centralizes error handling
 *    - Provides consistent error display
 * 
 * 4. CharacterSelector.js
 *    - Manages character selection UI
 *    - Handles character selection state
 * 
 * Migration Notes:
 * --------------
 * - All form handling is now in FormHandler.js
 * - Character selection is handled by CharacterSelector.js
 * - Loading states are managed by LoadingManager.js
 * - Error handling is centralized in ErrorHandler.js
 * 
 * Usage:
 * -----
 * The new modules are automatically initialized in main.js
 * No direct imports of this file are needed
 */

// This file is intentionally empty as it has been deprecated
// See the documentation above for the new structure 