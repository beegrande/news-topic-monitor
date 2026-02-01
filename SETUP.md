# NewsMonitor Setup Guide

This guide will help you set up the NewsMonitor application on a machine with Docker and PostgreSQL.

## Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Git

## Quick Start

### 1. Clone and Install

```bash
cd /path/to/your/projects
git clone https://github.com/beegrande/news-topic-monitor.git
cd news-topic-monitor
npm install
```

### 2. Environment Setup

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with the following values:

```env
# Database - uses Docker PostgreSQL
DATABASE_URL="postgresql://postgres:example@localhost:5432/postgres"

# Generate a secure secret (run: openssl rand -base64 32)
BETTER_AUTH_SECRET="<paste-32-char-secret-here>"

# App URL
VITE_BETTER_AUTH_URL="http://localhost:3000"

# Stripe (optional - for payments)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
VITE_STRIPE_BASIC_PRICE_ID="price_..."
VITE_STRIPE_PRO_PRICE_ID="price_..."
VITE_STRIPE_PUBLISHABLE_KEY="pk_test_..."

# R2/S3 Storage (optional - for file uploads)
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
VITE_R2_BUCKET=""
VITE_R2_ENDPOINT=""

# News API (required for article fetching)
NEWS_API_KEY="<your-newsapi-key>"

# Cron secret (for scheduled jobs)
CRON_SECRET="<random-string>"

# Email via Resend (optional)
RESEND_API_KEY=""

# Google Fact Check (optional)
GOOGLE_FACT_CHECK_API_KEY=""
```

### 3. Generate Auth Secret

```bash
openssl rand -base64 32
```

Copy the output and paste it as `BETTER_AUTH_SECRET` in `.env`.

### 4. Start Database

```bash
npm run db:up
```

This starts PostgreSQL via Docker on port 5432.

### 5. Run Migrations

```bash
npm run db:migrate
```

This creates all the required database tables.

### 6. Start Development Server

```bash
npm run dev
```

The app will be available at http://localhost:3000

## Verification Checklist

- [ ] `npm run db:up` - PostgreSQL container running
- [ ] `npm run db:migrate` - No errors
- [ ] `npm run dev` - Server starts without errors
- [ ] Can access http://localhost:3000
- [ ] Can sign up with email/password
- [ ] Can create a topic

## Common Issues

### "Database connection refused"
- Ensure Docker is running: `docker ps`
- Check PostgreSQL container: `docker ps | grep postgres`
- Restart database: `npm run db:down && npm run db:up`

### "BETTER_AUTH_SECRET too short"
- Generate new secret: `openssl rand -base64 32`
- Update `.env` with the new value
- Restart dev server

### "Port 3000 in use"
- The app will automatically try 3001, 3002, etc.
- Or kill the process: `lsof -ti:3000 | xargs kill -9`

### Database migration errors
- Ensure database is running first
- Check connection string in `.env`
- Run: `npm run db:studio` to inspect database

## Useful Commands

```bash
# Development
npm run dev              # Start dev server

# Database
npm run db:up            # Start PostgreSQL (Docker)
npm run db:down          # Stop PostgreSQL
npm run db:migrate       # Run migrations
npm run db:generate      # Generate new migration
npm run db:studio        # Open Drizzle Studio (DB GUI)

# Build
npm run build            # Production build
npm run start            # Start production server

# Stripe (for payment testing)
npm run stripe:listen    # Listen for webhooks locally
```

## Tech Stack

- **Framework**: TanStack Start (React 19)
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: Better Auth
- **Styling**: Tailwind CSS + Radix UI
- **Payments**: Stripe
- **Email**: Resend

## Project Structure

```
src/
├── routes/          # File-based routing
├── components/      # React components
├── hooks/           # Custom React hooks
├── queries/         # TanStack Query definitions
├── fn/              # Server functions
├── data-access/     # Database queries
├── use-cases/       # Business logic
├── db/              # Schema & DB config
└── services/        # External service integrations
```
