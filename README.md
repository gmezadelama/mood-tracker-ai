# Mood Tracker AI

An AI-enhanced mood tracking web application based on the Frontend Mentor mood tracking challenge. The project is currently in the bootstrap / pre-v0 stage: its production foundation is configured, but no product functionality has been implemented.

## Stack

Next.js App Router, React, TypeScript, Tailwind CSS, Clerk, Neon PostgreSQL, Drizzle ORM, Zod, Recharts, Vercel AI SDK with Google Gemini, Vitest, React Testing Library, and Playwright.

shadcn/ui components may be added selectively when an accessible primitive is needed. No shadcn components or supporting utility dependencies are included during bootstrap.

## Roadmap

- **v0:** Frontend Mentor baseline
- **v1:** AI-assisted mood insights and personalized responses
- **v1.1:** Personalized challenges and deterministic achievements

## Local setup

1. Use an active Node.js LTS release.
2. Install dependencies with `npm install`.
3. Copy `.env.example` to `.env.local` and provide the services needed for the feature you are working on.
4. Start the application with `npm run dev`.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk browser-safe publishable key |
| `CLERK_SECRET_KEY` | Clerk server-side secret key |
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini API key used only on the server |

## Commands

- `npm run lint` — lint the project
- `npm run typecheck` — run TypeScript without emitting files
- `npm test` — run unit/component tests once
- `npm run test:watch` — run unit/component tests in watch mode
- `npm run test:e2e` — run Playwright smoke tests
- `npm run build` — create a production build
