# Generate Story Architecture Documentation

## Overview

Our project implements story generation in two parts:

1. **Initial Story Generation**  
   - Located in `services/story_maker.py`.
   - This function (`generate_story`) is responsible for creating the first story segment using a rich prompt that now supports custom instructions via a new custom_system_prompt parameter.
   - It normalizes the API response (renaming `"story"` to `"narrative_text"`) and ensures that all required fields (narrative, choices, mission_update, etc.) are present. It also builds detailed character prompts based on primary and secondary NPC details.

2. **Story Continuation Generation**  
   - Located in `services/segment_maker.py` and used later by `GameEngine`.
   - This part generates subsequent story segments after a choice is made.
   - In addition to reusing context and normalization logic, it builds an enriched prompt including word count ranges, additional NPC instructions, and explicit function-calling validation.

## Rationale for the Split

- **Separation of Concerns:**  
  The initial generation sets up the narrative, character introduction, and baseline context. Continuation generation integrates player choices using a more detailed prompt that includes mission updates and additional NPC details.
  
- **Enhanced Prompting and Context Management:**  
  New parameters (such as `custom_system_prompt`) and richer character prompts have been added to improve narrative quality and consistency. The system message is also updated dynamically by the OpenAIContextManager.
  
- **Maintenance & Extensibility:**  
  By isolating the initial and continuation flows, we now can refine how prompts are built—such as including explicit instructions on character roles, mission updates, and context updates—without affecting the other component.

## Future Refactoring Plan

- **Unified Interface:**  
  Consider creating a common interface or helper module that shares normalization, extraction, and formatting routines for narrative text and choices. This would reduce redundant code and ensure consistency across each generation step.

- **Enhanced Context Handling:**  
  Review how the OpenAIContextManager is configured in both flows to further isolate the initial prompt and continuation queue. This could be achieved by having separate methods (or even context manager instances) for "initialization" vs. "update".

- **Documentation and Testing:**  
  Continue to update documentation (this file and inline comments) as we refactor. Automated tests that compare the output structure of both initial and continuation generations will help validate the unified behavior.

## Conclusion

This split enables us to handle distinct generation scenarios while maintaining clarity in our codebase. The plan moving forward is to gradually merge the common functionality into shared helper functions while keeping the differences isolated.