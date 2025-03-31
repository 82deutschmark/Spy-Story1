# Changelog

## [Unreleased]

### Fixed
- Critical bug in context_manager.py where enhanced context was being prepared but not properly sent to OpenAI API
- Node count tracking issues by migrating from JSONB extra_data to a dedicated column

### Added
- Dedicated node_count column to UserProgress model for better performance and type safety
- Enhanced context generation for OpenAI using PlotArc key nodes and story node ancestry
- NodeContextSummary model for storing pre-computed narrative summaries at various detail levels
- Migrations for new database schema improvements

### Changed
- GameState.increment_node_count() to use proper ORM transactions
- Updated context retrieval to prioritize key narrative moments
- Modified context generation to include ancestor nodes for better narrative coherence

## [1.0.0] - 2023-12-01

### Added
- Initial release 