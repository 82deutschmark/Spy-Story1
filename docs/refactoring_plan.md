# Route Refactoring Plan

## Current File Analysis

### Key Files:
1. `routes/main_routes.py`: Web UI routes
2. `routes/api_routes.py`: API endpoints
3. `services/game_engine.py`: Core game logic
4. `services/story_maker.py`: Story generation
5. `services/segment_maker.py`: Story continuation
6. `services/state_manager.py`: Game state management

### Current Architecture Issues:
1. Direct dependency between API and Web routes
2. Shared business logic mixed with route handlers
3. Session management scattered across routes
4. Duplicated story generation logic

## Proposed Service Layer

### 1. New Service Files to Create:
- `services/story_service.py`: Story generation and choice handling
- `services/session_service.py`: Session management
- `services/user_service.py`: User progress and state
- `services/character_service.py`: Character management

### 2. Service Responsibilities:
- **StoryService**:
  - Story generation
  - Choice processing
  - Mission updates
  - Story continuation
  
- **SessionService**:
  - Session handling
  - User state management
  - Progress tracking
  
- **UserService**:
  - User progress
  - Currency management
  - Mission tracking
  
- **CharacterService**:
  - Character selection
  - Character relationships
  - Character evolution

## Implementation Phases

### Phase 1: Create Service Layer
1. Create new service files
2. Move shared logic to services
3. Ensure no Flask dependencies in services
4. Add comprehensive error handling

### Phase 2: Refactor API Routes
1. Remove dependency on main_routes
2. Use new service layer
3. Standardize JSON responses
4. Add proper error handling

### Phase 3: Refactor Web Routes
1. Move business logic to services
2. Keep only UI-specific logic
3. Standardize session handling
4. Maintain template rendering

### Phase 4: Integration
1. Update imports
2. Test all routes
3. Verify session handling
4. Check error cases

## Testing Plan
1. Write unit tests for services
2. Test API endpoints
3. Test Web UI flows
4. Verify session handling
5. Test error scenarios

## Rollback Plan
1. Keep original files until testing complete
2. Document all changes
3. Maintain backup of original structure
4. Test thoroughly before deployment

## Success Criteria
1. No cross-dependencies between routes
2. Clean service layer separation
3. Consistent error handling
4. All tests passing
5. No regression in functionality
