
import os
import json
import logging
from typing import Dict, List, Tuple, Optional, Any
from openai import OpenAI
import random
import re

# Configure logging
logger = logging.getLogger(__name__)

# Get OpenAI API key from environment variables
api_key = os.environ.get("OPENAI_API_KEY")
if not api_key:
    logger.warning("OpenAI API key not found in environment variables")

# Initialize OpenAI client
client = OpenAI(api_key=api_key)

# Default story options
STORY_OPTIONS = {
    "conflicts": [
        ("🤵", "Double agent exposed"),
        ("💼", "Corporate espionage"),
        ("🧪", "Bioweapon heist"),
        ("💰", "Trillion-dollar ransom"),
        ("🔍", "Assassination conspiracy"),
        ("🕵️", "Government overthrow"),
        ("🌌", "Space station takeover"),
        ("🧠", "Mind control experiment")
    ],
    "settings": [
        ("🗼", "Paris Office"),
        ("🏝️", "Private Island"),
        ("🏙️", "Dubai Mega-Skyscraper"),
        ("🚢", "Luxury Cruise Liner"),
        ("❄️", "Arctic Research Base"),
        ("🏰", "Monaco Casino"),
        ("🏜️", "Sahara Desert Compound"),
        ("🌋", "Volcanic Lair")
    ],
    "narrative_styles": [
        ("😎", "Gen Z Teenage Drama"),
        ("🔥", "Steamy romance novel"),
        ("🤪", "Absurdist comedy"),
        ("🎭", "Melodramatic soap opera"),
        ("🎬", "High-budget action movie"),
        ("🤵", "Classic Bond film")
    ],
    "moods": [
        ("🍸", "Sexy and seductive"),
        ("💥", "Explosive and chaotic"),
        ("😂", "Ridiculously over-the-top"),
        ("😱", "Suspenseful and betrayal-filled"),
        ("🌟", "Glamorous and extravagant"),
        ("🥂", "Party-focused hedonism"),
        ("🔫", "Action-packed gunfights"),
        ("🕶️", "Cool and stylish")
    ]
}


# --- Helper functions ---

def get_story_options() -> Dict[str, List[Tuple[str, str]]]:
    """Return available story options for UI display"""
    return STORY_OPTIONS

def extract_field(data: Dict[str, Any], field: str, alt_field: Optional[str] = None, default: Any = None):
    """Extract a field from data with fallback to alternative field name and default value"""
    if not data:
        return default
    return data.get(field) or data.get(alt_field) or default

def extract_character_traits(character_data: Dict[str, Any]) -> List[str]:
    """Extract character traits from different data structures"""
    return extract_field(character_data, 'character_traits', 'traits', [])

def extract_plot_lines(character_data: Dict[str, Any]) -> List[str]:
    """Extract plot lines from different data structures"""
    return extract_field(character_data, 'plot_lines', 'potential_plot_lines', [])

def extract_character_style(character_data: Dict[str, Any]) -> str:
    """Extract character visual style/description from different data structures"""
    return extract_field(character_data, 'style', 'visual_description', '')

def extract_character_name(character_data: Dict[str, Any]) -> str:
    """Extract character name from different data structures"""
    return extract_field(character_data, 'name', 'character_name', 'Unnamed Character')

def extract_character_role(character_data: Dict[str, Any]) -> str:
    """Extract character role from different data structures"""
    role = extract_field(character_data, 'character_role', 'role', 'neutral')
    
<<<<<<< Updated upstream
    # Standardize the role to match our database values
    valid_roles = ['villain', 'neutral', 'mission-giver', 'undetermined']
    role_lower = role.lower() if role else 'neutral'
    
    # Map known role values to standardized versions
    if role_lower in ['antagonist', 'villain']:
        return 'villain'
    elif role_lower in ['protagonist', 'hero']:
        return 'neutral'
    elif role_lower == 'mission giver':
        return 'mission-giver'
    elif role_lower in valid_roles:
        return role_lower
    
    # Default for unrecognized roles
    return 'neutral'


# --- Main story generation ---

