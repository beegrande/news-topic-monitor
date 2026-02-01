# Source Filtering Feature Implementation

## Feature Description
Allow users to include or exclude specific news sources when monitoring topics. Maintains a whitelist/blacklist per topic.

## Implementation Tasks

### Phase 1: Database Schema
- [x] Add `included_sources` field to `topic` table (text, nullable)
- [x] Add `excluded_sources` field to `topic` table (text, nullable)

### Phase 2: Data Access Layer
- [x] Update `src/data-access/topics.ts` to include source filtering fields in queries
- [x] Update `TopicWithUserPlan` type to include new fields

### Phase 3: Server Functions
- [x] Update `src/fn/topics.ts` to handle source filtering in create/update

### Phase 4: Use Case Integration
- [x] Create source filtering helper functions in `src/use-cases/checkTopicUpdatesUseCase.ts`
- [x] Add `parseSourceList()` function to parse comma-separated sources
- [x] Add `filterArticlesBySource()` function to apply whitelist/blacklist logic
- [x] Integrate filtering into `processTopicUpdate()` function

### Phase 5: UI Components
- [x] Update `src/components/CreateTopicDialog.tsx` with source filtering fields
- [x] Update `src/components/EditTopicDialog.tsx` with source filtering fields

### Phase 6: Testing & Verification
- [x] Create Playwright verification tests
- [x] Run all tests (6 tests passed)
- [x] Delete temporary test file

## Review

### Summary
The source filtering feature has been successfully implemented. Users can now specify:
- **Included Sources**: A comma-separated list of sources to ONLY fetch articles from
- **Excluded Sources**: A comma-separated list of sources to NEVER fetch articles from

Both filters can be used together - included sources are applied first, then excluded sources.

### Files Modified
1. `src/db/schema.ts` - Added `includedSources` and `excludedSources` fields to topic table
2. `src/data-access/topics.ts` - Updated queries to include new fields
3. `src/fn/topics.ts` - Updated create/update functions to handle source filtering
4. `src/components/CreateTopicDialog.tsx` - Added UI fields for source filtering
5. `src/components/EditTopicDialog.tsx` - Added UI fields for source filtering
6. `src/use-cases/checkTopicUpdatesUseCase.ts` - Added filtering logic with helper functions

### Key Implementation Details
- Sources are stored as comma-separated strings (text fields)
- Source matching is case-insensitive
- Empty values are treated as "no filter"
- Both whitelist and blacklist can be combined
- Filtering happens at article fetch time, before storage

### Verification
All 6 Playwright tests passed:
1. `parseSourceList` correctly parses comma-separated sources
2. `filterArticlesBySource` filters correctly with include/exclude logic
3. Schema includes source filtering fields
4. Create topic function accepts source filtering fields
5. Update topic function accepts source filtering fields
6. UI page loads correctly
