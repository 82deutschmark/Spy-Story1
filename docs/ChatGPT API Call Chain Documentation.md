# ChatGPT API Call Chain Documentation

This document explains the chain of events that form the API call to ChatGPT (via the OpenAI client) for generating story continuations. It also describes how the backend processes the call and integrates the response into the game state.

---

## 1. Event Chain Overview

When a player makes a choice in the game, the following steps occur:

1. **User Interaction & Form Submission**
   - The player's choice is submitted via a form (handled by `ChoiceHandler.js`).
   - Required state values (story_id, node_id, story_context, selected characters, etc.) are embedded in the request.

2. **Processing the Choice in the Backend**
   - The `/make_choice` route in `main_routes.py` receives the choice data.
   - The `GameEngine.make_choice` function is invoked:
     - It first retrieves the current node from the user’s game state.
     - It gathers additional context (via `GameState.get_node_context`) that includes:
       - Character relationships from the user's progress.
       - Active missions.
       - Branch metadata from the current story node.
   - Mission progress and character relationships are updated as needed.

3. **Building the Continuation Prompt**
   - The `generate_continuation` function (in `segment_maker.py`) is called.
   - Inside `StoryContinuationHandler.generate_continuation`:
     - A random character (or a previously encountered one) is selected using `CharacterFormatter.get_random_character`.
     - A system message is built (optionally via the helper function `_build_system_message`) that sets style guidelines, protagonist details, and expected JSON structure.
     - The continuation prompt is constructed by `StoryPromptBuilder.build_continuation_prompt`.  
       This prompt includes:
       - An excerpt (typically the first 500 characters) from the previous node’s narrative text.
       - The player’s chosen option.
       - Mission information.
       - Story context and any random character info formatted with explicit role and ID requirements.
     - The system message and user message are added to the conversation history inside an instance of `OpenAIContextManager`.

4. **Making the API Call**
   - The `process_function_calling` method of `OpenAIContextManager` is invoked.
     - This method calls the ChatGPT endpoint using:
       ```python
       client.chat.completions.create(
           model=model,
           messages=self.messages,
           tools=tools,
           temperature=temperature,
           response_format={"type": "json_object"}
       )
       ```
     - The prompt (as built above) is sent in the message history.
     - Returned content is “cleaned” (trimming markdown formatting and extra backticks) and appended to the context as an assistant message.

5. **Processing the API Response**
   - The JSON response (which must match a predefined structure) includes:
     - A new story continuation narrative (the “story” text).
     - A new set of choices, which (as observed) replicate the choices already present.
     - A “mission_update” object.
   - This response is parsed (via `json.loads`) and then fed into `StoryContinuationHandler.validate_response` to enforce the expected schema.
   - Finally, in `GameEngine.make_choice`, a new `StoryNode` is created with:
     - The narrative text taken from the response (which, in our case, is identical to the previous node’s narrative text).
     - The choices are stored in the node’s `branch_metadata` (again, the same three choice objects appear).

---

## 2. Overlapping Functions & Data Flow

- **Story Generation vs. Story Continuation:**
  - `generate_story` (in `story_maker.py`) initially creates a story.
  - `generate_continuation` (in `segment_maker.py`) then extends the narrative using the same backend logic.
- **Context Management:**
  - `OpenAIContextManager` (in `utils/context_manager.py`) aggregates both system messages and user messages.
  - `process_function_calling` is called to actually send the full context to ChatGPT.
  - The same context is used across both initial story generation and continuations. This overlap may be one source of the duplicate outputs.
- **Choice Data Duplication:**
  - The choices array appears in three locations:
    1. Top-level “Story data” (from the story generation service).
    2. Inside the “stories” key of that JSON.
    3. Within the `branch_metadata` of the current node.
  - All these copies are identical because our prompt formulation and response processing do not differentiate the initial choices from the continuation choices.
- **Narrative Text Duplication:**
  - The “story” field inside “stories” always matches the `narrative_text` of the current node.
  - This indicates a duplication somewhere.

---

## 3. Backend Processing Summary

- The backend receives a player choice.
- It gathers state and context, builds a continuation prompt with detailed instructions (including narratives and role/ID requirements), and calls ChatGPT.
- The ChatGPT API returns a JSON string that must conform to the expected structure.
- The backend parses this response and creates a new StoryNode, updates missions, and alters character relationships.
- TO BE DETERMINED:  IF new node’s metadata ends up replicating the previous narrative text and choice options or if it is duplicating something else?

---

## 4. Next Steps / Considerations

 We may need to:
- Refine the continuation prompt to differentiate from the prior node’s content.
- Pass an updated history or trim previous messages to only the last 500 words.
-

---

# Plan for Resolution

**Phase 1: Analysis and Planning**  
- Review and compare the context history sent in `OpenAIContextManager.messages` between initial generation and continuation.
- add logging to determine the payloads being sent to openAI

**Phase 2: Update Prompt Templates**  
- Modify `StoryPromptBuilder.build_continuation_prompt` to emphasize “continue from here” and require an extended narrative within the mission context based on the choice.

- Remove redundant duplicates (if possible, include only one copy of the choices array).

