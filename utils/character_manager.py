import random
from models.character_data import Character

def get_random_characters(n: int = 3):
    # Retrieve n random characters from the database using allowed roles
    eligible = Character.query.filter(
        Character.character_role.in_(["neutral", "undetermined", "mission-giver", "villain"])
    ).all()
    if not eligible:
        return []
    return random.sample(eligible, min(n, len(eligible)))

def format_character_info(character):
    # Format character information for narrative prompts
    if not character:
        return ""
    traits = ", ".join(character.character_traits) if character.character_traits else "None"
    return f"""
Name: {character.character_name}
Role: {character.character_role}
ID: {character.id}
Traits: {traits}
Backstory: {character.backstory or 'Not provided'}
Plot Lines: {', '.join(character.plot_lines) if character.plot_lines else 'Not provided'}
"""

def extract_character_traits(char_data):
    # Extract character traits from a dict or an object
    if isinstance(char_data, dict):
        return char_data.get("character_traits", [])
    elif hasattr(char_data, "character_traits"):
        return char_data.character_traits or []
    return []

def extract_character_name(char_data):
    if isinstance(char_data, dict):
        # Prefer non-empty 'character_name' then 'name'
        name = (char_data.get("character_name") or char_data.get("name"))
        return name if name and str(name).strip() else "Unknown"
    elif hasattr(char_data, "character_name"):
        return char_data.character_name if char_data.character_name and str(char_data.character_name).strip() else "Unknown"
    return "Unknown"

def extract_character_role(char_data):
    if isinstance(char_data, dict):
        # Check for character_role first, then role, with a neutral default
        return char_data.get("character_role") or char_data.get("role") or "neutral"
    elif hasattr(char_data, "character_role"):
        return char_data.character_role or "neutral"
    return "neutral"

def extract_character_backstory(char_data):
    if isinstance(char_data, dict):
        return char_data.get("backstory", "")
    elif hasattr(char_data, "backstory"):
        return char_data.backstory or "Has always had difficulty with SQL queries."
    return ""

def extract_character_plot_lines(char_data):
    if isinstance(char_data, dict):
        return char_data.get("plot_lines", [])
    elif hasattr(char_data, "plot_lines"):
        return char_data.plot_lines or []
    return []

def extract_plot_lines(char_data):
    # For backward compatibility if needed
    return extract_character_plot_lines(char_data)

def extract_character_style(char_data):
    # Placeholder for optional style extraction logic
    return ""
