# Premium Currency UI Integration Plan
*2025-04-14*

## Current UI Structure Analysis

The existing UI already has several components we can leverage:

1. **Currency Display**: 
   - A currency display exists in the user-progress-panel: `<p><strong>Currency:</strong> <span id="currency-display">Loading...</span></p>`
   - Currently not fully implemented in JavaScript

2. **Choice Buttons**: 
   - The storyboard template includes data attributes for currency requirements: `{% if choice.currency_requirements %}data-currency-req='{{ choice.currency_requirements|tojson }}'{% endif %}`
   - UI feedback for insufficient currency is not implemented

3. **Choice Handler**:
   - Already handles AJAX submissions for choices
   - Receives and processes server responses
   - No specific handling for currency errors (402 Payment Required)

4. **UserProgress Module**:
   - Has placeholder for updating currency: `updateUserCurrency()` but not implemented
   - Contains methods for mission progress tracking

## Integration Plan

### 1. Enhance Currency Display Component

- Update the currency-display element to show all currency types with amounts
- Add visual distinction for premium currency (💎)
- Create proper initialization in UserProgressManager.js

### 2. Add Visual Currency Requirements to Choice Buttons

- Add visual indicators on choice buttons to show currency costs
- Create different styling for premium (💎) currency choices
- Add tooltip or info message explaining premium choices advance missions

### 3. Implement Proper Currency Error Handling

- Modify ChoiceHandler.js to handle 402 Payment Required responses
- Display user-friendly insufficient currency messages
- Add option to purchase premium currency (placeholder for future monetization)

### 4. Update the UserProgress Currency Functions

- Implement the `updateUserCurrency()` method in UserProgress.js
- Add currency change animation for clearer feedback
- Track and display currency transaction history

### 5. Create Currency-Mission Connection UI 

- Update mission display to show which choices require premium currency
- Highlight the mission success/failure paths that involve premium currency
- Add UI elements explaining the connection between premium choices and mission outcomes

## Implementation Steps

1. **Update UserProgress.js**:
   - Implement updateUserCurrency() to handle server currency updates
   - Add refreshCurrencyDisplay() to update the UI after transactions

2. **Enhance ChoiceHandler.js**:
   - Add specific error handling for 402 Payment Required responses
   - Create visual feedback for currency costs on choice buttons

3. **Add CSS Styling**:
   - Create styles for currency displays and indicators
   - Add feedback animations for currency changes

4. **Update Mission Display**:
   - Enhance mission UI to show premium choice requirements

This implementation will leverage the existing code structure without creating new files, focusing on enhancing what's already there for a seamless user experience.
