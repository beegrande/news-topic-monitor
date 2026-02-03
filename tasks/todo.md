# Dark Theme Redesign - Full Application (COMPLETED)

## Overview
Updated the entire application to use a dark theme by default, matching the ComplianceSuite/PAMS design:
- Near-black background (`oklch(0.08 0 0)`)
- Orange/amber accent colors
- All pages consistently dark
- Removed all light-themed color classes

## Changes Made

### Theme File (`src/styles/app.css`)
- Updated `:root` to use dark colors as default (not just `.dark` class)
- Background: `oklch(0.08 0 0)` (near-black)
- Primary: `oklch(0.65 0.18 50)` (orange/amber)
- Card/popover: `oklch(0.12 0.005 250)` (dark gray)
- Updated sidebar colors for PAMS branding

### Sign-In Page (`src/routes/sign-in.tsx`)
- Changed aside from light gradient to `bg-background`
- Updated decorative elements to use `primary` color
- Changed button from red/orange gradient to `bg-primary`
- Updated all text colors to theme variables

### Sign-Up Page (`src/routes/sign-up.tsx`)
- Same updates as sign-in page
- Removed `from-orange-50 to-red-50` gradient
- Updated to use `bg-background`, `text-foreground`, `text-muted-foreground`

### Component Updates
- `TopicMonitoringStatus.tsx` - Removed `bg-red-50`, kept `bg-red-950/30`
- `ArticleCard.tsx` - Removed light-themed classes, kept dark variants
- `WebhookSettings.tsx` - Removed `bg-red-50`, `bg-green-100`, `bg-gray-100`
- `settings.tsx` - Removed `bg-white`, `bg-gray-200`, updated to `bg-card`, `bg-muted`
- `ApiKeySettings.tsx` - Updated skeleton loaders to `bg-muted`
- `NotFound.tsx` - Updated to `text-muted-foreground`
- `SourceFeedbackDialog.tsx` - Simplified star colors for dark theme
- `article/$id/index.tsx` - Removed light-themed sentiment badge colors

### Hero.tsx
Already using theme variables (`text-primary`, `bg-primary/20`, etc.) - no changes needed

### Header.tsx & Footer.tsx
Already using theme variables (`bg-background`, `text-foreground`, etc.) - no changes needed

## Verification
- All pages now render with dark background
- Orange/amber accents visible for primary actions
- Consistent dark theme across the entire application

---

# UI Redesign - ComplianceSuite Inspired (COMPLETED)

## Overview
Redesign the NewsMonitor app UI inspired by ComplianceSuite with:
- Dark blue sidebar navigation
- Professional stat cards
- Dark header with logo
- Clean, professional design

## Design Inspiration Analysis
From ComplianceSuite design inspiration images:
- Dark sidebar navigation with icons
- Large stat cards with prominent numbers
- Dark header bar with logo
- Tables/lists for data display
- Orange/amber accent colors (keeping existing primary color)
- The PAMS logo uses dark navy blue: approximately #1a365d

## Todo Items

- [x] Update color scheme with new dark blue sidebar colors
- [x] Create AppSidebar component with navigation
- [x] Create SidebarLayout wrapper component
- [x] Create StatCard component for dashboard metrics
- [x] Update root layout to use sidebar for authenticated users
- [x] Update dashboard to show stat cards
- [x] Test the new layout works correctly

## Review Section

### Summary
Successfully redesigned the NewsMonitor app UI inspired by ComplianceSuite with a dark blue sidebar navigation, professional stat cards, and a clean layout. The redesign maintains backward compatibility with public pages (landing, sign-in, sign-up) using the original header/footer layout while authenticated users get the new sidebar-based navigation.

### Changes Made

**CSS Changes** (`src/styles/app.css`):
- Updated sidebar colors to dark navy blue theme
- Added `--sidebar-muted` color variable for inactive navigation items
- Light mode: `oklch(0.2 0.03 250)` for sidebar background
- Dark mode: `oklch(0.18 0.03 250)` for sidebar background

