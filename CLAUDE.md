# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NewsMonitor is a news topic monitoring application that allows users to track news articles based on custom topics and keywords. Users create topics with keywords, and the system fetches and analyzes relevant articles from news APIs.

## Tech Stack

- **Framework**: TanStack Start (full-stack React 19 framework)
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Better Auth with email/password
- **Styling**: Tailwind CSS v4 with Radix UI components
- **Payments**: Stripe subscriptions (free/basic/pro tiers)
- **Email**: Resend for notifications and digests
- **News Data**: NewsAPI integration

## Common Development Commands

```bash
# Development
npm run dev                 # Start development server on port 3000
npm run build              # Build for production (includes TypeScript check)
npm run start              # Start production server

# Database
npm run db:up              # Start PostgreSQL Docker container
npm run db:down            # Stop PostgreSQL Docker container
npm run db:migrate         # Run database migrations
npm run db:generate        # Generate new migration files
npm run db:studio          # Open Drizzle Studio for database management

# Stripe (for payment testing)
npm run stripe:listen      # Listen for Stripe webhooks locally
```

## Architecture Overview

The application follows a strict layered architecture:

```
Routes → Components → Hooks → Queries → Fn → Use Cases → Data Access
```

### Layer Responsibilities

- **`src/routes/`** - File-based routing with TanStack Router, page composition, route loaders
- **`src/components/`** - Reusable React components; `ui/` subfolder contains Radix-based primitives
- **`src/hooks/`** - Custom React hooks wrapping TanStack Query mutations/queries with UI logic (toasts, navigation)
- **`src/queries/`** - TanStack Query definitions with query keys and options
- **`src/fn/`** - Server functions with Zod validation and authentication middleware
- **`src/use-cases/`** - Complex business logic orchestrating multiple data operations
- **`src/data-access/`** - Direct Drizzle ORM database queries
- **`src/services/`** - External service integrations (news API, sentiment analysis, email)

### Key Patterns

- **Server Functions**: Created with `createServerFn()` in `src/fn/`, use `authenticatedMiddleware` for protected endpoints
- **Data Fetching**: Route loaders use `queryClient.ensureQueryData()` to prefetch; components use `useQuery()` with query definitions from `src/queries/`
- **Mutations**: Hooks in `src/hooks/` wrap server functions with `useMutation()`, handle success/error toasts and navigation

## Database Schema

Core domain entities in `src/db/schema.ts`:

- **`topic`** - User-defined monitoring topics with keywords, frequency settings, notification preferences
- **`article`** - Fetched news articles with sentiment analysis, fact-checking, geolocation
- **`articleTopic`** - Junction table linking articles to topics with relevance scores
- **`collection`** - User-created groups of topics
- **`notification`** - In-app notifications for new articles
- **`team`**, **`teamMember`**, **`teamInvitation`** - Team collaboration
- **`webhook`** - External webhook integrations for article notifications
- **`savedSearch`** - Saved article search queries
- **`sourceCredibility`** - News source credibility ratings

User-related: `user`, `session`, `account`, `verification` (Better Auth tables)

Legacy tables (from template, not actively used): `song`, `playlist`, `playlistSong`, `heart`

## Subscription Plans

Defined in `src/config/planLimits.ts`:

| Plan  | Monitoring Frequency | Topics | Collections |
|-------|---------------------|--------|-------------|
| Free  | Daily (24h)         | 5      | 1           |
| Basic | 4x/day (6h)         | 50     | 5           |
| Pro   | Hourly (1h)         | Unlimited | Unlimited |

## Key Services

- **`src/services/news-api.ts`** - NewsAPI integration for fetching articles
- **`src/services/sentiment.ts`** - Sentiment analysis using natural language processing
- **`src/services/relevance-scoring.ts`** - Article relevance scoring for topics
- **`src/services/email.ts`** - Email notifications via Resend
- **`src/services/content-fingerprint.ts`** - Duplicate article detection

## Cron Endpoints

- **`/api/cron/check-topics`** - Fetches new articles for active topics
- **`/api/cron/send-digests`** - Sends email digests to users

## Additional Documentation

- **`docs/architecture.md`** - Detailed layered architecture explanation
- **`docs/tanstack.md`** - TanStack Start routing and server function patterns
- **`docs/authentication.md`** - Better Auth setup
- **`docs/subscriptions.md`** - Stripe integration details
- **`docs/file-uploads.md`** - S3/R2 presigned URL uploads
- **`docs/ux.md`** - UX guidelines
- **`docs/theme.md`** - Styling guidelines
