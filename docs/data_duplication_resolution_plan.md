# Data Duplication and Inconsistency Resolution Plan

## Issues Identified
1. Duplication of Choices:
   - Choices appear at the top-level in "Story data", inside the "stories" key, and again in branch_metadata.
2. Duplicate Narrative Text:
   - The narrative text is stored both as "story" (inside stories) and as node.narrative_text.
3. After progression:
   - The new narrative text and choices are only set in branch_metadata while the initial payload remains unchanged.
4. Risk:
   - The frontend must decide which copy to render. This adds complexity and may lead to outdated data.

## Analysis
- The context (maintained by OpenAIContextManager) already includes historical data.
- There is no need to preserve old narrative/choice data in a redundant top-level field.
- Instead, the continuation process should generate an updated branch_metadata that is the authoritative source for new narrative text and choices.

## Resolution Strategy
- Remove the extra duplication in the API responses.
- In StoryContinuationHandler.validate_response:
  - Return a simplified JSON object that holds the updated narrative (e.g. "narrative_text") and "choices" array once.
- Update the front-end and game engine to use branch_metadata as the single source.
- Remove the nested "stories" key from the response.
- This will ensure that, after a choice is made, only the updated branch_metadata (with the revised narrative text and choices) is used.

## Implementation Plan
1. Create/update a resolution plan document (this file).
2. In segment_maker.py:
   - Update validate_response to remove the "stories" wrapper and output a single structure.
3. In game_engine.py (and/or elsewhere):
   - Use the new response structure to update the current node.

This plan minimizes redundancy and ensures consistent narrative data for the front-end.