**New Components**:
1. `AppSidebar.tsx` - Collapsible sidebar with:
   - Dark navy blue background
   - Logo header with NewsMonitor branding
   - Main navigation (Dashboard, Topics, Search, Collections, Saved Searches, Teams)
   - Bottom navigation (Notifications, Settings, Sign Out)
   - Collapse toggle with tooltip support when collapsed

2. `SidebarLayout.tsx` - Layout wrapper providing:
   - Desktop sidebar (hidden on mobile)
   - Mobile sidebar via Sheet component
   - Top bar with mobile menu, notifications, theme toggle, and avatar
   - Main content area with subtle background

3. `StatCard.tsx` - Dashboard metrics component with:
   - Label, value, description, icon support
   - Color variants (default, success, warning, danger)
   - Trend display option
   - Skeleton loading state

**Route Changes** (`__root.tsx`):
- Added `AppContent` component for conditional layout rendering
- Public routes (/, /sign-in, /sign-up, etc.) use header/footer layout
- Authenticated app pages use the new SidebarLayout

**Dashboard Updates** (`dashboard.tsx`):
- Added stat cards showing Total Topics, Active Topics, Total Articles, Alert Topics
- Stats calculated from topics data with proper loading states

### Features
- Dark blue sidebar inspired by ComplianceSuite/PAMS design
- Collapsible sidebar with tooltips when collapsed
- Stat cards with color-coded values
- Responsive design (sidebar collapses to sheet on mobile)
- Maintains existing header/footer for public pages

### Build Status
- Vite build: SUCCESS
- Pre-existing TypeScript errors (unrelated to redesign changes)

## Files to Create
1. `src/components/AppSidebar.tsx` - Sidebar navigation component
2. `src/components/SidebarLayout.tsx` - Layout wrapper with sidebar
3. `src/components/StatCard.tsx` - Stat card for metrics

## Files to Modify
1. `src/styles/app.css` - Add new sidebar colors (dark blue theme)
2. `src/routes/__root.tsx` - Use sidebar layout for authenticated users
3. `src/routes/dashboard.tsx` - Add stat cards at the top

## Color Palette (Navy Blue Theme)
Based on PAMS logo and design inspiration:
- Sidebar background: `oklch(0.2 0.03 250)` (dark navy blue)
- Sidebar foreground: `oklch(0.95 0 0)` (white text)
- Sidebar accent: `oklch(0.3 0.035 250)` (lighter navy for hover)
- Keep existing orange primary for accents

## Implementation Notes
- Keep mobile responsive (sidebar collapses on mobile)
- Maintain existing Header for non-authenticated pages
- Use Radix UI Sheet for mobile sidebar
- Follow existing component patterns

---

# Rebrand from SoundStation to News Topic Monitor

## Problem Statement
The app was built from a music streaming template called "SoundStation". While the backend and core functionality are fully built for news monitoring, the branding, landing page, and navigation still show the old music app identity.

## Current State Analysis

### What's Wrong
1. **App Name**: Shows "SoundStation" in header, footer, sign-in/sign-up pages
2. **Landing Page (Hero)**: Promotes music uploading and sharing
3. **Icons**: Uses `AudioWaveform` and `Music` icons instead of news-related icons
4. **Navigation**: Has music-related links (My Songs, My Playlists, Upload, Browse)
5. **Testimonials**: Sign-in page has testimonials about music content creation
6. **Docs**: ux.md and theme.md reference "SoundStation"
7. **Footer**: Copyright says "SoundStation"

### What's Working (News Features)
- Dashboard with topic monitoring
- Topics page with hierarchy
- Article search and filtering
- Webhooks, alerts, email digests
- Collections, teams, saved searches
- Source credibility, recommendations

## Implementation Plan (COMPLETED)

### Phase 1: Choose App Name & Identity
- [x] Decide on app name: **NewsMonitor**
- [x] Choose appropriate icon: **Newspaper** from lucide-react

### Phase 2: Header Component (`src/components/Header.tsx`)
- [x] Replace "SoundStation" with "NewsMonitor"
- [x] Replace `AudioWaveform` icon with `Newspaper` icon
- [x] Update navigation links (Home, Dashboard, Topics, Search)
- [x] Remove music-related nav items (My Songs, My Playlists, Upload, Browse)
- [x] Remove playlist button functionality
- [x] Clean up unused imports