def generate_story(
    conflict: str,
    setting: str,
    narrative_style: str,
    mood: str,
    character_info: Optional[Dict[str, Any]] = None,
    custom_conflict: Optional[str] = None,
    custom_setting: Optional[str] = None,
    custom_narrative: Optional[str] = None,
    custom_mood: Optional[str] = None,
    previous_choice: Optional[str] = None,
    story_context: Optional[str] = None,
    additional_characters: Optional[List[Dict[str, Any]]] = None,
    protagonist_name: Optional[str] = None,
    protagonist_gender: Optional[str] = None,
    protagonist_level: Optional[int] = 1
) -> Dict[str, Any]:
    """Generate a story based on selected or custom parameters and character info"""
    logger.info("Entering generate_story function with parameters:")
    logger.info(f"Conflict: {conflict}, Setting: {setting}, Character: {character_info.get('name') if character_info else 'None'}")

    if not api_key:
        logger.error("OpenAI API key not found. Please add it to your environment variables.")
        raise ValueError("OpenAI API key not found. Please add it to your environment variables.")

    try:
=======
    @staticmethod
    def build_character_prompt(character_info: Optional[Dict[str, Any]] = None) -> str:
        """Build the character prompt for story generation."""
        if not character_info:
            return ""

        # Get the exact fields from the database
        character_traits = character_info.get("character_traits", {})
        backstory = character_info.get("backstory", "")
        plot_lines = character_info.get("plot_lines", [])
        role = character_info.get("role", "Unknown")
        role_requirements = character_info.get("role_requirements", "")

        # Build trait descriptions
        trait_descriptions = []
        if isinstance(character_traits, dict):
            trait_descriptions = [f"{trait} (strength: {value})" for trait, value in character_traits.items() if value > 0]
        elif isinstance(character_traits, (list, str)):
            traits_list = [character_traits] if isinstance(character_traits, str) else character_traits
            trait_descriptions = [str(trait) for trait in traits_list]

        # Build the prompt using string list joining to avoid f-string issues
        prompt_parts = [
            "FEATURED NPC CHARACTER:",
            f"Name: {character_info.get('name', 'Unknown')}",
            f"Role: {role}",
            f"Role Requirements: {role_requirements}",
            "",
            "CHARACTER DETAILS:",
            f"Traits: {', '.join(trait_descriptions) if trait_descriptions else 'Not specified'}",
            f"Backstory: {backstory if backstory else 'Not specified'}",
            f"Plot Lines: {', '.join(plot_lines) if plot_lines else 'Not specified'}",
            "",
            "CHARACTER INTEGRATION REQUIREMENTS:",
            "1. This NPC MUST be used in the story according to their specified role",
            "2. Make this NPC's traits manifest in their dialogue and actions",
            "3. Show their backstory through their experiences and knowledge",
            "4. Reflect their plot lines in their motivations and actions",
            "5. Ensure their traits influence their decisions and reactions",
            "6. Make their presence meaningful to the plot",
            "7. Show how their traits affect their relationship with the player character",
            "8. Use their traits to create interesting conflicts or opportunities",
            "9. Do not modify or change this NPC's role or personality",
            "10. This NPC must remain consistent with their provided traits and backstory",
            "11. This NPC's role must be clearly evident in their actions and dialogue",
            "12. This NPC must maintain their assigned role throughout the story",
            "13. This NPC's interactions must align with their role requirements",
            "14. This NPC cannot be replaced or substituted with other characters",
            "",
            "CHARACTER DIALOGUE GUIDELINES:",
            "1. Make their speech patterns reflect their traits",
            "2. Show their backstory through their expertise in conversations",
            "3. Reveal their plot lines through their motivations and goals",
            "4. Let their backstory influence their perspective and opinions",
            "5. Make their dialogue choices reflect their values",
            "6. Show their emotional intelligence through social interactions",
            "7. Reveal their motivations through their words and actions",
            "8. Make their dialogue choices impact the story's direction",
            "9. Ensure their dialogue reflects their assigned role",
            "10. Make their speech patterns match their role requirements"
        ]

        return "\n".join(prompt_parts)

    @staticmethod
    def build_additional_characters_prompt(additional_characters: Optional[List[Dict[str, Any]]] = None) -> str:
        """Build the prompt section for additional characters."""
        if not additional_characters:
            return ""

        prompt_parts = ["\nSECONDARY NPC CHARACTERS - INCORPORATE AT LEAST ONE INTO THE NARRATIVE:\n"]
        
        for char in additional_characters:
            char_traits = extract_character_traits(char)
            if isinstance(char_traits, str):
                char_traits = [char_traits]

            char_name = extract_character_name(char)
            char_role = extract_character_role(char)
            role_requirements = char.get("role_requirements", "")
            traits_str = ", ".join(char_traits) if char_traits else "No specified traits"

            char_parts = [
                f"- Name: {char_name}",
                f"  Role: {char_role}",
                f"  Role Requirements: {role_requirements}",
                f"  Traits: {traits_str}",
                f"  Suggested Usage: Include in a meaningful choice for the player character",
                f"  Important: This character should introduce one of their plot_lines into the story"
            ]
            prompt_parts.extend(char_parts)

        return "\n".join(prompt_parts)

