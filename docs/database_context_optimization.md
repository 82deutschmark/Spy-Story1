# Database Optimization for OpenAI Context Management

## Overview
This document outlines a plan to optimize the database structure and interactions to better support context management for OpenAI API calls. The primary goals are:

1. Fix node count tracking issues
2. Optimize context retrieval for OpenAI's limited context window
3. Improve narrative coherence in story generation

## Current Node Count Issues

The current implementation has these weaknesses:

1. **Direct SQL Execution**: The code uses `db.engine.execute()` to update `node_count` in `extra_data`, bypassing the ORM and potentially causing transaction issues.

2. **Inconsistent State**: The `node_count` is stored in both memory (`_node_count`) and database (`user_progress.extra_data`), which can become out of sync.

3. **No Explicit Schema Support**: Using `extra_data` (JSONB) rather than a dedicated column reduces query efficiency.

## Database Improvements

### 1. Add Dedicated Node Count Column

```sql
ALTER TABLE user_progress ADD COLUMN node_count INTEGER DEFAULT 0;
```

Benefits:
- Type safety
- Indexable field
- No JSON parsing overhead
- Better transaction handling

### 2. Leverage Node Parent-Child Relationships

The database already has a tree structure for story nodes:

```
StoryNode
├── id
├── parent_node_id (self-referential)
└── branch_metadata
```

This can be used to:
- Compute node depth directly with recursive queries
- Traverse up the tree to gather context from ancestors

### 3. Use PlotArc Key Nodes for Context Prioritization

```
PlotArc
├── key_nodes (JSONB array of important node IDs)
└── progress_markers
```

Key improvement:
- When gathering context for OpenAI, prioritize "key nodes" from plot arcs
- These represent the most important narrative moments

## Implementation Plan

### Phase 1: Fix Node Count Tracking

1. **Add Node Count Column to UserProgress**
   - Create migration for new column
   - Update ORM model

2. **Update GameState.increment_node_count()**
   ```python
   def increment_node_count(self) -> int:
       """Increment and return the node count using ORM."""
       self._node_count += 1
       
       # Update the dedicated column with proper transaction handling
       self.user_progress.node_count = self._node_count
       db.session.add(self.user_progress)
       db.session.commit()
       
       return self._node_count
   ```

3. **Migrate Existing Data**
   - Move node_count from extra_data to new column
   - Write script to perform migration

### Phase 2: Enhanced Context Generation

1. **Create Context Utility Function**

   ```python
   def get_enhanced_context(self, node_id: int, max_tokens: int = 3000) -> str:
       """Generate optimized context using key plot points."""
       current_node = StoryNode.query.get(node_id)
       context_entries = []
       
       # 1. Get key nodes from active plot arcs
       plot_arcs = PlotArc.query.filter(
           PlotArc.story_id == current_node.story_id,
           PlotArc.status == 'active'
       ).all()
       
       key_node_ids = []
       for arc in plot_arcs:
           key_node_ids.extend(arc.key_nodes)
       
       # 2. Get ancestors in the node tree path
       ancestor_nodes = []
       parent_id = current_node.parent_node_id
       while parent_id:
           parent = StoryNode.query.get(parent_id)
           ancestor_nodes.append(parent)
           parent_id = parent.parent_node_id
       
       # 3. Prioritize context: key nodes first, then recent ancestors
       key_context = []
       if key_node_ids:
           key_nodes = StoryNode.query.filter(StoryNode.id.in_(key_node_ids)).all()
           key_context = [f"KEY MOMENT: {node.narrative_text[:300]}..." for node in key_nodes]
       
       ancestor_context = [f"SCENE {i}: {node.narrative_text[:200]}..." 
                          for i, node in enumerate(ancestor_nodes[:3], 1)]
       
       # Combine and manage token count
       combined_context = key_context + ancestor_context
       return "\n\n".join(combined_context)
   ```

2. **Update Context Manager Integration**

   ```python
   # In context_manager.py
   narrative_history = state.get_enhanced_context(current_node.id, max_tokens=3000)

   # For OpenAI call
   messages = [
       {"role": "system", "content": system_message},
       {"role": "user", "content": f"NARRATIVE HISTORY:\n{narrative_history}\n\nPLAYER CHOICE:\n{user_message}"}
   ]
   ```

### Phase 3: Context Storage Optimization

1. **Add Node Context Summary Table**

   ```sql
   CREATE TABLE node_context_summary (
       id SERIAL PRIMARY KEY,
       node_id INTEGER REFERENCES story_node(id),
       summary_text TEXT,
       summary_type VARCHAR(50), -- 'short', 'medium', 'long'
       token_count INTEGER,
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
   ```

2. **Create Summary Generator Service**

   - Build background service to generate summaries
   - Implement token counting
   - Store summaries at different detail levels

3. **Enhance Context Retrieval**

   ```python
   def get_context_with_summaries(node_id, max_tokens):
       # Get appropriate size summaries based on token budget
       summaries = NodeContextSummary.query.filter_by(
           node_id=node_id, 
           summary_type='medium'
       ).order_by(NodeContextSummary.created_at.desc()).limit(5).all()
       
       # If token budget allows, get long summaries instead
       total_tokens = sum(s.token_count for s in summaries)
       if total_tokens < max_tokens * 0.6:
           # Try longer summaries
           long_summaries = NodeContextSummary.query.filter_by(
               node_id=node_id, 
               summary_type='long'
           ).order_by(NodeContextSummary.created_at.desc()).limit(3).all()
           
           if sum(s.token_count for s in long_summaries) < max_tokens * 0.8:
               summaries = long_summaries
       
       return "\n\n".join(s.summary_text for s in summaries)
   ```

## Testing Strategy

1. **Node Count Tests**
   - Verify node_count increments correctly
   - Ensure persistence across sessions
   - Test recovery from errors

2. **Context Generation Tests**
   - Verify key nodes are prioritized
   - Check ancestor traversal logic
   - Test token limits are respected

3. **Integration Tests**
   - Full story flow with multiple nodes
   - Verify context coherence across transitions
   - Measure token usage in OpenAI requests

## Performance Considerations

1. **Recursive Queries**
   - Use Common Table Expressions (CTEs) for efficient ancestor traversal
   - Add indexes on parent_node_id

2. **Summary Generation**
   - Consider async processing for summary generation
   - Use background workers for longer stories

3. **Caching Strategy**
   - Cache context for frequently accessed nodes
   - Invalidate cache when story branches change

## Implementation Timeline

- **Week 1**: Add node_count column and fix tracking
- **Week 2**: Implement enhanced context generation
- **Week 3**: Build summary storage and retrieval system
- **Week 4**: Testing and optimization

## Future Enhancements

1. **AI-Generated Summaries**: Use OpenAI to generate condensed story summaries
2. **Semantic Embeddings**: Store vector embeddings for better context relevance
3. **User-Specific Contexts**: Tailor context based on user history and preferences 