### Phase 3: Hero Component (`src/components/Hero.tsx`)
- [x] Rewrite headline: "Monitor the News That Matters with NewsMonitor"
- [x] Rewrite description for news monitoring
- [x] Update CTA button to "Get Started" linking to dashboard
- [x] Replace feature icons/labels (Monitor Topics, Get Alerts, Track News)
- [x] Update decorative card content

### Phase 4: Footer Component (`src/components/Footer.tsx`)
- [x] Replace "SoundStation" with "NewsMonitor"
- [x] Update copyright text
- [x] Replace `Music` icon with `Newspaper` icon

### Phase 5: Sign-In Page (`src/routes/sign-in.tsx`)
- [x] Update testimonials with news monitoring use cases
- [x] Update SoundStation references to NewsMonitor

### Phase 6: Sign-Up Page (`src/routes/sign-up.tsx`)
- [x] Update SoundStation references to NewsMonitor
- [x] Update copy/stats for news monitoring context

### Phase 7: Documentation Updates
- [x] Update `docs/ux.md` - SoundStation → NewsMonitor
- [x] Update `docs/theme.md` - SoundStation → NewsMonitor

### Phase 8: Music Feature Removal
- [x] Deleted music routes: `/browse`, `/upload`, `/my-songs`, `/playlists`, `/song/$id`
- [x] Deleted music components: MusicPlayer, PlaylistSheet, PlaylistCard, SongCard, etc.
- [x] Deleted playlist-provider
- [x] Deleted music hooks, queries, data-access files
- [x] Cleaned up __root.tsx to remove music player integration
- [x] Updated DefaultCatchBoundary to use /dashboard instead of /browse

## Review Section

### Summary
Successfully rebranded the application from "SoundStation" (music streaming) to "NewsMonitor" (news topic monitoring). Removed all music-related features and updated the entire public-facing UI to reflect the news monitoring purpose.

### Files Modified
- `src/components/Header.tsx` - New branding, updated navigation
- `src/components/Hero.tsx` - Complete rewrite for news focus
- `src/components/Footer.tsx` - New branding
- `src/routes/sign-in.tsx` - Updated testimonials and branding
- `src/routes/sign-up.tsx` - Updated copy and branding
- `src/routes/__root.tsx` - Removed music player, updated SEO
- `src/components/DefaultCatchBoundary.tsx` - Updated fallback link
- `docs/ux.md` - Updated app name reference
- `docs/theme.md` - Updated app name reference
- `src/components/CollectionCard.tsx` - Fixed import
- `src/components/SavedSearchCard.tsx` - Fixed import
- `src/components/TopicCard.tsx` - Fixed import
- `src/components/TopicMonitoringStatus.tsx` - Fixed import
- `src/utils/storage/helpers.ts` - Removed video upload, kept image upload

### Files Created
- `src/utils/date.ts` - Utility for relative time formatting

### Files Deleted (Music Features)
**Routes:**
- `src/routes/browse.tsx`
- `src/routes/my-songs.tsx`
- `src/routes/playlists.tsx`
- `src/routes/upload.tsx`
- `src/routes/song/` (directory)

**Components:**
- `src/components/MusicPlayer.tsx`
- `src/components/PlaylistCard.tsx`
- `src/components/PlaylistLimitDialog.tsx`
- `src/components/PlaylistSheet.tsx`
- `src/components/playlist-provider.tsx`
- `src/components/SongCard.tsx`
- `src/components/SongGridSkeleton.tsx`
- `src/components/SongPreviewPlayer.tsx`
- `src/components/CreatePlaylistDialog.tsx`
- `src/components/EditPlaylistDialog.tsx`
- `src/components/VideoCard.tsx`

