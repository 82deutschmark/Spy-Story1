
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
- `backstory`, `description`: Character backstory and description

### 4. StoryGeneration
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

### 5. StoryNode
**Purpose**: Individual nodes in the story branching tree
**Usage**: Represents a single point in the narrative with text and choices
**Key Fields**:
- `id`: Primary key
- `narrative_text`: Text content of this story node
- `image_id`: Associated image
- `is_endpoint`: Whether this node is an endpoint
- `parent_node_id`: Reference to parent node (self-referential)
- `achievement_id`: Achievement unlocked at this node
- `branch_metadata`: Additional metadata for this branch

### 6. StoryChoice
**Purpose**: Choices that connect story nodes
**Usage**: Links story nodes together based on user choices
**Key Fields**:
- `id`: Primary key
- `node_id`: Source node of this choice
- `choice_text`: Text displayed to the user
- `next_node_id`: Destination node when choice is selected
- `currency_requirements`: Currencies needed to select this choice
- `choice_metadata`: Additional metadata for this choice

### 7. UserProgress
**Purpose**: Tracks user progress through stories
**Usage**: Stores user state, currency, and progress
**Key Fields**:
- `id`: Primary key
- `user_id`: Unique user identifier
- `current_node_id`: Current story node
- `current_story_id`: Current story
- `level`: User's game level
- `experience_points`: XP for leveling
- `choice_history`: History of user's choices
- `achievements_earned`: User's earned achievements
- `currency_balances`: User's currency balances
- `encountered_characters`: Characters the user has met

### 8. CharacterEvolution
**Purpose**: Tracks how characters evolve through user's story
**Usage**: Records character development based on story progression
**Key Fields**:
- `id`: Primary key
- `user_id`: User associated with this evolution
- `character_id`: Reference to character image
- `story_id`: Associated story
- `status`: Character status (active, deceased, etc.)
- `role`: Character role (protagonist, antagonist, etc.)
- `evolved_traits`: Traits developed during story
- `relationship_network`: Relations with other characters

### 9. Mission
**Purpose**: Stores player missions
**Usage**: Tracks missions that users can complete for rewards
**Key Fields**:
- `id`: Primary key
- `user_id`: User assigned to the mission
- `title`, `description`: Mission details
- `giver_id`: Character who gave the mission
- `target_id`: Character who is the target
- `objective`: Mission objective
- `status`: Mission status (active, completed, failed)
- `reward_currency`, `reward_amount`: Mission rewards

### 10. Achievement
**Purpose**: Stores achievements users can unlock
**Usage**: Provides goals and rewards for progression
**Key Fields**:
- `id`: Primary key
- `name`: Achievement name
- `description`: Achievement description
- `criteria`: Unlock conditions
- `points`: Points awarded for completion

### 11. PlotArc
**Purpose**: Tracks story plot arcs
**Usage**: Manages long-term story arcs that span multiple nodes
**Key Fields**:
- `id`: Primary key
- `title`, `description`: Plot arc details
- `arc_type`: Type of arc (main, side, character, etc.)
- `story_id`: Associated story
- `status`: Plot arc status
- `completion_criteria`: Requirements to complete the arc
- `rewards`: Rewards for completing the arc

### 12. AIInstruction
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

## Usage Patterns
1. Story navigation involves traversing from `StoryNode` to `StoryChoice` to next `StoryNode`
2. Currency transactions are recorded when users make choices that cost currency
3. `UserProgress` is the central table tracking all aspects of a user's state
4. Character development is tracked through `CharacterEvolution` as stories progress
5. Missions and achievements provide goals and rewards to drive user engagement
