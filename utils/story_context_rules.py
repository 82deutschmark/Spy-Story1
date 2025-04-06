"""
Story context management utilities for narrative generation.
"""
from typing import Dict, Any, List, Optional
import logging

logger = logging.getLogger(__name__)


class StoryContext:
    """
    Container for story context information used in narrative generation.
    """
    
    def __init__(self,
                 conflict: Optional[str] = None,
                 setting: Optional[str] = None,
                 character_info: Optional[List[Dict[str, Any]]] = None,
                 narrative_history: Optional[str] = None,
                 node_count: int = 1,
                 previous_choices: Optional[List[str]] = None,
                 character_interactions: Optional[Dict[str, List[str]]] = None):
        self.conflict = conflict
        self.setting = setting
        self.character_info = character_info or []
        self.narrative_history = narrative_history
        self.node_count = node_count
        self.previous_choices = previous_choices or []
        self.character_interactions = character_interactions or {}
    
    @classmethod
    def from_mission(cls, 
                    mission: Any,
                    conflict: Optional[str] = None,
                    setting: Optional[str] = None,
                    character_info: Optional[List[Dict[str, Any]]] = None,
                    narrative_history: Optional[str] = None,
                    node_count: int = 1,
                    previous_choices: Optional[List[str]] = None,
                    character_interactions: Optional[Dict[str, List[str]]] = None):
        """
        Create StoryContext from a Mission object.
        """
        return cls(
            conflict=conflict or (getattr(mission, 'conflict', None) if mission else None),
            setting=setting or (getattr(mission, 'setting', None) if mission else None),
            character_info=character_info,
            narrative_history=narrative_history,
            node_count=node_count,
            previous_choices=previous_choices,
            character_interactions=character_interactions
        )


class StoryContextRules:
    """
    Helper class for building story continuity rules.
    """
    
    @staticmethod
    def build_continuity_rules(context: StoryContext) -> str:
        """
        Generate continuity rules text based on story context.
        """
        rules = [
            "STORY CONTINUITY RULES:",
            "1. Maintain consistent character traits and behaviors",
            "2. Preserve established relationships between characters",
            "3. Follow the natural progression of events"
        ]
        
        if context.conflict:
            rules.append(f"4. The central conflict is: {context.conflict}")
        if context.setting:
            rules.append(f"5. The setting remains: {context.setting}")
        if context.narrative_history:
            rules.append("6. Incorporate these past events:")
            rules.append(context.narrative_history)
        
        return '\n'.join(rules)