**Data Layer:**
- `src/data-access/songs.ts`
- `src/data-access/playlists.ts`
- `src/fn/songs.ts`
- `src/fn/playlists.ts`
- `src/fn/audio-storage.ts`
- `src/hooks/useSongs.ts`
- `src/hooks/usePlaylists.ts`
- `src/hooks/useAddToPlaylist.ts`
- `src/hooks/useSongBreadcrumbs.ts`
- `src/hooks/useAudioStorage.ts`
- `src/queries/songs.ts`
- `src/queries/playlists.ts`
- `src/queries/audio-storage.ts`
- `src/use-cases/createPlaylistUseCase.ts`
- `src/use-cases/deletePlaylistUseCase.ts`
- `src/use-cases/getOrCreateDefaultPlaylistUseCase.ts`
- `src/utils/song.ts`
- `src/utils/video.ts`
- `src/utils/video-duration.ts`
- `src/utils/audio-duration.ts`
- `src/utils/storage/audio-helpers.ts`

### Verification
- Build passes (vite build successful)
- Pre-existing TypeScript errors remain but are unrelated to rebranding

### New Brand Identity
- **Name:** NewsMonitor
- **Icon:** Newspaper (lucide-react)
- **Tagline:** "Monitor the news that matters"
- **Navigation:** Home, Dashboard, Topics, Search, Collections, Saved Searches, Teams

---

# Webhook Integration Feature (COMPLETED)

## Overview
Allow users to configure webhooks that trigger when new articles match their topics. This enables integration with external tools like Slack, Zapier, etc.

## Implementation Plan

### Phase 1: Database Schema
- [x] Add `webhook` table to schema with fields:
  - `id` (text, primary key)
  - `userId` (text, foreign key to user)
  - `topicId` (text, nullable foreign key to topic - null means all topics)
  - `name` (text, display name for the webhook)
  - `url` (text, the webhook endpoint URL)
  - `secret` (text, nullable secret for signing payloads)
  - `isEnabled` (boolean, default true)
  - `lastTriggeredAt` (timestamp, nullable)
  - `lastError` (text, nullable)
  - `createdAt` (timestamp)
  - `updatedAt` (timestamp)
- [x] Add relations for webhook table
- [x] Export types for webhook

### Phase 2: Data Access Layer
- [x] Create `src/data-access/webhooks.ts` with CRUD operations

### Phase 3: Server Functions
- [x] Create `src/fn/webhooks.ts` with CRUD server functions

### Phase 4: Hooks & Queries
- [x] Create `src/queries/webhooks.ts` with query options
- [x] Create `src/hooks/useWebhooks.ts` with hooks

### Phase 5: Webhook Trigger Service
- [x] Create `src/services/webhook-trigger.ts`

### Phase 6: Integrate with Alert System
- [x] Modify `sendTopicAlertsUseCase.ts` to trigger webhooks

### Phase 7: UI Components
- [x] Create `src/components/WebhookSettings.tsx`
- [x] Add WebhookSettings to settings page

### Phase 8: Database Migration
- [x] Generate migration file

### Phase 9: Testing & Verification
- [x] Create Playwright verification test
- [x] Clean up test files

## Review Section

### Summary
Successfully implemented webhook integration feature that allows users to configure webhooks to receive real-time notifications when new articles match their monitored topics.

### Changes Made
1. **Database Schema** (`src/db/schema.ts`):
   - Added `webhook` table with all necessary fields
   - Added `webhookRelations` for user and topic relationships
   - Exported `Webhook`, `CreateWebhookData`, and `UpdateWebhookData` types

2. **Data Access Layer** (`src/data-access/webhooks.ts`):
   - Full CRUD operations: `createWebhook`, `findWebhookById`, `findWebhookByIdWithTopic`, `findWebhooksByUserId`
   - Topic matching: `findWebhooksForTopic` - finds webhooks for specific topic OR user's "all topics" webhooks
   - Status updates: `updateWebhookLastTriggered`, `updateWebhookError`
   - Ownership check: `checkWebhookOwnership`

3. **Server Functions** (`src/fn/webhooks.ts`):
   - `getWebhooksFn` - List user's webhooks
   - `getWebhookByIdFn` - Get single webhook with authorization check
   - `createWebhookFn` - Create with URL validation and topic ownership verification
   - `updateWebhookFn` - Update with authorization
   - `deleteWebhookFn` - Delete with authorization
   - `testWebhookFn` - Send test payload to verify integration

