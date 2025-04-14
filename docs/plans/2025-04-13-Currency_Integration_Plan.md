# Premium Currency Game Loop Integration Plan
*2025-04-13*

## Current Status
The Premium Currency Game Loop is partially implemented:
- Currency storage is properly set up (💎, 💷, 💶, 💴, 💵)
- Transaction validation functions exist in currency_utils.py
- StoryChoice model has currency_requirements field
- UI support exists in templates

## Missing Components
1. **Currency Validation at Choice Selection**:
   - `/make_choice` route in main_routes.py does not validate or deduct currency
   - No connection between 💎 cost and mission completion/failure

2. **AI Slop in user.py**:
   - Experience/leveling system (marked as DEPRECATED)
   - Unused methods need cleanup

## Implementation Plan

### Phase 1: Fix Currency Validation in main_routes.py
1. Modify the `/make_choice` route to:
   - Retrieve selected choice's currency requirements
   - Validate user has sufficient currency
   - Deduct currency before processing the choice
   - Only call game_engine.make_choice() if validation passes

### Phase 2: Refactor user.py
1. Remove deprecated experience/level system:
   - Comment out (not delete) the `add_experience_points` method
   - Clean up related code marked as "AI Slop"

### Risk Mitigation
- Transaction code in a try/except block with rollback support
- Clear error messages about insufficient currency
- Comment out rather than delete code to maintain references

## Success Indicators
- Currency requirements checked before choice processing
- Currency deducted when making choices
- Premium choices (💎) properly gate mission progression
- Mission outcomes tied to premium choice paths
