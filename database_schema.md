# Database Schema Documentation

## Overview
This document outlines all database tables in our project, their relationships, and usage within the application.

## Tables

### 1. Currency
**Purpose**: Stores different types of in-game currencies
**Usage**: Defines currency types that users can earn and spend
**Key Fields**:
- `id`: Primary key
- `name`: Currency name (e.g., "diamond", "pound")
- `symbol`: Currency symbol (e.g., "💎", "💷")
- `created_at`: Timestamp of creation

### 2. Transaction
**Purpose**: Tracks all currency transactions
**Usage**: Records history of spending and earning currency
**Key Fields**:
- `id`: Primary key
- `user_id`: User who made the transaction
- `transaction_type`: Type of transaction (e.g., 'choice', 'trade', 'purchase')
- `from_currency`/`to_currency`: Currency types involved
- `amount`: Transaction amount
- `description`: Description of the transaction
- `story_node_id`: Reference to the story node where transaction occurred
- `created_at`: Timestamp of transaction

### 3. ImageAnalysis
**Purpose**: Stores analyzed images and their metadata
**Usage**: Contains character and scene images for stories
**Key Fields**:
- `id`: Primary key
- `image_url`: URL to the image
- `image_type`: Type of image ('character', 'scene', etc.)
- `analysis_result`: JSON with analysis details
- `name`: Name of the image/character
- `character_name`: Name of the character (for character images)
- `character_traits`, `personality_traits`: Character attributes
- `backstory`, `description`: Character background and description
- `character_role`: Role of character (undetermined, villain, neutral, mission-giver)
- `potential_plot_lines`: Potential story arcs for this character
- `setting_description`: Description of the setting (for scene images)
- `story_fit`: How well the image fits with the story
- `dramatic_moments`: Key dramatic moments for this character/scene
- `created_at`: Timestamp of creation

### 4. Characters
**Purpose**: Stores dedicated character data
**Usage**: Provides a streamlined model for character information
**Key Fields**:
- `id`: Primary key
- `image_url`: URL to the character image
- `character_name`: Name of the character
- `character_traits`: JSON with character traits
- `character_role`: Role of the character
- `plot_lines`: JSON with potential plot lines
- `backstory`: Character backstory
- `description`: Character description
- `created_at`, `updated_at`: Timestamps for creation and updates

### 5. StoryGeneration
**Purpose**: Stores main story information
**Usage**: Contains high-level story data
**Key Fields**:
- `id`: Primary key
- `primary_conflict`: Main conflict of the story
- `setting`: Story setting
- `narrative_style`: Style of the narrative
- `mood`: Story mood
- `generated_story`: JSON with story content
- Relationship with `images` through `story_images` association table

### 6. StoryNode
**Purpose**: Individual nodes in the story branching tree
**Usage**: Represents a single point in the narrative with text and choices
**Key Fields**:
- `id`: Primary key
- `narrative_text`: Text content of this story node
- `image_id`: Associated image
- `is_endpoint`: Whether this node is an endpoint
- `parent_node_id`: Reference to parent node (self-referential)
- `achievement_id`: Achievement unlocked at this node
- `branch_metadata`: Additional metadata including story_id and mission_id
- `generated_by_ai`: Whether this node was AI-generated
- `created_at`: Creation timestamp

### 7. StoryChoice
**Purpose**: Choices that connect story nodes
**Usage**: Links story nodes together based on user choices
**Key Fields**:
- `id`: Primary key
- `node_id`: Source node of this choice
- `choice_text`: Text displayed to the user
- `next_node_id`: Destination node when choice is selected
- `currency_requirements`: Currencies needed to select this choice (JSON)
- `choice_metadata`: Additional metadata for this choice (JSON)

### 8. UserProgress
**Purpose**: Tracks user progress through stories
**Usage**: Stores user state, currency, and progress
**Key Fields**:
- `id`: Primary key
- `user_id`: Unique user identifier
- `current_node_id`: Current story node
- `current_story_id`: Current story
- `level`: User's game level
- `experience_points`: XP for leveling
- `choice_history`: History of user's choices (JSON array)
- `achievements_earned`: User's earned achievements (JSON array)
- `currency_balances`: User's currency balances (JSON)
- `encountered_characters`: Characters the user has met (JSON)
- `active_missions`: Array of active mission IDs (JSON)
- `completed_missions`: Array of completed mission IDs (JSON)
- `failed_missions`: Array of failed mission IDs (JSON)
- `active_plot_arcs`: Array of active plot arc IDs (JSON)
- `completed_plot_arcs`: Array of completed plot arc IDs (JSON)
- `game_state`: General game state information (JSON)

