# Duplicate Detection Feature Implementation - Review

## Feature Description
Implemented intelligent duplicate detection to avoid storing the same article from multiple sources. Uses content similarity matching via SHA-256 hashing of normalized content.

## Implementation Summary

### Files Created
1. **`src/services/content-fingerprint.ts`** - Content normalization and hashing service
   - `generateContentFingerprint(title, content)` - Creates SHA-256 hash from normalized text
   - `areDuplicates(hash1, hash2)` - Compares two fingerprints

2. **`drizzle/0011_add_content_hash.sql`** - Database migration
   - Adds `content_hash` column to article table
   - Creates index for fast lookups

### Files Modified
1. **`src/db/schema.ts`** (line 230)
   - Added `contentHash` field to article table

2. **`src/data-access/articles.ts`** (lines 38-48, 64-82)
   - Added `findArticleByContentHash()` function
   - Updated `createArticleIfNotExists()` to check both URL and content hash

3. **`src/fn/articles.ts`** (line 28, 148-154)
   - Import `generateContentFingerprint`
   - Generate content hash when creating articles in `fetchNewsForTopicFn`

4. **`src/use-cases/checkTopicUpdatesUseCase.ts`** (line 12, 70-74)
   - Import `generateContentFingerprint`
   - Generate content hash when creating articles in background processing

## How It Works

1. **Normalization**: Text is normalized by:
   - Converting to lowercase
   - Removing punctuation and special characters
   - Collapsing multiple whitespace to single space
   - Using first 500 chars of content (for consistency)

2. **Hashing**: SHA-256 hash is generated from `normalized_title|normalized_content`

3. **Deduplication Logic**:
   - First checks if URL already exists (existing behavior)
   - Then checks if content hash already exists (new behavior)
   - Returns existing article if either match
   - Creates new article only if both checks pass

## Benefits
- Detects syndicated articles (same AP wire story on multiple outlets)
- Detects republished articles with different URLs
- Handles minor punctuation/formatting differences
- Fast lookups via indexed `content_hash` column
- Backward compatible (existing articles have null hash)

## Verification Results
All 11 unit tests passed:
- Consistent hash generation for identical content
- Different hashes for different content
- Proper text normalization (case, punctuation)
- Null handling for empty/whitespace titles
- Correct duplicate detection logic
- SHA-256 hash format validation (64 hex characters)

## Notes for Developer
- Run `npm run db:migrate` to apply the migration
- Existing articles will have `null` contentHash
- Future enhancement: backfill script to compute hashes for existing articles
