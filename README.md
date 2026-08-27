# Mood Tracker AI

A responsive, authenticated mood tracking application based on the Frontend Mentor Mood Tracking App challenge, enhanced with carefully scoped AI functionality.

The project is built incrementally: first as a production-quality implementation of the original challenge, then with optional AI features that enhance the existing mood-tracking experience without turning AI into the product itself.

## Current status

**v1.0 — In progress**

The original **v0 Frontend Mentor implementation is complete**.

**v1.0 Feature 1 — AI recommendations is complete and undergoing final integration.**

**v1.0 Feature 2 — AI-assisted mood inference is in progress.**

### Implemented

- Responsive Frontend Mentor dashboard and mood logging flow
- Clerk authentication with application-owned sign-in and sign-up pages
- Clerk-to-application-user synchronization
- PostgreSQL persistence with Neon and Drizzle ORM
- Authenticated, user-scoped mood-entry API
- One mood entry per user per calendar day
- Mood, feelings, journal reflection, and sleep tracking
- Recent mood history
- Average mood and sleep statistics
- Mood and sleep trend visualization with Recharts
- Responsive mobile and desktop logging experience
- Loading, empty, error, and persistence states
- Accessible dialog and dashboard interactions
- AI-generated activity and supportive phrase recommendations
- Static mood-based suggestions when personalized AI recommendations have not been generated
- Persisted AI recommendations with one generation per mood entry
- AI recommendations for the current and three preceding mood entries
- Per-user daily AI quota with UTC reset
- Server-side Gemini integration with validated structured output
- Graceful AI quota and provider-unavailable states
- Automated backend, frontend, integration, quota, and AI tests

### In progress

- AI-assisted mood and feelings inference during mood logging
- Final v1.0 QA
- Production deployment
- Portfolio media and documentation

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
- Vercel AI SDK
- Google Gemini
- Vitest
- React Testing Library
- Playwright

## Development roadmap

### v0 — Frontend Mentor baseline

**Complete.**

Production-quality implementation of the original mood tracking challenge without AI or additional gamification.

Includes:

- Responsive dashboard
- Mood logging flow
- Authentication
- PostgreSQL persistence
- User-scoped backend API
- Mood history
- Mood and sleep statistics
- Trend visualization
- Accessible interaction states
- Client/backend integration

### v1.0 — AI-enhanced mood tracker

**In progress.**

AI is used only where it enhances an existing mood-tracking interaction. All AI requests execute server-side, use validated structured output, and are protected by per-user usage limits.

#### Feature 1 — Personalized suggestions

**Complete.**

Users can request personalized suggestions for a recently logged mood entry.

The AI uses only the individual entry's:

- mood
- feelings
- sleep
- journal reflection

It returns a small set of:

- optional activity suggestions
- short supportive phrases

Generated recommendations are persisted and can be generated only once per mood entry.

The current entry and three immediately preceding entries are eligible for AI generation.

Before AI recommendations are generated, the application provides deterministic mood-based suggestions so the core experience does not depend on AI availability.

AI generation is protected by a server-side per-user daily quota that resets at 00:00 UTC. Quota exhaustion or provider failure never prevents normal mood tracking.

#### Feature 2 — AI-assisted mood inference

**In progress.**

Users who prefer not to explicitly select their mood will be able to describe how they feel using the existing reflection flow.

AI will suggest an appropriate mood and feelings based on that description.

AI suggestions remain advisory:

- inferred values are shown to the user
- the user can review or change them
- AI never silently saves a mood on the user's behalf
- normal manual mood logging remains available when AI is unavailable

### v1.1 — Lightweight gamification

Possible future enhancement after v1.0.

Planned concepts include:

- AI-generated optional micro-challenges
- deterministic achievement badges

AI would be responsible only for personalization, while application logic would handle progression and rewards.

## AI architecture

AI functionality intentionally follows a small, explicit architecture:

```text
Application input
       ↓
Authenticated server request
       ↓
Daily quota enforcement
       ↓
Google Gemini
       ↓
Validated structured output
       ↓
Application UI
```

The project does not use agents, RAG, embeddings, vector databases, AI memory, or autonomous workflows.

AI functionality is designed to fail gracefully without breaking the underlying mood tracker.

## Local development

Install dependencies:

```bash
npm install
```

Create `.env.local` using `.env.example` as reference.

The application requires configuration for:

- Clerk
- Neon PostgreSQL
- Google Gemini
- AI model and daily request limit

Run database migrations as required by the project scripts, then start the development server:

```bash
npm run dev
```

## Verification

Run:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

End-to-end testing uses Playwright where appropriate.

The project includes automated coverage across domain validation, persistence, API behavior, authentication, client/backend integration, responsive interactions, AI quota enforcement, AI recommendation persistence, and fallback behavior.

## Project principles

The application intentionally favors:

- simple architecture
- strong TypeScript
- accessible responsive UI
- relational persistence
- explicit server/client boundaries
- server-side AI integration
- validated structured AI output
- predictable AI cost boundaries
- graceful non-AI fallbacks
- small, understandable dependencies

AI enhances existing product interactions rather than becoming the product itself.

The project is intentionally **not** an AI agent, therapy application, medical product, social network, chatbot, or complex recommendation system.