class StoryGenerator:
    """Handles initial story generation."""
    
    def __init__(self, context_manager: Optional[OpenAIContextManager] = None):
        self.context_manager = context_manager or OpenAIContextManager()
        self.client = self._get_openai_client()

    def _get_openai_client(self) -> OpenAI:
        """Get an OpenAI client with the current API key."""
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OpenAI API key is required for story generation")
        return OpenAI(api_key=api_key)

    def _build_system_message(self, mood: str, narrative_style: str) -> Dict[str, str]:
        """Build the system message for story generation."""
        # Build the message parts separately to avoid f-string issues
        content_parts = [
            "You are a master narrative generator for our adventure game.",
            f"Create highly detailed, layered narratives in a {mood} tone with a {narrative_style} storytelling style.",
            "",
            "This game is set in the high-stakes world of international espionage, luxury, and intrigue.",
            "Players take on missions, develop relationships with various characters, and navigate complex scenarios",
            "where betrayal, romance, and action are common themes. The game engine tracks character relationships,",
            "story progress, and mission progress.",
            "",
            "CRITICAL CHARACTER ROLE REQUIREMENTS:",
            "1. You MUST ONLY use characters that are explicitly provided to you in the character prompts",
            "2. NEVER invent or create new characters that are not in the database",
            "3. If a character is not provided in the prompts, they cannot appear in the story",
            "4. Each character has a specific role that MUST be respected:",
            "   - Mission-giver: MUST be the one giving the mission to the player",
            "   - Villain: MUST be the primary antagonist",
            "   - Neutral: Can be used in supporting roles",
            "   - Undetermined: Role is flexible but must align with traits",
            "5. The mission-giver must remain the mission-giver",
            "6. The villain must remain the primary antagonist",
            "",
            "NARRATIVE STYLE GUIDELINES:",
            "1. Create a LENGTHY, DETAILED story introduction (at least 16000-20000 words) with good story structure",
            "2. ALWAYS tell the story in second person, addressing the player directly",
            "3. Use vivid sensory details, atmospheric descriptions, but do not reference physical features",
            "4. Set the stage for the story, introduce characters, and provide clear objectives",
            "5. Create a thriller with action, intrigue, and suspense",
            "6. Incorporate dynamic character interactions with revealing dialogue",
            "7. Balance action, dialogue, intrigue, and character development"
        ]

        return {
            "role": "system",
            "content": "\n".join(content_parts)
        }

    def generate_story(
        self,
        conflict: str,
        setting: str,
        narrative_style: str,
        mood: str,
        character_info: Optional[Dict[str, Any]] = None,
        additional_characters: Optional[List[Dict[str, Any]]] = None,
        user_id: Optional[str] = None,
        custom_conflict: Optional[str] = None,
        custom_setting: Optional[str] = None,
        custom_narrative: Optional[str] = None,
        custom_mood: Optional[str] = None,
        protagonist_name: Optional[str] = None,
        protagonist_gender: Optional[str] = None,
        protagonist_level: Optional[int] = 1,
        story_context: Optional[str] = None
    ) -> Dict[str, Any]:
        """Generate a new story with the given parameters."""
>>>>>>> Stashed changes
        # Get final values, using custom if provided
        final_conflict = custom_conflict or conflict
        final_setting = custom_setting or setting
        final_narrative = custom_narrative or narrative_style
        final_mood = custom_mood or mood
