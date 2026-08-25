# Mood Tracker AI

A responsive mood tracking application based on the Frontend Mentor Mood Tracking App challenge.

The project is being built incrementally, starting with a production-quality implementation of the original challenge and later adding carefully scoped AI personalization and lightweight gamification.

## Current status

**v0 — Phase 3 complete**

Implemented so far:

- PostgreSQL persistence model with Neon and Drizzle ORM
- Application user and mood-entry data model
- Mood-entry backend API
- Validation with Zod
- Recent mood history endpoint
- One-entry-per-user-per-day persistence rules
- Responsive Frontend Mentor dashboard UI
- Current mood presentation
- Average mood and sleep cards
- Mood/sleep trends visualization with Recharts
- Mock data for frontend development
- Backend and frontend QA passes

The frontend is currently intentionally using mock data.

Authentication, the mood logging interaction, and client/backend integration are separate upcoming phases.

## Technology stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- Recharts
- Clerk
- Neon PostgreSQL
- Drizzle ORM
- Zod
- Vitest
- React Testing Library
- Playwright
- Vercel AI SDK
- Google Gemini

## Development roadmap

### v0 — Frontend Mentor baseline

Original mood tracking application without AI or additional gamification.

Completed:

- Persistence model
- Backend/API
- Responsive dashboard UI with mock data

Next:

- Mood logging flow
- Authentication
- Client/backend integration
- Final accessibility, responsive, and production QA

### v1 — AI-enhanced mood tracker

Planned AI functionality:

- Journal entry → suggested mood, feelings, keywords, and explanation
- Personalized response based on the current mood entry
- Original Frontend Mentor responses remain available as the fallback when AI generation is unavailable or quota is exhausted

AI suggestions remain advisory and never silently modify user data.

### v1.1 — Gamification

Planned lightweight enhancements:

- AI-generated optional micro-challenges
- Deterministic achievement badges

AI will be used for personalization, while normal application logic will handle progression and rewards.

## Local development

Install dependencies:

```bash
npm install
```

Create `.env.local` using `.env.example` as reference.

Start the development server:

```bash
npm run dev
```

## Verification

Depending on the scripts defined in `package.json`:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

End-to-end tests use Playwright.

## Project principles

The application intentionally favors:

- simple architecture
- strong TypeScript
- accessible responsive UI
- relational persistence
- explicit server/client boundaries
- carefully scoped AI functionality
- small, understandable dependencies

The project is intentionally **not** an AI agent, therapy application, medical product, social network, or large recommendation system.
