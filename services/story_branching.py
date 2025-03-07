
import random
from typing import List, Dict, Any, Optional, Tuple
from models import StoryNode, StoryChoice, ImageAnalysis, Achievement, UserProgress
from app import db

class StoryBranchingService:
    """Service to handle story branching logic, integrating character and scene data"""
    
    @staticmethod
    def get_next_node_options(current_node_id: int, user_id: str) -> List[Dict[str, Any]]:
        """Get available choices for the current node, potentially modified by character traits"""
        # Get base choices from the database
        choices = StoryChoice.query.filter_by(node_id=current_node_id).all()
        
        # Get user progress to check what characters they've selected
        user_progress = UserProgress.query.filter_by(user_id=user_id).first()
        
        if not user_progress or not user_progress.game_state:
            return [{"id": choice.id, "text": choice.choice_text, "consequence": choice.choice_metadata.get("consequence", "Unknown")} 
                   for choice in choices]
        
        # Get selected character IDs from game state
        character_ids = user_progress.game_state.get("selected_characters", [])
        
        # Fetch character data
        characters = []
        if character_ids:
            characters = ImageAnalysis.query.filter(ImageAnalysis.id.in_(character_ids)).all()
        
        # Modify choices based on character traits
        modified_choices = []
        for choice in choices:
            choice_data = {
                "id": choice.id,
                "text": choice.choice_text,
                "consequence": choice.choice_metadata.get("consequence", "Unknown")
            }
            
            # Check if this choice should be modified based on character traits
            for character in characters:
                if not character.character_traits:
                    continue
                    
                traits = character.character_traits if isinstance(character.character_traits, list) else []
                
                # Example: If a character is "brave", make risky choices more appealing
                if "brave" in traits or "fearless" in traits:
                    if "risky" in choice.choice_metadata.get("tags", []):
                        choice_data["text"] += f" ({character.character_name} looks eager to try this)"
                
                # Example: If a character is "clever", they might spot hidden options
                if "clever" in traits or "intelligent" in traits:
                    if choice.choice_metadata.get("hidden", False):
                        choice_data["visible"] = True
                    if "requires_intelligence" in choice.choice_metadata.get("tags", []):
                        choice_data["text"] += f" ({character.character_name} thinks this could work)"
            
            modified_choices.append(choice_data)
        
        return modified_choices
    
    @staticmethod
    def create_character_driven_choice(
        story_node_id: int, 
        character_id: int,
        choice_text: str, 
        next_node_id: Optional[int] = None,
        required_traits: List[str] = [],
        tags: List[str] = []
    ) -> StoryChoice:
        """Create a new choice that is driven by a specific character's traits"""
        character = ImageAnalysis.query.get(character_id)
        if not character:
            raise ValueError(f"Character with ID {character_id} not found")
        
        # Create choice metadata
        metadata = {
            "character_id": character_id,
            "character_name": character.character_name,
            "required_traits": required_traits,
            "tags": tags,
            "consequence": f"{character.character_name} wants to lead the way"
        }
        
        # Create the choice
        choice = StoryChoice(
            node_id=story_node_id,
            choice_text=choice_text,
            next_node_id=next_node_id,
            choice_metadata=metadata
        )
        
        db.session.add(choice)
        db.session.commit()
        return choice
    
    @staticmethod
    def generate_scene_based_node(
        scene_image_id: int,
        previous_node_id: Optional[int] = None,
        narrative_text: Optional[str] = None
    ) -> StoryNode:
        """Create a story node based on scene image analysis"""
        scene = ImageAnalysis.query.get(scene_image_id)
        if not scene or scene.image_type != 'scene':
            raise ValueError(f"Scene with ID {scene_image_id} not found or not a scene")
        
        # Use scene details to inform node creation
        setting = scene.setting or "Unknown location"
        dramatic_moments = scene.dramatic_moments or []
        
        # Generate narrative text if not provided
        if not narrative_text:
            moment = random.choice(dramatic_moments) if dramatic_moments else "Something unexpected happens"
            narrative_text = f"The group arrives at {setting}. {moment}"
        
        # Create the node
        node = StoryNode(
            narrative_text=narrative_text,
            image_id=scene_image_id,
            parent_node_id=previous_node_id,
            branch_metadata={
                "setting": setting,
                "dramatic_moments": dramatic_moments,
                "scene_type": scene.scene_type
            }
        )
        
        db.session.add(node)
        db.session.commit()
        return node
    
    @staticmethod
    def unlock_achievement_for_character_combo(
        user_id: str,
        character_ids: List[int],
        achievement_name: str,
        achievement_description: str
    ) -> Optional[Achievement]:
        """Create and unlock an achievement for a specific character combination"""
        # Check if all characters exist
        characters = ImageAnalysis.query.filter(ImageAnalysis.id.in_(character_ids)).all()
        if len(characters) != len(character_ids):
            return None
            
        # Check if achievement already exists
        existing = Achievement.query.filter_by(name=achievement_name).first()
        if existing:
            achievement = existing
        else:
            # Create new achievement
            achievement = Achievement(
                name=achievement_name,
                description=achievement_description,
                criteria={"character_combo": character_ids},
                points=len(character_ids) * 10  # More characters = more points
            )
            db.session.add(achievement)
            
        # Update user progress
        user_progress = UserProgress.query.filter_by(user_id=user_id).first()
        if user_progress:
            achievements = user_progress.achievements_earned or []
            if achievement.id not in achievements:
                achievements.append(achievement.id)
                user_progress.achievements_earned = achievements
                db.session.commit()
                
        return achievement
    
    @staticmethod
    def suggest_story_paths_for_characters(character_ids: List[int]) -> List[Dict[str, Any]]:
        """Suggest potential story paths based on selected characters"""
        characters = ImageAnalysis.query.filter(ImageAnalysis.id.in_(character_ids)).all()
        
        story_suggestions = []
        
        # Look for role patterns
        roles = [char.character_role for char in characters if char.character_role]
        
        if "hero" in roles and "villain" in roles:
            story_suggestions.append({
                "theme": "Conflict and Redemption",
                "description": "A tale of unlikely allies - enemies forced to work together",
                "suggested_conflict": "Internal strife and trust issues"
            })
            
        if roles.count("hero") > 1:
            story_suggestions.append({
                "theme": "Competing Heroes",
                "description": "Multiple heroes with different approaches to saving the day",
                "suggested_conflict": "Disagreement on how to handle the squirrel menace"
            })
            
        # Look for complementary traits
        all_traits = []
        for char in characters:
            if char.character_traits:
                traits = char.character_traits if isinstance(char.character_traits, list) else []
                all_traits.extend(traits)
                
        if "brave" in all_traits and "cautious" in all_traits:
            story_suggestions.append({
                "theme": "Balance of Courage and Wisdom",
                "description": "One rushes in while the other plans carefully",
                "suggested_conflict": "Danger in the deep forest requiring both approaches"
            })
            
        # Check for unique plot opportunities
        plot_lines = []
        for char in characters:
            if char.plot_lines:
                lines = char.plot_lines if isinstance(char.plot_lines, list) else []
                plot_lines.extend(lines)
                
        if plot_lines:
            # Choose a random plot line to highlight
            featured_plot = random.choice(plot_lines)
            story_suggestions.append({
                "theme": "Character-Driven Adventure",
                "description": f"Focus on a unique character story: {featured_plot}",
                "suggested_conflict": "Personal growth and challenges"
            })
            
        return story_suggestions
