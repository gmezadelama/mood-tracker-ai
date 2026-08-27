# Mood Tracker AI

A responsive, authenticated mood tracking application based on the Frontend Mentor Mood Tracking App challenge, enhanced with carefully scoped AI functionality.

The project was built incrementally: first as a production-quality implementation of the original challenge, then with optional AI features that enhance the existing mood-tracking experience without turning AI into the product itself.

## Current status

**v1.0 — Complete**

The original **v0 Frontend Mentor implementation is complete**, including authentication, persistence, mood logging, statistics, responsive behavior, and client/backend integration.

**v1.0 Feature 1 — AI recommendations is complete.**

**v1.0 Feature 2 — AI-assisted mood identification is complete.**

The application is feature-complete for v1.0. Remaining work is limited to production deployment, production smoke testing, and portfolio presentation.

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
- Static mood-based suggestions before personalized AI recommendations are generated
- Persisted AI recommendations with one generation per mood entry
- AI recommendations for the current and three preceding mood entries
- AI-assisted mood and feelings identification from a journal reflection
- User review and editing of AI-inferred mood and feelings before persistence
- One optional second AI mood suggestion per logging session
- Shared per-user daily AI quota with UTC reset
- Low-quota and quota-exhausted UX
- Server-side Gemini integration with validated structured output
- Graceful AI quota and provider-unavailable states
- Automated backend, frontend, integration, quota, and AI tests

### Release preparation

- Production deployment
- Production smoke testing
- Demo data for portfolio capture
- Screenshots and animated demo capture
- Portfolio project entry

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
- Four-step mood logging flow
- Authentication
- PostgreSQL persistence
- User-scoped backend API
- Mood history
- Mood and sleep statistics
- Trend visualization
- Accessible interaction states
- Client/backend integration
- Loading, empty, persistence, and error states

### v1.0 — AI-enhanced mood tracker

**Complete.**

AI is used only where it enhances an existing mood-tracking interaction. AI requests execute server-side, use validated structured output, and are protected by a shared per-user daily usage limit.

Normal mood tracking remains fully functional without AI.

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

Before a personalized recommendation is generated, the application provides deterministic mood-based suggestions. These static suggestions are also available when personalized generation cannot be used, keeping the core experience independent of AI availability.

AI generation is protected by the shared server-side per-user daily quota. Quota exhaustion or provider failure never prevents normal mood tracking.

#### Feature 2 — AI-assisted mood identification

**Complete.**

Users who are unsure which mood best represents their day can choose **Help me identify my mood** and use the existing reflection step to describe how they feel.

The reflection is sent to Gemini, which returns structured suggestions for:

- mood
- one to three feelings

Only the reflection is used for inference. User identity, mood history, sleep data, previous recommendations, and other profile information are not included in the inference prompt.

The result is advisory rather than authoritative:

- inferred values are presented for review
- the user can change the suggested mood
- the user can add, remove, or replace suggested feelings
- AI never silently persists inferred values
- only the final user-confirmed entry is saved
- inference results themselves are not persisted

After a successful inference, the user may optionally request **one additional suggestion**.

A single open logging session permits at most two mood-inference requests: the initial request and one additional attempt. This session limit is separate from the shared daily AI quota.

If an inference fails, the user can return to manual selection or use a remaining inference attempt. Manual/assisted navigation cannot be used to bypass the two-attempt session limit.

Manual mood logging remains available without making an AI request or consuming AI quota.

### v1.1 — Lightweight gamification

Possible future enhancement after v1.0.

Potential concepts include:

- AI-generated optional micro-challenges
- deterministic achievement badges

AI would be responsible only for personalization, while normal application logic would handle progression and rewards.

v1.1 is not required for the completed v1.0 application.

## AI architecture

AI functionality intentionally follows a small, explicit architecture:

```text
Application input
       ↓
Authenticated server request
       ↓
Validation and eligibility checks
       ↓
Shared daily quota enforcement
       ↓
Google Gemini
       ↓
Validated structured output
       ↓
Application UI
       ↓
User review where applicable
```

The two AI features use the same per-user daily quota, which resets at 00:00 UTC.

Quota is consumed for actual provider attempts. AI functionality fails gracefully when the quota is exhausted or the provider is unavailable.

The project does not use agents, RAG, embeddings, vector databases, AI memory, or autonomous workflows.

### AI data boundaries

The two features intentionally use different amounts of context.

**Personalized recommendations** receive only the selected mood entry:

- mood
- feelings
- sleep range
- journal reflection

**Mood identification** receives only:

- journal reflection

Neither AI feature receives user identity, account information, database IDs, or mood history.

Structured AI responses are validated before they can enter application state.

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

The project includes automated coverage across:

- domain validation
- persistence
- API behavior
- authentication and user synchronization
- client/backend integration
- mood logging
- responsive interactions
- statistics and trend behavior
- AI quota enforcement
- AI recommendation persistence
- static recommendation fallback behavior
- AI mood identification
- inference review and editing
- inference retry/session limits
- shared quota synchronization
- AI provider and failure states

At completion of v1.0, the automated suite contains **180 passing tests**.

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
- user confirmation before persisting AI-inferred data
- small, understandable dependencies

AI enhances existing product interactions rather than becoming the product itself.

The project is intentionally **not** an AI agent, therapy application, medical product, social network, chatbot, or complex recommendation system.
