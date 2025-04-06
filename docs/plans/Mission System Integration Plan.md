# Mission System Integration Plan

## Current State Assessment

1. Mission Architecture
- Backend has robust mission data model and management
- Frontend has mission UI components ready
- Multiple services exist but aren't fully connected

2. Key Components
- `services/mission_generator.py`: Creates and manages missions
- `UserProgress`: Handles mission tracking and rewards
- `MissionManager.js`: Frontend mission UI/interactions
- `api_routes.py`: Missing dedicated mission endpoints

3. Integration Points
- Mission creation during story generation
- Mission updates during story choices
- Mission UI updates and notifications
- Currency/XP rewards distribution

## Required Changes By Component

### Backend API Routes

1. Add new mission endpoints in `api_routes.py`:
```python
@api_bp.route('/missions/<int:mission_id>', methods=['GET'])
@api_bp.route('/missions/<int:mission_id>/complete', methods=['POST'])
@api_bp.route('/missions/<int:mission_id>/fail', methods=['POST'])
```

2. Add mission status update endpoint:
```python
@api_bp.route('/missions/<int:mission_id>/update', methods=['POST'])
```

### Story Generation Integration

1. Modify `story_maker.py`:
```python
def generate_story():
    # ...existing code...
    # After story generation, create initial mission
    mission = generate_mission(user_id, story.id)
    story_data['initial_mission'] = mission.to_dict()
    # ...existing code...
```

### Story Choice Processing

1. Update `main_routes.py` make_choice:
```python
def make_choice():
    # ...existing code...
    # Update mission progress based on choice
    mission_result = update_mission_progress(mission_id, progress)
    result['mission_update'] = mission_result
    # ...existing code...
```

### Frontend Mission UI

1. Add mission state handling to `UserProgressManager.js`:
```javascript
updateMissionState(missionData) {
    // Show mission UI
    // Update progress displays
    // Handle rewards
}
```

## Implementation Strategy for AI Assistant

INSTRUCTION FORMAT FOR AI ASSISTANT:
When implementing changes:

1. START_CHANGE
- File: {filepath}
- Type: {add/modify/delete}
- Purpose: {brief explanation}
- Location: {where in file}
2. CODE BLOCK
3. END_CHANGE

Example:
```
START_CHANGE
- File: api_routes.py
- Type: add
- Purpose: Add mission GET endpoint
- Location: After last route

CODE
@api_bp.route('/missions/<int:mission_id>', methods=['GET'])
def get_mission(mission_id):
    mission = Mission.query.get_or_404(mission_id)
    return jsonify({'success': True, 'mission': mission.to_dict()})
END_CHANGE
```

## Implementation Order

1. Backend API Routes
   - Add mission endpoints
   - Test with Postman/curl
   - Verify responses

2. Story Integration
   - Add mission creation to story generation
   - Update choice processing
   - Test mission flow

3. Frontend Components
   - Add mission state management
   - Connect UI components
   - Test user interactions

## Testing Checklist

1. Mission Creation
- [ ] Mission created with new story
- [ ] Correct initial state
- [ ] Character relationships set

2. Mission Updates
- [ ] Progress updates on choices
- [ ] Status changes correctly
- [ ] Rewards distributed

3. UI/UX
- [ ] Mission details displayed
- [ ] Progress indicators update
- [ ] Notifications work

## Integration Testing

1. Full Flow Test:
```python
def test_mission_flow():
    # Create story
    story = generate_story()
    assert story.initial_mission
    
    # Make choice
    result = make_choice()
    assert result.mission_update
    
    # Complete mission
    complete = complete_mission()
    assert complete.rewards_distributed
```

## Error Handling

Add consistent error handling:
```python
try:
    # mission operation
except MissionError as e:
    logger.error(f"Mission error: {e}")
    return jsonify({"error": str(e)}), 400
```

## Rollback Plan

Store each system state:
1. Before mission creation
2. Before status updates
3. Before reward distribution

Enable rollback on failure:
```python
with db.session.begin_nested():
    # mission changes
```