4. **Query Definitions** (`src/queries/webhooks.ts`):
   - `getWebhooksQuery` - List all webhooks
   - `getWebhookByIdQuery` - Single webhook with enabled flag

5. **React Hooks** (`src/hooks/useWebhooks.ts`):
   - `useWebhooks` - Fetch webhooks list
   - `useWebhook` - Fetch single webhook
   - `useCreateWebhook` - Create mutation with toast notifications
   - `useUpdateWebhook` - Update mutation with cache invalidation
   - `useDeleteWebhook` - Delete mutation
   - `useTestWebhook` - Test webhook mutation

6. **Webhook Trigger Service** (`src/services/webhook-trigger.ts`):
   - `WebhookPayload` interface with event type, timestamp, topic, and article info
   - `generateSignature` - HMAC-SHA256 signature generation for secure webhooks
   - `triggerWebhook` - Send POST request with proper headers and signature
   - `triggerWebhooksForArticle` - Trigger all matching webhooks for an article
   - `triggerWebhooksForArticles` - Batch processing for multiple articles

7. **Alert System Integration** (`src/use-cases/sendTopicAlertsUseCase.ts`):
   - Added webhook triggering alongside email/in-app notifications
   - Result now includes `webhooksTriggered` and `webhooksFailed` counts
   - Webhook errors are collected but don't block other notifications

8. **UI Component** (`src/components/WebhookSettings.tsx`):
   - `WebhookSettings` card component for settings page
   - `WebhookCard` - Individual webhook display with enable/disable, test, edit, delete
   - `WebhookFormDialog` - Create/edit form with topic selector, URL validation, secret input
   - Loading states and error display

9. **Settings Page Integration** (`src/routes/settings.tsx`):
   - Added WebhookSettings section between Notifications and Subscriptions

### Files Created
- `src/data-access/webhooks.ts` - Data access layer
- `src/fn/webhooks.ts` - Server functions
- `src/queries/webhooks.ts` - TanStack Query definitions
- `src/hooks/useWebhooks.ts` - React hooks
- `src/services/webhook-trigger.ts` - Webhook trigger service
- `src/components/WebhookSettings.tsx` - UI component
- `drizzle/0024_lying_mentallo.sql` - Database migration

### Files Modified
- `src/db/schema.ts` - Added webhook table and types
- `src/use-cases/sendTopicAlertsUseCase.ts` - Integrated webhook triggering
- `src/routes/settings.tsx` - Added WebhookSettings component

### Features
- Create, edit, and delete webhooks with a user-friendly interface
- Configure webhooks for specific topics or all topics at once
- Optional HMAC-SHA256 signing with custom secret for secure integrations
- Test webhook functionality to verify endpoint before going live
- Enable/disable webhooks without deleting them
- Error tracking with last error message displayed
- Automatic triggering when new articles match monitored topics
- Payload includes topic info, article details, timestamp, and event type
- Headers include signature, event type, and timestamp for verification

### Verification Status
- All 12 Playwright verification tests passed
- Schema exports validated
- Data access functions validated
- Server functions validated
- Query definitions validated
- Hooks validated
- Service functions validated
- UI component validated
- Settings page integration validated
- Database migration file validated
- Temporary test file deleted after verification

---

# Topic Scheduling Feature Implementation (COMPLETED)

## Overview
Set custom monitoring schedules for each topic (e.g., only during business hours, specific days). Optimizes API usage.

## Implementation Plan

### 1. Database Schema (`src/db/schema.ts`)
- [x] Add `scheduleEnabled` boolean field to topic table
- [x] Add `scheduleDays` text field for comma-separated days (0=Sun, 1=Mon, etc.)
- [x] Add `scheduleStartHour` integer field (0-23)
- [x] Add `scheduleEndHour` integer field (0-23)
- [x] Add `scheduleTimezone` text field (e.g., "America/New_York")

### 2. Database Migration
- [x] Migration file `drizzle/0023_wild_preak.sql` created

### 3. Data Access Layer (`src/data-access/topics.ts`)
- [x] `findActiveTopicsDueForCheck` includes schedule fields
- [x] Topics returned with all schedule settings