<<<<<<< Updated upstream

        # Build system message - improved approach based on JS version
        system_message = {
            "role": "system",
            "content": f"""You are a master narrative generator for our adventure game. 
Create highly detailed, layered narratives in a {final_mood} tone with a {final_narrative} storytelling style.

This game is set in the high-stakes world of international espionage, luxury, and intrigue. 
Players take on missions, develop relationships with various characters, and navigate complex scenarios 
where betrayal, romance, and action are common themes. The game tracks character relationships, 
currency balances, and mission progress.

NARRATIVE STYLE GUIDELINES:
1. Create LENGTHY, DETAILED story segments (at least 800-1000 words) with rich descriptions
2. Use vivid sensory details, atmospheric descriptions, and character development
3. Each segment should advance the plot significantly with unexpected twists or revelations
4. Include multiple scenes within each story segment when appropriate
5. Incorporate dynamic character interactions with dialogue that reveals personality
6. Balance action, dialogue, intrigue, and character development
7. If this is a continuation, reference previous events and choices to maintain continuity
8. Never repeat the same scenarios, locations, or dialogue patterns
9. Create a sense of escalating stakes and tension throughout the narrative

IMPORTANT FORMATTING INSTRUCTIONS:
1. Your response MUST be valid JSON, following exactly the structure provided.
2. Do not include any explanation, markdown formatting, code blocks, or additional text before or after the JSON.
3. Make sure all keys and values in the JSON are properly quoted with double quotes.
4. Ensure all arrays and objects are correctly closed.
5. Avoid using unescaped special characters (like " or \\) within JSON strings.

For initial story segments:
1. Always introduce a character from the database with the "mission-giver" role who assigns a mission to the player
2. Ensure one of the three choices involves meeting/interacting with a character (to introduce potential future mission-givers)
3. Structure the mission with a clear objective, target, reward, and deadline

For continuation segments:
1. Reference previous events to maintain continuity
2. Introduce new complications, challenges, or opportunities
3. Develop existing character relationships while potentially introducing new characters
4. Avoid repeating the same narrative patterns from previous segments"""
=======
        
        # Build character prompts
        character_prompt = CharacterPromptBuilder.build_character_prompt(character_info)
        additional_chars_prompt = CharacterPromptBuilder.build_additional_characters_prompt(additional_characters)
        
        # Build protagonist info
        protagonist_parts = []
        if protagonist_name and protagonist_gender:
            protagonist_parts = [
                "PROTAGONIST DETAILS:",
                f"Name: {protagonist_name}",
                f"Gender: {protagonist_gender}",
                f"Experience Level: {protagonist_level}"
            ]
        protagonist_info = "\n".join(protagonist_parts)
        
        # Build the user message parts
        message_parts = [
            "Generate the first segment of the thriller story with the following parameters:",
            "",
            f"CONFLICT: {final_conflict}",
            f"SETTING: {final_setting}",
            f"NARRATIVE STYLE: {final_narrative}",
            f"MOOD: {final_mood}",
            "",
            protagonist_info,
            "",
            "CHARACTERS THAT MUST BE USED IN THE STORY:",
            character_prompt,
            "",
            additional_chars_prompt,
            "",
            "STORY CONTEXT:",
            story_context if story_context else "This is the first segment of the story, introduce characters slowly.",
            "",
            "IMPORTANT CHARACTER USAGE RULES:",
            "1. Use the mission-giver character to give the initial mission targeting a villain",
            "2. Mission must have clear objectives (steal/kill/obtain) with deadline and failure consequences",
            "3. Villain appears later, introduced through dialogue",
            "4. Only use characters from prompts",
            "5. Characters seek out or are sought by protagonist",
            "6. Mission-giver reluctantly gives mission, references past failure",
            "7. Villain is pathetic but challenging",
            "8. Mission-giver hates villain (business/political/ideological/personal)",
            "9. Villain has exploitable weakness",
            "10. Rich scumbag villain backstory",
            "11. No physical descriptions",
            "12. Powerful, resourceful mission-giver",
            "13. Strained relationship with protagonist",
            "14. Mission-giver uses complex language about geopolitics/economics"
        ]

        # Generate the story
        story_data = self.context_manager.generate_initial_story(
            conflict=final_conflict,
            setting=final_setting,
            narrative_style=final_narrative,
            mood=final_mood,
            character_info=character_info,
            client=self.client,
            user_message="\n".join(message_parts)
        )
        
        # Add unique IDs to choices
        if "choices" in story_data:
            for i, choice in enumerate(story_data["choices"]):
                if "id" not in choice and "choice_id" not in choice:
                    choice["choice_id"] = f"choice_{i}_{datetime.utcnow().timestamp()}"
        
        # Return final story data
        return {
            "conflict": final_conflict,
            "setting": final_setting,
            "narrative_style": final_narrative,
            "mood": final_mood,
            "stories": story_data,
            "choices": story_data.get("choices", [])
>>>>>>> Stashed changes
        }

        # Build main prompt content
        protagonist_info = ""
        if protagonist_name and protagonist_gender:
            protagonist_info = f"You are {protagonist_name}, a {protagonist_gender} agent who is very charismatic, arrogant, and constantly receives romantic advances from practically everybody you meet. "
        else:
            protagonist_info = "You are a charismatic but reckless agent who constantly receives romantic advances from practically everybody you meet. "

<<<<<<< Updated upstream
        # Construct main content prompt
        content_prompt = f"""Create a DETAILED, EXTENSIVE story segment with:
Conflict: {final_conflict}
Setting: {final_setting}
Narrative Style: {final_narrative}
Mood: {final_mood}
{f"Protagonist: {protagonist_name} ({protagonist_gender}, Level {protagonist_level})" if protagonist_name else ""}
{f"Previous Context: {story_context}" if story_context else ""}
{f"Previous Choice: {previous_choice}" if previous_choice else ""}

WORLD BACKGROUND:
This is set in the high-stakes, sexy, dramatic international world of business, espionage, luxury, and parties. {protagonist_info}
The world is mostly as we know it, but features advanced technology like neural implants, satellite surveillance networks, and experimental weapons. Many villains control vast global empires with private armies and cutting-edge technology.
The world faces multiple crises - climate catastrophes, economic collapse, political instability, and secret wars between shadow organizations. You believe the only way to save it is to party hard, seduce strategic contacts, and undertake James Bond-style missions with elaborate infiltrations, thrilling chase sequences, and intense gunfights.

IMPORTANT NARRATIVE REQUIREMENTS:
1. Write a SUBSTANTIAL narrative (at least 1800-2000 words) with multiple scenes when appropriate, if this is a continuation, meaningfully advance the plot based on previous choices, events, and character traits.
2. Include vivid descriptions of locations, characters, and actions
3. Feature realistic dialogue that reveals character motivations and relationships
4. Incorporate sensory details that bring the setting to life
5. Stay true to the requested narrative style and mood, with a focus on layered storytelling and dynamic character interactions across story segments
6. Freely incorporate unusual elements and themes to create a unique and engaging story.
7. Avoid using unescaped special characters (like " or \\) within JSON strings.
8. Avoid reusing scenarios, dialogue patterns, or narrative structures from previous segments, but maintain continuity.
9. Each choice should lead to significantly different narrative paths

Generate an engaging, detailed story segment with 3 distinct choices that offer meaningful narrative branches."""

        # Add character information if provided
        selected_character_prompt = ""
        if character_info and extract_character_name(character_info):
            traits = extract_character_traits(character_info)
            plot_lines = extract_plot_lines(character_info)
            style = extract_character_style(character_info)
            char_name = extract_character_name(character_info)
            char_role = extract_character_role(character_info)

            selected_character_prompt = (
                f"\nFEATURED CHARACTER - INTEGRATE DEEPLY INTO THE NARRATIVE:\n"
                f"Name: {char_name}\n"
                f"Role: {char_role}\n"
                f"Traits: {', '.join(traits)}\n"
                f"Visual Description: {style}\n"
            )

            # Add character development instructions
            selected_character_prompt += (
                f"\nCHARACTER DEVELOPMENT INSTRUCTIONS FOR {char_name.upper()}:\n"
                f"1. Show this character's personality through actions, dialogue, and decisions\n"
                f"2. Reveal deeper aspects of their background and motivations\n"
                f"3. Create meaningful interactions between this character and the protagonist\n"
                f"4. Establish or develop a dynamic relationship (alliance, rivalry, romance, etc.)\n"
                f"5. Demonstrate how this character's unique traits influence the narrative\n"
            )

            if plot_lines:
                selected_character_prompt += f"PLOT LINES (INTEGRATE AT LEAST ONE INTO THE NARRATIVE):\n"
                for plot in plot_lines:
                    selected_character_prompt += f"- {plot}\n"

        # Add additional characters if provided
        additional_characters_prompt = ""
        if additional_characters and len(additional_characters) > 0:
            additional_characters_prompt = "\nSECONDARY CHARACTERS - INCORPORATE AT LEAST ONE INTO THE NARRATIVE:\n"
            for char in additional_characters:
                char_traits = extract_character_traits(char)
                if isinstance(char_traits, str):
                    char_traits = [char_traits]

                char_name = extract_character_name(char)
                char_role = extract_character_role(char)
                traits_str = ', '.join(char_traits) if char_traits else 'No specified traits'

                additional_characters_prompt += (
                    f"- Name: {char_name}\n"
                    f"  Role: {char_role}\n"
                    f"  Traits: {traits_str}\n"
                    f"  Suggested Usage: Include in a meaningful scene that showcases their personality\n"
                )

        # Add previous choice context if any
        context_prompt = ""
        if story_context and previous_choice:
            is_custom_choice = previous_choice.startswith("Custom choice:")

            if is_custom_choice:
                context_prompt = (
                    f"\nNARRATIVE CONTINUATION CONTEXT:\n"
                    f"Previous story summary: {story_context[:300]}...\n"
                    f"Player entered a custom choice: {previous_choice[14:].strip()}\n\n"
                    "CONTINUATION INSTRUCTIONS:\n"
                    "1. Treat the player's custom input as a direct action or decision made by the protagonist\n"
                    "2. Build directly from this choice to create a NEW narrative direction\n" 
                    "3. Use this choice as a catalyst for significant plot development\n"
                    "4. Introduce new complications or opportunities stemming from this decision\n"
                    "5. Avoid repeating narrative elements from the previous segment\n"
                    "6. Show immediate and potential long-term consequences of this choice\n"
                )
            else:
                context_prompt = (
                    f"\nNARRATIVE CONTINUATION CONTEXT:\n"
                    f"Previous story summary: {story_context[:300]}...\n"
                    f"Player chose: {previous_choice}\n\n"
                    "CONTINUATION INSTRUCTIONS:\n"
                    "1. Build directly upon this choice with NEW narrative developments\n"
                    "2. Avoid repeating scenarios, dialogue patterns, or story beats from previous segments\n"
                    "3. Move the plot forward significantly with this continuation\n"
                    "4. Introduce unexpected consequences or developments from this choice\n"
                    "5. Deepen character relationships and advance any mission objectives\n"
                    "6. If appropriate, introduce a new complication, character, or location\n"
                )

        # Build mission guidance
        mission_prompt = """
MISSION FRAMEWORK INSTRUCTIONS:

If this is the beginning of a story, ensure:
1. IMPORTANT: The story MUST begin with a detailed mission briefing scene where a mission-giver character assigns a mission to the player with these components:
   - A clear, specific objective (steal a prototype, sabotage a weapons system, infiltrate a secure facility, etc.)
   - A target character who has the 'villain' role in the database
   - A large reward in one of the game currencies (💵, 💷, 💶, 💴)
   - A deadline with serious consequences for failure
   - Detailed mission parameters, challenges, and potential complications
   - IMPORTANT: The mission-giver has a complex attitude - they reluctantly task you with missions while expressing doubts about your reliability, referencing your past failures or unprofessional methods, yet acknowledging your unique skills

2. The mission briefing should include:
   - Rich environmental descriptions of the briefing location
   - Character development through dialogue and interactions
   - Background information on why this mission is critical
   - Personal stakes for both the mission-giver and protagonist
   - Technical details or intelligence relevant to the mission

3. Provide three sophisticated choice options that:
   - Offer genuinely different approaches to the mission
   - Reflect different aspects of the protagonist's character
   - Have distinct risk/reward profiles
   - Connect to the mission in meaningful ways
   - Each choice should offer a compelling and sexy/dangerous description

If this is a continuation segment:
1. Briefly and naturally reference the mission objectives and progress
2. Introduce new complications or developments related to the mission
3. Ensure the narrative advances the mission in some way
4. Maintain the tension and stakes established in the mission briefing
"""

        # Format request
        format_prompt = """
Format as JSON with:
{
  "title": "Episode title",
  "story": "Story text with integrated mission assignment",
  "choices": [
    {
      "text": "First choice related to the mission",
      "consequence": "Brief outcome hint",
      "currency_requirements": {"💵": 500},
      "mission_impact": "Describe how this choice affects the mission (advancing it)",
      "type": "mission-advancing"
    },
    {
      "text": "Second choice with high risk/reward",
      "consequence": "Possible danger or unexpected outcome",
      "currency_requirements": {"💵": 750},
      "mission_impact": "High risk impact on mission (potential failure or big success)",
      "type": "risky"
    },
    {
      "text": "Third choice, an alternative approach",
      "consequence": "Outcome hint, like gaining allies or resources",
      "currency_requirements": {"💵": 600},
      "mission_impact": "Alternative path that may help indirectly",
      "type": "alternative"
    }
  ],
  "mission": {
    "title": "Mission title",
    "description": "Detailed mission description",
    "giver": "Name of character who gave the mission",
    "giver_id": "ID of the character who gave the mission",
    "target": "Name of target character (villain)",
    "target_id": "ID of target character",
    "objective": "What the player must do",
    "reward_currency": "Currency symbol (💎, 💵, etc.)",
    "reward_amount": "Amount of reward",
    "deadline": "Narrative deadline description",
    "difficulty": "Easy, Medium, or Hard"
  },
  "characters": ["List of character names featured, including new characters"]
}"""

        # Combine all prompts
        full_prompt = (
            f"{content_prompt}\n"
            f"{selected_character_prompt}\n"
            f"{additional_characters_prompt}\n"
            f"{context_prompt}\n"
            f"{mission_prompt}\n"
            f"{format_prompt}"
        )

        # Set up messages
        messages = [
            system_message,
            {"role": "user", "content": full_prompt}
        ]

        logger.debug(f"Sending messages to OpenAI: {json.dumps(messages, indent=2)}")

        # Make the OpenAI API call with response_format parameter - increased token limit and adjusted temperature
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            temperature=0.35,  # Ranges from 0 to 2, higher creates weirder responses, 1.4 is unusable, 1.05 is a little odd, 0.1 is very dull 
            max_tokens=14000,    # Increased token limit for longer responses
            response_format={"type": "json_object"}  # Force JSON response format
        )

        logger.info("Successfully received response from OpenAI")
        logger.debug(f"Raw response content: {response.choices[0].message.content}")

        # Parse the generated story - with proper error handling
        try:
            # The response should now be valid JSON without any need for regex extraction
            content = response.choices[0].message.content.strip()
            result = json.loads(content)

            # Parse JSON content to ensure it's valid
            story_data = json.loads(content)
            
            # Return formatted result with both parsed JSON and the original JSON string
            formatted_result = {
                "stories": story_data,  # Include parsed JSON as 'stories' key that JS expects
                "story": content,  # Also keep the raw JSON string
                "conflict": final_conflict,
                "setting": final_setting,
                "narrative_style": final_narrative,
                "mood": final_mood
            }
            
            logger.info("Successfully generated and formatted story")
            logger.info("Exiting generate_story function")
            return formatted_result
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse OpenAI response as JSON: {str(e)}")
            logger.error(f"Raw response content: {response.choices[0].message.content}")
            
            # Create a fallback story structure
            fallback_result = {
                "title": "Story Generation Error",
                "story": "Our storyteller encountered an error. Please try again with different parameters.",
                "choices": [
                    {
                        "text": "Try again",
                        "consequence": "Start over with new options",
                        "currency_requirements": {"💵": 0},
                        "mission_impact": "None",
                        "type": "retry"
                    }
                ],
                "characters": []
            }
            
            # Format and return fallback result
            formatted_result = {
                "story": json.dumps(fallback_result),
                "conflict": final_conflict,
                "setting": final_setting,
                "narrative_style": final_narrative,
                "mood": final_mood
            }
            
            logger.info("Using fallback story structure due to parsing error")
            return formatted_result

    except Exception as e:
        logger.error(f"Error generating story: {str(e)}", exc_info=True)
        raise Exception(f"Failed to generate story: {str(e)}")
=======
def generate_story(**kwargs) -> Dict[str, Any]:
    """Generate a new story with the given parameters."""
    generator = StoryGenerator()
    return generator.generate_story(**kwargs)
>>>>>>> Stashed changes
