# Plan: Improve User Identification Logic

**Goal:** Ensure users are consistently identified throughout the application using a combination of their unique session ID (`user_id`) and their chosen `protagonist_name`.

**Problem:**
The current system primarily relies on the session ID (`user_id`) stored in the Flask session to retrieve user progress. The `protagonist_name` is captured initially but isn't consistently used for subsequent lookups or strictly tied to the session ID for validation. This can lead to issues where progress might be incorrectly linked or new progress records created unnecessarily. The `protagonist_name` is also stored within a JSONB field (`game_state`) rather than a dedicated, queryable column.

**Findings:**
1.  **Model:** `models/user.py` defines `UserProgress` with a `user_id` but lacks a dedicated `protagonist_name` column.
2.  **Session ID:** `routes/main_routes.py` correctly generates and uses a session-based `user_id`.
3.  **Protagonist Name Capture:** The `/generate_story` route captures the name initially.
4.  **Retrieval Logic:** `utils/db_utils.py` contains `get_or_create_user_progress` which:
    *   Primarily queries by `user_id`.
    *   Uses `protagonist_name` (from the `game_state` field) only as a fallback if the `user_id` lookup fails.
    *   Updates the record's `user_id` if found via the fallback name lookup.
    *   Stores the name in the `game_state` JSONB field upon creation.
5.  **Inconsistent Usage:** Other routes (`index`, `make_choice`, etc.) in `main_routes.py` call the retrieval logic using only the session `user_id`, not passing the protagonist name consistently.

**Proposed Solution:**

1.  **Database Model Update (`models/user.py`):**
    *   Add a new `protagonist_name` column (e.g., `db.String(255)`, `nullable=True`, `index=True`) to the `UserProgress` model. This allows for efficient querying and clear storage.

2.  **Database Schema Migration:**
    *   Use Flask-Migrate (or manual SQL) to apply the model change to the database, adding the new column.
    *   Commands: `flask db migrate -m "Add protagonist_name to UserProgress"`, `flask db upgrade`.

3.  **Refactor User Retrieval (`utils/db_utils.py`):**
    *   Modify the `get_or_create_user_progress` function:
        *   Always require/retrieve the `session_user_id`.
        *   Attempt to fetch the `UserProgress` record using `session_user_id`.
        *   If a record is found and `protagonist_name` is available (from session or argument), verify it against the record's *new* `protagonist_name` field. Log warnings on mismatch, potentially update the field if it was previously null.
        *   If no record is found by `session_user_id`, create a *new* `UserProgress` record.
        *   When creating, populate both `user_id` and the new `protagonist_name` field. Remove logic that stores/retrieves the name from the `game_state` JSONB field.

4.  **Persist Name in Session (`routes/main_routes.py`):**
    *   In the `generate_story_route`, after successfully getting or creating the `UserProgress` record (and thus confirming the `protagonist_name` is associated in the DB), store the `protagonist_name` in `session['protagonist_name']`.

5.  **Update Route Logic (`routes/main_routes.py`):**
    *   Modify the `get_or_create_progress` helper function to retrieve both `user_id` and `protagonist_name` from the session.
    *   Pass both retrieved values to the underlying `db_get_or_create_user_progress` function in `db_utils.py`.
    *   Ensure all routes calling `get_or_create_progress` now use the updated version which implicitly gets necessary identifiers from the session.

6.  **Frontend Review (JavaScript):**
    *   After backend changes are tested, review relevant JavaScript modules (`UserProgressManager.js`, etc.) to ensure they rely on the session cookie for identification in API calls and don't have conflicting logic.

**Testing:**
*   Test creating a new user and setting the protagonist name.
*   Test navigating the site within the same session – progress should persist.
*   Test closing the browser, reopening, and accessing the site – progress should be retrieved based on the session ID and validated/updated with the protagonist name stored in the session.
*   Test scenarios where the session might expire or be cleared.
*   Test the initial story generation flow carefully.
