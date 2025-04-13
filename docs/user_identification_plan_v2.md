# User Identification Plan: Simple Agent Codename Approach

## Overview

This plan outlines an enhanced yet simple approach to user identification that maintains the current low-friction onboarding while improving data consistency and user experience.

## Current System Analysis

The current system identifies users through:
1. A session-based `user_id` (UUID) stored in Flask's session
2. The "agent codename" (protagonist_name) entered during story creation
3. Storage of the codename in the `game_state` JSONB field
4. Retrieval logic that attempts to match by session ID first, then by codename in the JSONB field

## Issues with Current Implementation

1. The codename is buried in a JSONB field, making efficient querying difficult
2. No dedicated, indexed column for agent codenames
3. Inconsistent mapping between session IDs and codenames
4. No formalized registration step for users who want to continue their stories

## Proposal: Enhanced Agent Codename System

### Database Changes

1. **Add Dedicated Column for Agent Codename**:
   ```python
   # In models/user.py - UserProgress model
   agent_codename = db.Column(db.String(255), nullable=True, index=True)
   ```

2. **Add Registration Status Flag**:
   ```python
   # Optional: Add if implementing registration rewards later
   is_registered = db.Column(db.Boolean, default=False)
   ```

### Implementation Steps

1. **Database Model Update (`models/user.py`)**:
   - Add the new `agent_codename` column to UserProgress model
   - Ensure it has an index for efficient querying
   - Keep the current JSONB storage to avoid breaking existing functionality

2. **Database Migration**:
   - Create a migration that adds the new column
   - Include a data migration step that extracts codenames from `game_state` and populates the new column
   - Ensure nullable=True to avoid issues with existing records

3. **Retrieval Logic Enhancement (`utils/db_utils.py`)**:
   ```python
   def get_or_create_user_progress(user_id=None, agent_codename=None):
       # First try by session user_id
       if user_id:
           user_progress = UserProgress.query.filter_by(user_id=user_id).first()
           if user_progress:
               # If found and agent_codename provided, update it if missing
               if agent_codename and not user_progress.agent_codename:
                   user_progress.agent_codename = agent_codename
                   db.session.commit()
               return user_progress
       
       # Then try by agent_codename
       if agent_codename:
           user_progress = UserProgress.query.filter_by(agent_codename=agent_codename).first()
           if user_progress:
               # Update session user_id if it doesn't match
               if user_id and user_progress.user_id != user_id:
                   user_progress.user_id = user_id
                   db.session.commit()
               return user_progress
       
       # Create new record if not found
       if user_id:
           user_progress = UserProgress(user_id=user_id, agent_codename=agent_codename)
           # Initialize standard starting values
           user_progress.currency_balances = {
               "💎": 500,  # Diamonds
               "💷": 5000,  # Pounds
               "💶": 5000,  # Euros
               "💴": 5000,  # Yen
               "💵": 5000,  # Dollars
           }
           # For backward compatibility, still store in game_state too
           if agent_codename and not user_progress.game_state:
               user_progress.game_state = {}
           if agent_codename:
               user_progress.game_state['protagonist_name'] = agent_codename
           
           db.session.add(user_progress)
           db.session.commit()
           return user_progress
       
       return None
   ```

4. **Login Route Enhancement (`routes/main_routes.py`)**:
   ```python
   @main_bp.route('/login', methods=['GET', 'POST'])
   def login():
       """Handle user login with agent codename."""
       if request.method == 'POST':
           agent_codename = request.form.get('agentCodename')
           if agent_codename:
               # Find user by agent_codename
               user_progress = UserProgress.query.filter_by(agent_codename=agent_codename).first()
               
               # If not found, create new
               if not user_progress:
                   # Generate new user_id
                   user_id = str(uuid.uuid4())
                   user_progress = UserProgress(
                       user_id=user_id,
                       agent_codename=agent_codename
                   )
                   db.session.add(user_progress)
                   db.session.commit()
               
               # Store both user_id and agent_codename in session
               session['user_id'] = user_progress.user_id
               session['agent_codename'] = agent_codename
               
               flash('Successfully logged in as Agent ' + agent_codename, 'success')
               
               # Redirect to existing story or home
               if user_progress.current_story_id:
                   return redirect(url_for('main.storyboard', story_id=user_progress.current_story_id))
               return redirect(url_for('main.index'))
           else:
               flash('Please enter a valid codename', 'danger')
               return redirect(url_for('main.login'))
       return render_template('login.html')
   ```

5. **Story Generation Update (`routes/main_routes.py`)**:
   - Modify `generate_story_route` to store the protagonist name in session:
   ```python
   # After getting/creating user_progress
   session['agent_codename'] = protagonist_name
   ```
   - Ensure the agent_codename/protagonist_name is passed to `get_or_create_user_progress`

### Frontend Updates

1. **UserProgressManager.js**:
   - Update to use agent_codename consistently
   - Ensure login form and API calls use the same terminology

### Benefits of This Approach

1. **Maintains Low-Friction Onboarding**:
   - Users still only need to provide a name to start playing
   - No mandatory registration step

2. **Improves Data Consistency**:
   - Dedicated, indexed column for agent codenames
   - More reliable user identification and progress tracking

3. **Better Session Management**:
   - Clearer relationship between session ID and agent codename
   - More consistent state preservation across browser sessions

4. **Foundation for Future Enhancements**:
   - Easy to add optional registration rewards later
   - Structure supports adding more user data fields if needed

### Implementation Notes

1. Always verify against both user_id and agent_codename when available
2. Maintain backward compatibility with existing JSONB field usage
3. Consider adding a unique constraint on agent_codename for registered users
4. Log codename conflicts for manual resolution if needed
