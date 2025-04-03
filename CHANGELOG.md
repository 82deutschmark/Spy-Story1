# Changelog

## [Unreleased]

### Fixed
- Critical bug in context_manager.py where enhanced context was being prepared but not properly sent to OpenAI API
- Node count tracking issues by migrating from JSONB extra_data to a dedicated column
- Mission generation error where dictionary was being passed instead of Mission model instance
- Story continuation issues with mission context handling
- Character lookup in mission generation to use Character model instead of SceneImages
- Inconsistent handling of `mission` variable type in `services/segment_maker.py`, causing `AttributeError` when accessing properties. Changed dictionary-style access (`.get()`) to direct attribute access (`.title`, `.progress`, etc.) in `_build_prompt` and `_process_mission_update` methods.

### Added
- Dedicated node_count column to UserProgress model for better performance and type safety
- Enhanced context generation for OpenAI using PlotArc key nodes and story node ancestry
- NodeContextSummary model for storing pre-computed narrative summaries at various detail levels
- Migrations for new database schema improvements
- Proper mission initialization in story generation with default parameters
- Improved mission progress tracking with proper database transactions

### Changed
- GameState.increment_node_count() to use proper ORM transactions
- Updated context retrieval to prioritize key narrative moments
- Modified context generation to include ancestor nodes for better narrative coherence
- Updated mission status handling to use consistent "active" status instead of "in_progress"
- Improved mission update logic in make_choice to handle progress updates more reliably
- Enhanced mission information storage in branch metadata for better state tracking

## [1.0.0] - 2023-12-01

### Added
- Initial release 