### 4. Server Function (`src/fn/topics.ts`)
- [x] `updateTopicFn` accepts schedule settings
- [x] `importTopicsFn` handles schedule in import

### 5. Use Case (`src/use-cases/checkTopicUpdatesUseCase.ts`)
- [x] `isWithinSchedule` function checks if topic should be monitored now
- [x] Timezone conversion using Intl.DateTimeFormat
- [x] Day of week and hour range validation
- [x] Support for schedules crossing midnight

### 6. UI Component (`src/components/TopicScheduleSettings.tsx`)
- [x] Toggle to enable/disable schedule
- [x] Day selector with clickable buttons
- [x] Start/end hour dropdowns
- [x] Timezone selector with common timezones

### 7. Edit Topic Dialog Integration
- [x] Added TopicScheduleSettings to EditTopicDialog
- [x] Form data includes schedule fields
- [x] Schedule saved when updating topic

### 8. Verification
- [x] Playwright tests passed (9 tests)
- [x] Build successful with no TypeScript errors

## Review Section

### Summary
Successfully implemented topic scheduling feature allowing users to set custom monitoring schedules for each topic.

### Changes Made
- Created `TopicScheduleSettings` component for schedule configuration UI
- Updated `EditTopicDialog` to include the schedule settings section
- Backend already had schedule logic implemented in `checkTopicUpdatesUseCase.ts`

### Files Created
- `src/components/TopicScheduleSettings.tsx` - UI component for schedule configuration

### Files Modified
- `src/components/EditTopicDialog.tsx` - Added schedule settings integration

### Files Already in Place (from previous implementation)
- `src/db/schema.ts` - Schedule fields in topic table
- `drizzle/0023_wild_preak.sql` - Migration for schedule columns
- `src/fn/topics.ts` - Server function with schedule validation
- `src/data-access/topics.ts` - Includes schedule fields
- `src/use-cases/checkTopicUpdatesUseCase.ts` - `isWithinSchedule` function

### Features
- Enable/disable schedule per topic
- Select specific days of the week (Mon-Sun)
- Set monitoring window hours (e.g., 9 AM - 5 PM)
- Timezone support with common timezone presets
- Schedules that cross midnight supported

### Verification Status
- All 9 Playwright tests passed
- Build successful with no TypeScript errors
- Temporary test file deleted after verification

---

# Previous Completed Tasks

## Trending Topics Feature (COMPLETED)
Display trending topics across all users to help discover new topics to monitor.

### Files Created
- `src/components/TrendingTopicsCard.tsx` - Component for displaying trending topics

### Files Modified
- `src/data-access/topics.ts` - Added getTrendingTopics function
- `src/fn/topics.ts` - Added getTrendingTopicsFn server function
- `src/queries/topics.ts` - Added getTrendingTopicsQuery
- `src/hooks/useTopics.ts` - Added useTrendingTopics hook
- `src/routes/dashboard.tsx` - Added TrendingTopicsCard

---

## Topic Hierarchy Feature (COMPLETED)
Support parent-child topic relationships for better organization (e.g., 'Technology' > 'AI' > 'Machine Learning').

### Changes Made:
- Added `parentId` and `position` fields to topic schema
- Generated database migration (0022_tricky_meltdown.sql)
- Updated data access layer with hierarchy functions
- Updated server functions to support parent topics
- Updated hooks for hierarchy support
- Updated CreateTopicDialog to allow selecting parent
- Updated EditTopicDialog to allow changing parent
- Updated topics list page to display hierarchy with expand/collapse

### Files Modified:
- `src/db/schema.ts` - Added parentId, position fields and parent/children relations
- `src/data-access/topics.ts` - Added hierarchy functions (findRootTopicsByUserId, findChildTopics, buildTopicHierarchy, etc.)
- `src/fn/topics.ts` - Added server functions (getTopicHierarchyFn, moveTopicFn, getAvailableParentTopicsFn)
- `src/queries/topics.ts` - Added query definitions for hierarchy
- `src/hooks/useTopics.ts` - Added hooks (useTopicHierarchy, useMoveTopic, useAvailableParentTopics)
- `src/components/CreateTopicDialog.tsx` - Added parent topic selector
- `src/components/EditTopicDialog.tsx` - Added parent topic selector
- `src/routes/topics.tsx` - Added hierarchy view with expand/collapse

