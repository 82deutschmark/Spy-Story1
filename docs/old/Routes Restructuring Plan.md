###NOT USED###

# Routes

## Current File Analysis

### Key Files:
1. `routes/main_routes.py`: Web UI routes
2. `routes/api_routes.py`: API endpoints
3. `services/game_engine.py`: Core game logic
4. `services/story_maker.py`: Story generation
5. `services/segment_maker.py`: Story continuation
6. `services/state_manager.py`: Game state management
7. `utils/context_manager.py`  
8. `utils/character_manager.py`  

### Current Architecture Issues:
1. Direct dependency between API and Web routes
2. Shared business logic mixed with route handlers
3. Session management scattered across routes
4. Duplicated story generation logic



# Routes Restructuring Plan

## Current Issues
- Duplicate functionality between api_routes.py and main_routes.py
- Mixed responsibilities in main_routes.py
- Tangled business logic with presentation logic

## Separation Strategy

### 1. API Routes (/api/*)
- Pure JSON endpoints
- No session handling
- No template rendering
- RESTful design

### 2. Web Routes (/)
- Template rendering
- Session management
- Form processing
- User interface flow

### 3. Business Logic
- Move to appropriate services
- Remove from routes entirely
- Create clear interfaces

## Migration Steps

1. Create new route structure:
```bash
mkdir -p routes/{web,api,common}
touch routes/web/{pages,forms,session}.py
touch routes/api/{story,characters,missions,progress}.py
touch routes/common/{auth,validators}.py
```

2. Move functionality:
- Story generation → services/story_maker.py
- Character handling → services/character_manager.py
- Mission processing → services/mission_manager.py
- Progress tracking → services/progress_manager.py

3. Update imports and references:
```python
# Old:
from routes.main_routes import make_choice

# New:
from services.story_maker import process_choice
from routes.api.story import story_bp
```

4. Create clear interfaces:
```python
# routes/api/story.py
@story_bp.route('/choice', methods=['POST'])
def make_choice():
    """Handle story choice through API"""
    result = story_service.process_choice(request.json)
    return jsonify(result)

# routes/web/pages.py
@pages_bp.route('/story/choice', methods=['POST'])
def story_choice():
    """Handle story choice through web UI"""
    result = story_service.process_choice(request.form)
    return render_template('story.html', result=result)
```

## Expected Benefits

1. Clear Separation of Concerns:
- API routes handle data only
- Web routes handle presentation
- Services handle business logic

2. Improved Maintainability:
- Smaller, focused files
- Clear responsibilities
- Better testability

3. Better Error Handling:
- Consistent API responses
- Proper HTTP status codes
- Structured error messages

4. Enhanced Security:
- Proper input validation
- Clear authentication boundaries
- Consistent authorization

## Implementation Timeline

1. Create new structure (1 day)
2. Move API endpoints (2 days)
3. Move web routes (2 days)
4. Update references (1 day)
5. Testing (2 days)
6. Documentation (1 day)
