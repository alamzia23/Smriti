<div align="center">

# Smriti (स्मृति)

**Fix it once. Remember it forever.**

A shared memory for every incident, so the same fire never burns twice.

Four memory operations, `remember()`, `recall()`, `improve()`, and `forget()`, powered by [Cognee](https://www.cognee.ai).

</div>

## What it is

On call teams keep solving the same outages. The context lives in someone's head,
a stale runbook, or a Slack thread nobody can find at 3 a.m. Smriti turns every
resolved incident into durable, queryable team memory.

When a new alert fires, you paste it into Smriti and it recalls the matching past
incident: the root cause, the fix that actually worked, and who fixed it, grounded
in a knowledge graph rather than keyword search. Ingestion is automatic through a
signed webhook, so the memory keeps itself up to date with zero manual entry.

The matching intelligence is entirely Cognee's `recall()`. There is no hard coded
rules engine. Smriti only normalizes Cognee's output and renders it.

## Cognee is the hero

All four memory operations do real work against Cognee Cloud.

* **remember()** ingests a resolved incident as a document into the memory graph,
  through `POST /api/incidents/webhook` (HMAC signed).
* **recall()** matches a new alert against graph grounded memory and ranks the hits,
  through `POST /api/recall`.
* **improve()** re cognifies the dataset to strengthen connections across incidents,
  through `POST /api/memory/consolidate`.
* **forget()** prunes stale or incorrect memory so recall stays accurate,
  through `POST /api/memory/retire`.

`src/lib/cognee.ts` is the only module that talks to Cognee Cloud, and it runs
server side exclusively, so the API key never reaches the browser bundle.

## Features

* **Interactive memory graph.** A force directed view of services, incidents, root
  causes, and engineers. Click any node to focus its neighborhood and open a memory
  popover. Recall lights up the matched path.
* **Pattern insights.** Chronic services and top recurring root causes, surfaced
  from consolidated memory.
* **On call handoff brief.** A one click summary of what broke, what to watch, and
  the fixes to know, for a clean shift handover.
* **Automatic ingestion.** A signed webhook accepts resolved incidents. The
  "Simulate resolved incident" button demonstrates the end to end signed flow.
* **Light and dark themes.** A full design token system that is aware of the system
  preference.

## Security

Security is treated as a first class feature, not an afterthought.

* **Session auth** (Auth.js v5) with one click guest access, plus optional GitHub
  OAuth that only activates when credentials are configured. Every page and API
  route is gated by default. Unauthenticated requests are redirected to `/signin`
  for pages, or rejected with `401` for the API.
* **Role based access.** Guests get read, recall, and simulate. The destructive
  `improve()` and `forget()` operations additionally require a member session and an
  admin secret, so there is never a single gate.
* **HMAC signed webhook.** The ingestion endpoint verifies an HMAC signature with a
  constant time comparison. It is authenticated by signature, not by session.
* **Input validation.** Every payload is parsed and length capped with [Zod](https://zod.dev)
  before it touches Cognee.
* **Rate limiting** per client on recall, simulate, consolidate, and retire.
* **Content Security Policy.** A per request nonce based CSP, plus
  `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and
  `Permissions-Policy`, all set in the proxy.
* **Same origin enforcement** and server only secret handling throughout.

## Tech stack

* [Next.js 16](https://nextjs.org) (App Router, Turbopack), React 19, TypeScript
* [Tailwind CSS v4](https://tailwindcss.com) with a CSS variable design token system
* [Auth.js v5](https://authjs.dev) (`next-auth@beta`) and [next-themes](https://github.com/pacocoursey/next-themes)
* [Cognee Cloud](https://www.cognee.ai) REST API for the memory graph
* A custom SVG force directed graph with a deterministic Fruchterman Reingold layout
* [Zod](https://zod.dev) for validation

## Getting started

### Prerequisites

* Node.js 20 or newer
* A [Cognee Cloud](https://www.cognee.ai) account and API key

### 1. Install

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.local.example .env.local
```

Fill in `.env.local` (see the reference below). At minimum you need the Cognee
credentials and the app secrets. GitHub OAuth is optional.

### 3. Seed the memory graph

```bash
npm run seed
```

This ingests a set of sample resolved incidents into your Cognee dataset. Ingestion
takes a short while to become recall ready.

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and click **Continue as guest**.

## Environment variables

All variables are server only. Never prefix any of them with `NEXT_PUBLIC_`.

Required:

* `COGNEE_BASE_URL` is your Cognee Cloud origin, with no trailing `/api/v1`.
* `COGNEE_API_KEY` is the Cognee API key, sent as the `X-Api-Key` header.
* `COGNEE_DATASET` is the dataset holding incident memory (`smriti_incidents`).
* `WEBHOOK_HMAC_SECRET` signs and verifies the incident webhook.
* `ADMIN_SECRET` gates the destructive `improve()` and `forget()` endpoints.
* `DEMO_PASSPHRASE` gates demo write actions in the UI.
* `AUTH_SECRET` signs sessions. Generate one with `openssl rand -base64 32`.

Optional:

* `COGNEE_TENANT_ID` and `COGNEE_USER_ID` are kept for reference. They are usually
  encoded in the base URL and derived from the API key.
* `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET` enable the GitHub sign in button.

## Scripts

* `npm run dev` starts the dev server on port 3000.
* `npm run build` creates a production build.
* `npm run start` serves the production build.
* `npm run lint` lints with ESLint.
* `npm run seed` seeds the Cognee dataset with sample incidents.

## Project structure

```
src/
  app/
    api/
      auth/[...nextauth]/   Auth.js handlers
      incidents/webhook/    remember(), HMAC signed ingestion
      incidents/simulate/   demo helper that signs and posts a sample incident
      recall/               recall(), the money shot
      memory/consolidate/   improve()
      memory/retire/        forget()
    signin/                 sign in page
    page.tsx                dashboard (reads the session)
    globals.css             design tokens (light and dark)
  auth.ts                   Auth.js config (guest and optional GitHub)
  proxy.ts                  session gate and security headers (CSP nonce)
  components/               UI (graph, hero, top bar, cards, modals)
  lib/
    cognee.ts               the only module talking to Cognee Cloud
    security.ts             HMAC, same origin, secret checks
    graph.ts                derive the memory graph
    graph-layout.ts         lay out the memory graph
    insights.ts             pattern insights and handoff brief
    types.ts                Zod schemas and shared types
```

## Deploy on Vercel

Push the repo to GitHub, import it in Vercel, and add the environment variables
listed above in Project Settings, under Environment Variables. For GitHub OAuth in
production, set the callback URL to `https://YOUR-DOMAIN/api/auth/callback/github`.

<div align="center">
Built for the Cognee "Where's My Context?" hackathon.
</div>