### Files Created:
- `drizzle/0022_tricky_meltdown.sql` - Migration for parentId and position columns

### Features:
- Hierarchical topic organization (unlimited nesting)
- Visual display of topic hierarchy with expand/collapse
- Add subtopics directly from parent topic menu
- Change parent topic when editing
- Cycle detection prevents invalid parent assignments
- Position ordering for sibling topics

### Verification:
- All 13 Playwright tests passed
- Schema exports validated
- Data access functions validated
- Server functions validated
- Query definitions validated
- Hooks validated
- UI components validated
- Route file validated

## Source Credibility Scoring Feature (COMPLETED)
Maintain and display credibility ratings for news sources based on journalistic standards and user feedback.

### Changes Made:
- Added `sourceCredibility` and `sourceFeedback` tables to database schema
- Created data access layer for source credibility and feedback CRUD operations
- Created server functions for getting/updating credibility data and user feedback
- Created TanStack Query definitions and React hooks for data fetching
- Created SourceCredibilityBadge component for displaying source ratings
- Created SourceFeedbackDialog component for submitting user ratings
- Integrated credibility badge into ArticleCard (clickable source name opens feedback dialog)
- Created source credibility scoring service with weighted score calculation

### Files Created:
- `src/db/schema.ts` - Added sourceCredibility and sourceFeedback tables
- `src/data-access/source-credibility.ts` - Data access functions for credibility
- `src/data-access/source-feedback.ts` - Data access functions for feedback
- `src/fn/source-credibility.ts` - Server functions
- `src/queries/source-credibility.ts` - TanStack Query definitions
- `src/hooks/useSourceCredibility.ts` - React hooks
- `src/components/SourceCredibilityBadge.tsx` - Badge component
- `src/components/SourceFeedbackDialog.tsx` - Feedback dialog
- `src/services/source-credibility.ts` - Scoring service
- `drizzle/0021_steady_romulus.sql` - Database migration

### Files Modified:
- `src/components/ArticleCard.tsx` - Added credibility badge and feedback dialog integration

### Features:
- Credibility score based on weighted calculation (40% user feedback, 40% accuracy, 20% transparency)
- User ratings (1-5 stars) with optional written feedback
- Credibility labels: Highly Reliable, Reliable, Mixed, Questionable, Unreliable
- Color-coded badges (green, blue, yellow, orange, red)
- Bias rating support (-1 to 1 scale)
- Click on source name in article cards to rate the source

### Verification:
- All 14 Playwright tests passed
- Schema exports validated
- Service calculations validated
- Server function input validation tested
- Data access type structures verified
- Query key structure validated

## Saved Searches Feature (COMPLETED)
Successfully implemented saved searches feature allowing users to save complex article search queries for quick access.

### Changes Made:
- Added `savedSearch` table to database schema for storing search queries
- Created full data access layer with CRUD functions and ownership checks
- Created server functions for authenticated search operations
- Created TanStack Query definitions and React hooks
- Created UI components: SaveSearchDialog, EditSavedSearchDialog, SavedSearchCard
- Created /saved-searches route page with list, edit, delete, and run functionality
- Added Save Search button to /search page (appears when query is present)
- Added Saved Searches links to navigation (header dropdown and mobile menu)

### Files Created:
- `src/data-access/saved-searches.ts` - Data access layer functions
- `src/fn/saved-searches.ts` - Server functions
- `src/queries/saved-searches.ts` - TanStack Query definitions
- `src/hooks/useSavedSearches.ts` - React hooks
- `src/components/SaveSearchDialog.tsx` - Dialog to save current search
- `src/components/EditSavedSearchDialog.tsx` - Dialog to edit saved search name/description
- `src/components/SavedSearchCard.tsx` - Card component for displaying saved searches
- `src/routes/saved-searches.tsx` - Saved searches list page

### Files Modified:
- `src/db/schema.ts` - Added savedSearch table and types
- `src/routes/search.tsx` - Added Save Search button and Saved Searches link
- `src/components/Header.tsx` - Added Saved Searches links to navigation

