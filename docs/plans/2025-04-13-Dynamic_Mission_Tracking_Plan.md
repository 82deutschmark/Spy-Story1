# Mission Success/Failure Tracking Implementation Plan - 2025-04-13

**Revised Objective:** Implement mission success (`COMPLETED`) and failure (`FAILED`) tracking based *solely* on player selection of high-cost choices requiring premium currency (Diamonds 💎), aligning with the core game mechanic of resource management.

**Revised Core Problem:** The system needs to reliably link player choices associated with a 💎 cost (defined likely in `StoryNode.currency_requirements`) to the final mission outcome, setting the `Mission.status` to `COMPLETED` or `FAILED` based on the narrative path taken.

**Revised High-Level Strategy:**
1.  **Verify Mission Model:** Confirm the `Mission` model's `status` field (`models/missions.py`) supports binary outcomes (`COMPLETED`, `FAILED`) and ignore/remove the `progress` field.
2.  **Analyze Choice Costs:** Investigate how 💎 costs are defined for specific choices within the `StoryNode` model (`models/stories.py`) or related structures.
3.  **Implement Currency Check Logic:** Ensure the choice processing mechanism (likely in `services/game_engine.py`) correctly checks player's 💎 balance against `currency_requirements` *before* allowing a high-cost choice.
4.  **Implement Outcome Logic:** Update the choice processing mechanism to set the final `Mission.status` to `COMPLETED` or `FAILED` when a choice leads to a designated mission end-state node.
5.  **Update Mission Services:** Briefly review `services/mission_generator.py` to ensure mission creation aligns with outcome-based tracking.
6.  **Frontend Verification:** Ensure the UI correctly reflects the final mission status (`COMPLETED`/`FAILED`) and potentially disables choices the player cannot afford (insufficient 💎).
7.  **Testing:** Thoroughly test the 💎 choice paths, currency deduction, and resulting mission statuses.

**Revised Detailed Steps:**

**Phase 1: Model Analysis & Currency Logic**

1.  **Verify `Mission` Model (`models/missions.py`):**
    *   **Action:** Confirm the `status` enum (`PENDING`, `ACTIVE`, `COMPLETED`, `FAILED`) is sufficient for tracking the final outcome. `COMPLETED` and `FAILED` are the key final states.
    *   **Action:** Determine the `progress` field's fate. It is likely **irrelevant** for binary outcome tracking. Plan to either ignore it, remove it, or repurpose it if it serves another distinct function (e.g., storing *why* it failed - though this seems unlikely given the focus shift).
    *   **Decision:** We will ignore the `progress` field for mission outcome tracking.

2.  **Analyze `StoryNode` Costs (`models/stories.py`):**
    *   **Action:** Examine the `StoryNode` model, specifically the `currency_requirements` field (found in search results: `db.Column(JSONB, default={}) # e.g. {"💎": 50, "💷": 1000}`).
    *   **Action:** Understand how this JSON field associates specific currency costs (especially 💎) with the choices presented by that node.
    *   **Action:** Identify how nodes representing mission success or failure endpoints are designated (e.g., specific flags on the node, connections to terminal nodes).

3.  **Analyze Choice Processing & Currency Check (`services/game_engine.py`):**
    *   **Action:** Locate the function responsible for handling player choices (likely `make_choice` or similar).
    *   **Action:** Investigate how `currency_requirements` from the chosen `StoryNode` path are currently accessed and checked against the player's `User.currencies`.
    *   **Action:** If the check doesn't exist or is incomplete for 💎, plan the implementation: fetch cost -> check user balance -> allow/deny choice.

**Phase 2: Integration & Verification**

4.  **Implement Currency Check & Outcome Logic (`services/game_engine.py`):**
    *   **Action:** In the choice processing function:
        *   Implement/verify the check: If `currency_requirements` contains a 💎 cost for the selected choice, compare it to the user's current 💎 balance.
        *   If insufficient 💎, prevent the choice (return an error or appropriate response to frontend).
        *   If sufficient 💎, proceed with the choice and **deduct the 💎 cost** from the user's balance (`User.currencies`).
        *   Check if the *destination* `StoryNode` represents a mission end-state.
        *   If it's an end-state, update the corresponding `Mission.status` to `COMPLETED` or `FAILED` based on the node's designation.
    *   **Action:** Ensure all state changes (currency deduction, mission status update) are saved to the database.

5.  **Review Mission Services (`services/mission_generator.py`):**
    *   **Action:** Briefly review mission creation logic. Does it need to pre-define which `StoryNode` IDs correspond to the mission's success or failure endpoints? Or is this determined dynamically during choice processing?
    *   **Assumption:** The outcome is likely determined dynamically based on the node reached via a 💎 choice, so minimal changes expected here.

6.  **Frontend Verification (`static/js/modules/...`):**
    *   **Action:** Confirm the frontend correctly fetches and displays the final `Mission.status` (`COMPLETED`/`FAILED`).
    *   **Action:** Verify that choices requiring more 💎 than the player possesses are visually disabled or clearly marked as unaffordable in the UI (`UserProgressManager.js` / `MissionManager.js` might be involved).
    *   **Action:** Ensure API endpoints (`main_routes.py`) serve the correct final mission status.

**Phase 3: Testing**

7.  **Comprehensive Testing:**
    *   **Action:** Test scenario: Player has sufficient 💎 -> makes high-cost choice -> 💎 deducted -> reaches success node -> `Mission.status` is `COMPLETED`.
    *   **Action:** Test scenario: Player has sufficient 💎 -> makes high-cost choice -> 💎 deducted -> reaches failure node -> `Mission.status` is `FAILED`.
    *   **Action:** Test scenario: Player has insufficient 💎 -> attempts high-cost choice -> choice is blocked/UI shows unaffordable -> `Mission.status` remains `ACTIVE` (or previous state).
    *   **Action:** Verify 💎 balances are correctly updated in the database after successful high-cost choices.
    *   **Action:** Verify frontend UI correctly reflects affordability and final mission status.

**Next Steps:**
1.  Review this revised plan.
2.  Approve the plan or suggest modifications.
3.  Begin implementation starting with Phase 1: Verifying the `Mission` model and analyzing `StoryNode` costs and the existing choice processing logic.