### 9. CharacterEvolution
**Purpose**: Tracks how characters evolve through user's story
**Usage**: Records character development based on story progression
**Key Fields**:
- `id`: Primary key
- `user_id`: User associated with this evolution
- `character_id`: Reference to character image
- `story_id`: Associated story
- `status`: Character status (active, deceased, etc.)
- `role`: Character role (protagonist, antagonist, etc.)
- `evolved_traits`: Traits developed during story (JSON)
- `plot_contributions`: Character's contributions to plot (JSON)
- `relationship_network`: Relations with other characters (JSON)
- `first_appearance`, `last_updated`: Timestamps
- `evolution_log`: Log of character evolution events (JSON)

### 10. Mission
**Purpose**: Stores player missions
**Usage**: Tracks missions that users can complete for rewards
**Key Fields**:
- `id`: Primary key
- `user_id`: User assigned to the mission
- `title`, `description`: Mission details
- `giver_id`: ID of the character who gave the mission
- `target_id`: ID of the character who is the target
- `objective`: Mission objective
- `status`: Mission status (active, completed, failed)
- `difficulty`: Mission difficulty (easy, medium, hard)
- `reward_currency`: Currency symbol for reward (e.g., 💎)
- `reward_amount`: Amount of currency rewarded
- `deadline`: Narrative deadline for the mission
- `created_at`, `completed_at`: Timestamps
- `story_id`: Associated story
- `progress`: Percentage of completion (0-100)
- `progress_updates`: Array of progress update events (JSON)

### 11. Achievement
**Purpose**: Stores achievements users can unlock
**Usage**: Provides goals and rewards for progression
**Key Fields**:
- `id`: Primary key
- `name`: Achievement name
- `description`: Achievement description
- `criteria`: Unlock conditions
- `points`: Points awarded for completion

### 12. PlotArc
**Purpose**: Tracks story plot arcs
**Usage**: Manages long-term story arcs that span multiple nodes
**Key Fields**:
- `id`: Primary key
- `title`, `description`: Plot arc details
- `arc_type`: Type of arc (main, side, character, etc.)
- `story_id`: Associated story
- `status`: Plot arc status
- `completion_criteria`: Requirements to complete the arc (JSON)
- `progress_markers`: List of progress markers (JSON)
- `key_nodes`: List of key node IDs in this arc (JSON)
- `branching_choices`: List of key choice IDs (JSON)
- `primary_characters`: List of character IDs (JSON)
- `rewards`: Rewards for completing the arc (JSON)
- `created_at`, `updated_at`: Timestamps

### 13. AIInstruction
**Purpose**: Stores AI generation parameters and instructions
**Usage**: Contains templates for AI-generated content
**Key Fields**:
- `id`: Primary key
- `name`: Instruction name
- `prompt_template`: Template for AI prompts
- `parameters`: Additional parameters for AI

## Key Relationships
- `StoryGeneration` ↔ `ImageAnalysis`: Many-to-many through `story_images`
- `StoryNode` → `StoryNode`: Self-referential parent-child relationship
- `StoryNode` → `StoryChoice`: One-to-many (node has many choices)
- `StoryChoice` → `StoryNode`: Many-to-one (choice leads to next node)
- `UserProgress` → `StoryNode`: User's current position in story
- `UserProgress` → `StoryGeneration`: User's current story
- `UserProgress` → `Transaction`: User's transaction history
- `StoryNode` → `Achievement`: Achievement unlocked at node
- `CharacterEvolution` → `ImageAnalysis`: Character being evolved
- `CharacterEvolution` → `StoryGeneration`: Story context for evolution
- `Mission` → `ImageAnalysis`: Relationships with giver and target characters
- `Mission` → `StoryGeneration`: Story context for mission

## Usage Patterns
1. Story navigation involves traversing from `StoryNode` to `StoryChoice` to next `StoryNode`
2. Currency transactions are recorded when users make choices that cost currency
3. `UserProgress` is the central table tracking all aspects of a user's state
4. Character development is tracked through `CharacterEvolution` as stories progress
5. Missions and achievements provide goals and rewards to drive user engagement
6. Plot arcs connect multiple story nodes into coherent narrative threads
7. Currency system enables monetization and resource management gameplay