### Usage:
1. Go to /search and enter a search query with optional filters
2. Click "Save Search" button to save the current query and filters
3. Access saved searches from /saved-searches or navigation menu
4. Click "Run" on any saved search to execute it with the preserved filters

### Verification:
- All 10 Playwright tests passed
- Schema exports validated
- Data access functions validated
- Server functions validated
- Query definitions validated
- Hooks validated
- UI components validated
- Route file validated
- Page navigation tested

## RSS Feed Generation (COMPLETED)
Successfully implemented private RSS feed generation for topics and collections.

### Changes Made:
- Added `feedToken` field to `topic` and `collection` tables for authentication
- Created data access functions for feed token management
- Created API routes: `/api/feeds/topic/$id/rss` and `/api/feeds/collection/$id/rss`
- Added server functions for generating/revoking feed tokens
- RSS feeds use standard RSS 2.0 format with Atom namespace

### Files Created:
- `src/routes/api/feeds/topic/$id/rss.ts` - Topic RSS feed endpoint
- `src/routes/api/feeds/collection/$id/rss.ts` - Collection RSS feed endpoint
- `drizzle/0021_add_feed_token.sql` - Database migration

### Files Modified:
- `src/db/schema.ts` - Added feedToken fields
- `src/data-access/topics.ts` - Added feed token functions
- `src/data-access/collections.ts` - Added feed token functions
- `src/fn/topics.ts` - Added feed token server functions
- `src/fn/collections.ts` - Added feed token server functions

### Usage:
1. Generate feed token via `generateTopicFeedTokenFn` or `generateCollectionFeedTokenFn`
2. Access feed at `/api/feeds/topic/{id}/rss?token={feedToken}`

## Multi-Language Support (COMPLETED)
Successfully implemented multi-language support for monitoring and storing articles.

## Geo-Filtering Feature (COMPLETED)
Successfully implemented geo-filtering with location extraction, country filtering, and analytics visualization.

## Export Functionality Feature (COMPLETED)
Implemented export functionality for CSV/JSON formats.

## Article Recommendations Feature (COMPLETED)
Implemented collaborative filtering recommendations.

---

# Fix Broken UI Components (COMPLETED)

## Overview
Fixed broken navigation links and removed non-existent route from publicRoutes.

## Completed Tasks

- [x] Fix NotificationDropdown broken navigation link
  - Changed route from `/topics/$topicId` to `/topic/$id/articles`
  - Added null handling for `notification.topicId` (falls back to `/topics` if null)

- [x] Remove /pricing from publicRoutes array
  - Removed non-existent `/pricing` route from the publicRoutes array in `__root.tsx`

- [x] Fix ArticleCard Reader Mode link
  - Changed from template literal `/article/${article.id}` to typed route `/article/$id` with params

## Files Modified

1. `src/components/NotificationDropdown.tsx`
   - Lines 86-90: Changed broken route and added null handling for topicId

2. `src/routes/__root.tsx`
   - Line 86: Removed `/pricing` from publicRoutes array

3. `src/components/ArticleCard.tsx`
   - Lines 362-363: Changed to proper TanStack Router Link with params

## Review

### Changes Made
All three planned fixes were implemented:
1. NotificationDropdown now correctly navigates to `/topic/$id/articles` when clicking notifications
2. The non-existent `/pricing` route was removed from the public routes array
3. ArticleCard Reader Mode link now uses proper typed routing

### Pre-existing TypeScript Errors
The following errors existed before this fix and are unrelated to the navigation changes:
- `src/data-access/recommendations.ts` - Type mismatch in ArticleWithRelevance
- `src/lib/stripe.ts` - Stripe API version mismatch
- `src/routes/dashboard.tsx` - Missing search params for Link
- `src/routes/recommendations.tsx` - Missing search params for Link
- `src/routes/teams.tsx` - Missing search params for Link (2 instances)

### Build Status
- Vite build: SUCCESS
- TypeScript errors are pre-existing and not introduced by this change

### Testing Notes
Manual testing recommended for:
- Click notification in dropdown → should navigate to topic articles
- Click "Read in Reader Mode" on article card → should open article reader
