# PROJECT BRIEF FOR CLAUDE CODE — REAL-TIME COLLABORATION CHAT PLATFORM

> **File purpose:** This is a master instruction file for Claude Code. It defines the project context, requirements, suggested stack, and — most importantly — the **workflow you (Claude Code) must follow**: full planning and documentation FIRST, explicit human approval SECOND, coding THIRD. Do not skip ahead.

---

## 0. LANGUAGE RULE (NON-NEGOTIABLE)

**Always respond to the user in Spanish (español), in every message, from the very first reply onward — even though this document is written in English.**

- This file is in English only because Claude Code parses English instructions more reliably. It is NOT an indication of the working language.
- Code, variable names, commit messages, and technical identifiers stay in English (industry standard).
- Comments in code, documentation prose, explanations, questions to the user, and all conversational output must be in **Spanish**.
- If you are ever unsure, default to Spanish.
- Do not mention or explain this rule to the user unless asked — just follow it.

---

## 1. WHO IS THE USER (DEVELOPER PROFILE)

- Skill level: **Junior → Semi-Senior** developer.
- Current comfort zone: **Laravel** (using the official Laravel + React starter kit, likely Inertia.js-based), PHP, React, MySQL and PostgreSQL installed locally.
- Has NOT decided yet on the language/stack for this specific project and is explicitly open to recommendations — but prefers not to add unnecessary learning overhead if a good result can be achieved with what they already know.
- Wants to _learn_ through this project, but also wants to actually **ship** something functional. Prioritize pragmatism over resume-driven-development (no unnecessary microservices, no over-engineering, no exotic tools without a strong reason).
- Will be developing mostly **solo** (assume solo developer unless told otherwise) — architecture must be maintainable by one person.

---

## 2. PROJECT VISION

Build a **real-time collaboration and messaging platform**, inspired by Slack / Microsoft Teams / Discord, supporting:

- 1:1 direct messages and group messages
- **Workspaces** (organizations) containing multiple **Channels** (public/private)
- Real-time messaging via **WebSockets** (typing indicators, presence/online status, live message delivery, read receipts)
- File/image attachments
- Message reactions and threaded replies
- Search across messages/channels
- Roles & permissions (owner, admin, member, guest)
- Notifications (in-app, web push, and mobile push)
- Multi-client support: **Web**, **Desktop**, and **Mobile**, all backed by the same API/backend.

This is understood to be a **large, multi-phase project**. It should be scoped into an **MVP** first, with clearly separated future phases — never presented as "build everything at once."

### 2.1 Locked Scope Decisions (already decided — do not re-litigate these)

These three decisions were made after an initial planning review and are **final** for this project. Treat them as constraints, not open questions:

1. **MVP = Web only.** Phase 1 delivers backend + web client exclusively. Desktop and Mobile are NOT part of the MVP roadmap — they become a future phase, explicitly conditioned on the web MVP being functional and stable first. Do not design, scaffold, or plan Electron/React Native work until told to.
2. **Testing policy: TDD from day one.** Write tests before or alongside implementation for all backend logic (models, policies/authorization, message delivery, WebSocket event broadcasting, presence) and for critical frontend logic. This is a deliberate choice for this project — it does NOT mirror a "no tests during MVP" policy that may apply to the user's other projects. Do not skip this.
3. **Multi-workspace data model: shared schema with `workspace_id`.** Every tenant-scoped table gets a `workspace_id` foreign key; do NOT use schema-per-tenant. This is because, unlike a typical single-tenant business app, a single user in this product belongs to multiple workspaces simultaneously (like Slack), which schema-per-tenant isolation would make unnecessarily painful.

---

## 3. WHAT YOU MUST DO FIRST — PLANNING PHASE (MANDATORY GATE)

**Do not write a single line of application code until the user explicitly approves the plan.**

Your first response(s) in this project must deliver the following, in order, as actual files inside a `docs/` folder (plus a summary in chat, in Spanish):

### 3.1 Project Identity

- Propose **5 candidate project names** — catchy, short, memorable, working in Spanish, English, or bilingually (e.g., wordplay on "link", "nexus", "square/plaza", "thread", "charla", "ágora", etc.). For each name give: meaning/rationale, availability-style check (is it generic enough to likely find a free domain/package name — you don't need to actually check domains, just flag if it's a very common word), and a one-line tagline in both Spanish and English.
- Let the user pick one before continuing to detailed docs (ask via a clear question, but you may proceed with the rest of the plan using a placeholder name like `{{PROJECT_NAME}}` if they haven't picked yet).

### 3.2 Description

- `docs/DESCRIPTION.md`: elevator pitch, target users, problem it solves, core value proposition, in both Spanish and English versions.

### 3.3 Requirements Documentation

- `docs/REQUIREMENTS.md` splitting features into:
    - **MVP (Phase 1)** — Web only (backend + web client). Core scope: user auth, workspaces, channels (public/private), 1:1 DMs, group messaging, real-time delivery via WebSockets, presence/online status, typing indicators, basic roles (owner/admin/member), basic message search.
    - **V2 (Phase 2)** — threads/replies, reactions, file/image attachments, Mobile (React Native/Expo) as a client on top of the same API, richer notifications.
    - **V3 / Future — conditional on V2 being stable** — Desktop (Electron), voice/video calls, third-party integrations/bots, advanced search (Meilisearch/Typesense), federation.
- **Explicit out-of-scope for the foreseeable future** (state this plainly in the doc, do not leave it implicit):
    - No end-to-end encryption (E2EE). Messages are encrypted in transit (TLS) and at rest at the infrastructure level, but the server can read message content. Document this clearly so it is never silently assumed otherwise later.
    - No federation with external chat servers.
    - No third-party bot/integration marketplace in MVP or V2.
    - No enterprise SSO/SAML in MVP (basic email/password + optional OAuth login is enough for now).
- **Trust & safety basics** (must be defined, not left implicit):
    - Email verification required before full account access.
    - Rate limiting on message sends per user/channel (anti-spam).
    - Max attachment size and allowed file types.
    - Note 2FA as a V2 nice-to-have, not MVP-blocking.
- **Message lifecycle & retention:**
    - Message edits: keep an edit history flag (edited_at) rather than silently overwriting.
    - Message deletion: soft delete (tombstone/"message deleted" placeholder) rather than hard delete, to preserve thread/reply integrity.
    - Deleted attachments: define a retention window before permanent removal from storage (e.g., purge after 30 days) — document the chosen value.
- Include non-functional requirements: scalability expectations (assume small-to-medium scale initially — hundreds to low thousands of concurrent users, not Slack-scale), security (auth, encryption in transit, rate limiting), availability, and maintainability given a solo/small dev team.

### 3.4 Data Model

- `docs/ER_DIAGRAM.md` with an **entity-relationship diagram written in Mermaid syntax** (`erDiagram`), covering at minimum: User, Workspace, WorkspaceMember, Role, Channel, ChannelMember, Message, MessageAttachment, MessageReaction, Thread/Reply, DirectConversation, Notification, Session/Device (for push tokens).
- Include a short data dictionary describing key fields and constraints for each entity.
- Every tenant-scoped table (Channel, ChannelMember, Message, MessageAttachment, MessageReaction, Thread/Reply, DirectConversation, etc.) must show its `workspace_id` foreign key **explicitly**, in both the Mermaid diagram and the data dictionary — this is the locked multi-tenancy strategy from 2.1/3.5, and it must be visible in the data model itself, not only described in prose elsewhere.

### 3.5 Architecture

- `docs/ARCHITECTURE.md` including:
    - A high-level **architecture diagram in Mermaid** (client apps → API → real-time layer → database/cache/queue/storage).
    - A **sequence diagram in Mermaid** for the "send a message" flow (client → API/WebSocket → persistence → broadcast → other clients).
    - Explanation of the chosen architecture style (recommendation: **modular monolith**, not microservices — justify why, given the user's profile and project scale).
    - Folder/module structure proposal for the backend (domain-oriented, e.g. `Users`, `Workspaces`, `Channels`, `Messaging`, `Notifications`).
    - Explicit **multi-tenancy strategy**: shared schema with a `workspace_id` column on every tenant-scoped table (see Section 2.1 — this is locked, not a decision point). Document the row-level scoping pattern (e.g., a global query scope in Laravel applied automatically based on the current workspace context) so it isn't silently forgotten on any new table added later.
    - A short note on environments beyond local dev: at minimum, describe the intended staging/production setup (even briefly) and the database backup approach (e.g., scheduled `pg_dump` + off-site storage), so this isn't only a "local dev" document.

### 3.6 Tech Stack Decision

- `docs/STACK.md` presenting the recommended stack (see Section 4 below as your starting point — validate it, adjust if you find a better justified alternative, but you must explicitly justify any deviation).
- Include a comparison table for the one decision that actually needs justification for the Web MVP:
    1. **Database: MySQL vs PostgreSQL** (user has both installed locally).
- End with a clear final recommendation, not just a neutral comparison.
- **Desktop shell (Electron vs Tauri) and Mobile framework (React Native vs Flutter vs Ionic) are explicitly NOT decided in this initial `STACK.md`.** Section 4 documents the current leaning (Electron, React Native/Expo) as long-term direction only — do not produce a full comparison/decision for these until Phase 3/4 actually starts (see 3.7). Producing that analysis now would be premature planning for phases that may still change based on what's learned building the Web MVP.
- Detail the notification delivery mechanism per channel: **web push** (service worker + VAPID keys) for the MVP web client, and note that **mobile push (FCM/APNs via Expo)** is deferred until the Mobile phase — don't leave "notifications" as a vague catch-all term.
- Decide and document the **API documentation tooling** (e.g., Laravel Scribe or an equivalent that auto-generates an OpenAPI spec from routes/controllers) — required starting Phase 1, not an afterthought, since the API is the contract every future client (mobile, desktop, third parties) will depend on.
- Adopt **API versioning from Phase 1** (e.g., all routes under `/api/v1/...`), even though only the Web client consumes it initially. Changing this after Mobile/Desktop already depend on the API is far more expensive than deciding it now — document the convention in `docs/STACK.md`.
- Decide and document the **testing/QA tooling** here too (cross-referenced from Section 4 and `docs/TESTING.md`): Pest, PHPStan/Larastan for static analysis, Vitest + React Testing Library, Playwright for E2E, GitHub Actions for CI gating.

### 3.7 Roadmap

- `docs/ROADMAP.md`: phased milestones, **Web-only through the MVP**, with Mobile/Desktop explicitly deferred and conditional:
    - **Phase 0** — project setup, environment, CI skeleton.
    - **Phase 1 (MVP)** — backend core (auth, workspaces, channels, roles, DMs) + WebSocket real-time layer + web client consuming it. This phase is not "done" until a user can register, create a workspace, create channels, and chat in real time end-to-end.
    - **Phase 2 (V2)** — threads, reactions, attachments, search refinement, notifications.
    - **Phase 3 (V2, conditional)** — Mobile client (React Native/Expo), built only after Phase 1 is stable — reuses the same API.
    - **Phase 4 (V3, conditional)** — Desktop client (Electron), voice/video exploration, integrations — only after Phase 2/3 are stable.
    - **Phase 5** — polish, hardening, deploy to a real environment.
    - Do not let planning for Phase 3/4 leak into Phase 1 work — each phase should only be scoped in detail once the prior phase is functionally complete.
    - No need for time estimates in days/weeks — this is a side/learning project, scope by feature completion, not calendar.

### 3.8 Setup / Environment

- `docs/SETUP.md`: local development environment plan (Docker Compose services needed: app, database, redis, websocket server, mailhog/similar, minio for local S3-like storage), assuming the user already has MySQL/PostgreSQL natively installed but recommend whether to keep using native installs or containerize everything for consistency — justify the recommendation.
- State the **secrets/environment variable management approach explicitly** — don't leave it implicit. Default for this project: secrets live in per-environment `.env` files, never committed to version control (confirm `.env` is git-ignored, `.env.example` kept up to date with placeholder values); no external secrets manager (Doppler, 1Password, Vault, etc.) for MVP — that's a V2+ consideration only if the project grows a team or multiple deploy targets.

### 3.9 Testing & QA Strategy

- `docs/TESTING.md`: the full testing strategy — not just "we do TDD" but concretely:
    - **Test types and tools**: Pest for backend unit + feature tests; PHPStan/Larastan (level ≥ 5) for static analysis; Vitest + React Testing Library for frontend unit/component tests; **Playwright** for end-to-end tests of critical flows (register/login, create workspace, create channel, send/receive a real-time message across two independent sessions, presence/typing indicators).
    - **Coverage expectations**: no arbitrary global % target imposed for its own sake (avoid coverage theater), but every MVP-critical domain area — authentication, authorization policies (who can see/post/manage what per workspace/channel), message send/receive/broadcast logic, presence/WebSocket event handling — must have both unit and feature-level tests before being considered done. On the frontend, any component with real logic (not purely presentational) must have tests.
    - **WebSocket/broadcast testing approach**: document how to test Reverb-broadcast events without a live socket in most tests (Laravel's `Event::fake()` / broadcast assertions on the backend; mocking the Echo client for frontend component tests), plus require at least one real Playwright E2E test that exercises two real browser contexts talking through an actual running Reverb instance — this is the layer that actually proves the real-time pipeline works end-to-end.
    - **CI gating**: GitHub Actions must run lint + static analysis + the full test suite on every PR/push, and merging should be blocked on failure — a required check, not a "nice to have" workflow.
- `docs/QA.md`: a lightweight manual QA checklist template, one section per phase/feature, to run **before** marking a phase "done" in the roadmap. Automated tests reduce but don't replace a manual pass on real-time, multi-session behavior (e.g., "open two browser windows as two different users in the same channel, verify typing indicator and message delivery under 1s, verify presence updates on disconnect/reconnect"). This matters especially here because WebSocket/UX behavior is hard to fully trust from automated tests alone.

### 3.10 Root README

- `README.md` at project root tying everything together: project name + tagline, description, links to all docs above (including `TESTING.md` and `QA.md`), tech stack summary badges/list, and current project status ("📋 Planning" until approved).

**After producing all of the above, STOP.** Present a concise summary in chat (in Spanish) and explicitly ask: _"¿Apruebas este plan para comenzar el desarrollo, o quieres ajustar algo primero?"_ Do not proceed to Section 5 (development) until the user responds with clear approval (e.g., "apruebo", "dale", "empecemos", "sí, procede").

---

## 4. SUGGESTED TECH STACK (STARTING POINT — VALIDATE, DON'T BLINDLY ACCEPT)

This is a reasoned starting recommendation given the user's current skills (Laravel + React). The MVP targets **Web only** (see 2.1) — the Desktop and Mobile entries below are documented now purely as long-term direction, not as a Phase 1 decision. Their detailed comparison/decision is deferred to when Phase 3/4 actually starts (see 3.6 and 3.7), to avoid premature planning for phases that are still conditional on the Web MVP succeeding.

### Backend & Real-time

- **Laravel (PHP)** as the core API/backend — leverages existing knowledge, mature ecosystem, excellent for a modular monolith.
- **Laravel Reverb** for WebSockets — it's Laravel's own first-party WebSocket server (drop-in replacement for Pusher), integrates natively with Laravel broadcasting, supports private/presence channels out of the box (ideal for typing indicators, online presence, channel membership). Avoids the complexity of running/maintaining a separate Node.js real-time service.
- **Laravel Sanctum** for authentication (SPA + mobile token-based auth).
- **Laravel Echo** on the frontend side to consume WebSocket events.

### Database

- **PostgreSQL** recommended as the primary database (over MySQL), because:
    - Better native full-text search (useful for message search, avoids needing Elasticsearch early on).
    - JSONB support for flexible fields (message metadata, reactions, custom notification payloads) with indexing.
    - Generally better behavior under concurrent writes, which matters for a chat app.
    - The user already has it installed — no new tool to learn, just a config change in Laravel's `.env`.
- MySQL remains a perfectly valid fallback if the user prefers to stick with what they know best from prior projects — flag this as a discussion point, not a blocker.

### Caching, Queues & Pub/Sub

- **Redis** — required for Reverb horizontal scaling, presence channel state, caching, rate limiting, and Laravel Queues (background jobs: push notifications, file processing, email digests).

### File Storage

- **S3-compatible storage**, using **MinIO** locally for development and any real S3-compatible provider in production (AWS S3, DigitalOcean Spaces, Cloudflare R2). Laravel's filesystem abstraction supports this natively.

### Search (later phase)

- Start with PostgreSQL full-text search for MVP. If/when message volume grows, consider **Meilisearch** or **Typesense** (both have official Laravel Scout drivers, low operational overhead) — do NOT introduce Elasticsearch for a solo-dev project, it's overkill.

### Web Frontend

- **React**, following the same starter-kit pattern the user already uses (Inertia.js if that's what the current starter kit uses — confirm), or a separate SPA + REST/WebSocket API if full decoupling is preferred. Keep this consistent with the user's existing muscle memory.
- State/data layer: **TanStack Query** for server state, lightweight store (Zustand) for UI/client state.

### Desktop

- **Electron**, wrapping the same React web app — fastest path to a desktop app reusing 100% of the web codebase, no new language required. Mention **Tauri** as a lighter-weight future alternative (smaller binaries, better performance) but note it requires Rust for anything beyond the basics — a good "phase 2" optimization, not a Phase 1 requirement.

### Mobile

- **React Native with Expo**, recommended over Flutter and Ionic because:
    - Reuses React knowledge and mental model (components, hooks, JSX) — near-zero new language to learn, unlike Flutter (Dart).
    - Expo drastically simplifies build/signing/OTA update workflows for a solo dev.
    - Better native performance and UX for real-time chat interactions than Ionic (which is a WebView-based approach and tends to feel less native for messaging-heavy UIs).
- Push notifications via Expo's push service (wrapping FCM/APNs).

### Testing — TDD from day one (locked decision, see 2.1)

- **Pest** for backend tests (preferred over raw PHPUnit for readability) — write tests before/alongside implementation, not after. Non-negotiable coverage areas from the very first commit: authentication, workspace/channel authorization policies (who can see/post/manage what), message send/receive/broadcast logic, and presence/WebSocket event handling.
- **PHPStan/Larastan** (static analysis, level ≥ 5) as a CI-gating check alongside tests — catches type/logic errors tests alone won't.
- **Vitest/Jest + React Testing Library** for frontend unit/component tests on the web client, focused on components with real logic (message list rendering, form validation, real-time state updates) — not on trivial presentational components.
- **Playwright** for end-to-end tests of the critical real-time flows (login → create workspace → create channel → send/receive message across two sessions) — the layer that actually proves the WebSocket pipeline works end-to-end, not just in isolation.
- Full strategy, coverage expectations, and CI gating rules live in `docs/TESTING.md` (see 3.9); the manual QA checklist lives in `docs/QA.md`.
- Mobile testing (Detox or Expo's tools) is deferred to the Mobile phase (Phase 3) — not a Phase 1 blocker, since Mobile itself is deferred.
- A pull request / commit should not be considered "done" for MVP-critical logic without an accompanying test and, once CI is set up, a green pipeline — enforce this as a working habit, not just a suggestion.

### DevOps / Local Dev

- **Docker Compose** for orchestrating app, Postgres, Redis, Reverb, MinIO, and a mail catcher (Mailpit) — even if native Postgres/MySQL already exist locally, containerizing ensures reproducibility and matches production more closely.
- **GitHub Actions** for CI (lint, tests) once the repo is initialized.
- Deployment target: keep it simple — a single VPS with Docker Compose, or Laravel Forge, is more than enough; do not recommend Kubernetes for this project.

### Monitoring/Debugging (dev-time)

- **Laravel Telescope** for local debugging of requests/queries/jobs.
- **Laravel Horizon** for queue monitoring (pairs with Redis queues).

---

## 5. DEVELOPMENT PHASE (ONLY AFTER APPROVAL)

Once the user approves the plan:

1. Scaffold the project structure exactly as documented in `docs/ARCHITECTURE.md`.
2. Work **phase by phase**, following `docs/ROADMAP.md` in order — do not jump ahead to mobile/desktop before the backend + web MVP works end-to-end.
3. After completing each phase, **pause and summarize what was built, in Spanish**, before continuing to the next phase. Treat each phase boundary as a soft checkpoint (not as strict a gate as the initial plan approval, but don't silently barrel through the entire roadmap in one go).
4. Keep `docs/DECISIONS.md` as a running lightweight ADR (Architecture Decision Record) log — every time you make a non-trivial technical choice during coding, append a short entry (date, decision, why, alternatives considered).
5. Write code with junior/semi-senior readability in mind: clear naming, comments explaining _why_ not just _what_, avoid overly clever abstractions.
6. Follow **TDD**: for backend logic and critical frontend logic, write or sketch the test first (or at minimum in the same commit), then implement to make it pass. Do not batch "write tests later" for MVP-critical paths (auth, permissions, messaging, presence).
7. Before marking a phase "done" in `docs/ROADMAP.md`, run the manual QA checklist for that phase from `docs/QA.md` and record the result (pass/notes/bugs found) — a phase is not complete on green tests alone if its checklist hasn't been run.
8. Regenerate/update API documentation (via the tool chosen in `docs/STACK.md`, e.g. Scribe) whenever endpoints are added or changed, and update any other `docs/*.md` file the phase's work has made stale (ER diagram, architecture notes) as part of the same phase — never as deferred cleanup.

---

## 6. GENERAL BEHAVIOR RULES

- Ask clarifying questions (in Spanish) whenever a requirement is ambiguous, rather than assuming silently — but don't block on trivial ambiguities; state your assumption and move on.
- Every deviation from the recommended stack in Section 4 must be explicitly flagged and justified, not silently substituted.
- Do not fabricate benchmarks, pricing, or library capabilities — if you're not certain about a current library/tool detail, say so plainly rather than guessing.
- Keep the user's solo/small-scale, learning-oriented context in mind at every decision point: favor simplicity, maintainability, and things that are debuggable by one person over theoretical scalability.
- **Frontend design/interaction work uses the `apple-design` skill exclusively** (round macOS-style buttons, interruptible spring animations, translucent materials, size-specific type tracking) — do not install new design/animation libraries (Framer Motion, GSAP, etc.) to achieve this; implement with plain CSS/JS. See `docs/DECISIONS.md` (2026-09-14 entry) for the full rationale and scope of this rule.

---

**END OF BRIEF — remember: plan and document first, get explicit approval, then build.**

===

<laravel-boost-guidelines>
=== foundation rules ===

# Laravel Boost Guidelines

The Laravel Boost guidelines are specifically curated by Laravel maintainers for this application. These guidelines should be followed closely to ensure the best experience when building Laravel applications.

## Foundational Context

This application is a Laravel application running on PHP 8.5. You are an expert with the Laravel ecosystem. Always use the APIs that match the installed major version of each package — do not assume a version.

Before relying on a package's API, confirm its installed version:

- PHP packages: run `composer show --direct` to list direct dependencies with versions, or `composer show <vendor/package>` for a single package.
- JS packages: check `package.json` for the installed versions.

## Skills Activation

This project has domain-specific skills available in `**/skills/**`. You MUST activate the relevant skill whenever you work in that domain—don't wait until you're stuck.

## Conventions

- You must follow all existing code conventions used in this application. When creating or editing a file, check sibling files for the correct structure, approach, and naming.
- Use descriptive names for variables and methods. For example, `isRegisteredForDiscounts`, not `discount()`.
- Check for existing components to reuse before writing a new one.

## Verification Scripts

- Do not create verification scripts or tinker when tests cover that functionality and prove they work. Unit and feature tests are more important.

## Application Structure & Architecture

- Stick to existing directory structure; don't create new base folders without approval.
- Do not change the application's dependencies without approval.

## Frontend Bundling

- If the user doesn't see a frontend change reflected in the UI, it could mean they need to run `npm run build`, `npm run dev`, or `composer run dev`. Ask them.

## Documentation Files

- You must only create documentation files if explicitly requested by the user.

## Replies

- Be concise in your explanations - focus on what's important rather than explaining obvious details.

=== boost rules ===

# Laravel Boost

## Tools

- Laravel Boost is an MCP server with tools designed specifically for this application. Prefer Boost tools over manual alternatives like shell commands or file reads.
- Use `database-query` to run read-only queries against the database instead of writing raw SQL in tinker.
- Use `database-schema` to inspect table structure before writing migrations or models.
- Use `get-absolute-url` to resolve the correct scheme, domain, and port for project URLs. Always use this before sharing a URL with the user.
- Use `browser-logs` to read browser logs, errors, and exceptions. Only recent logs are useful, ignore old entries.

## Searching Documentation (IMPORTANT)

- Use `search-docs` before changes that depend on Laravel ecosystem APIs, behavior, configuration, or version-specific syntax. Skip it for copy-only edits and other changes where package documentation is irrelevant. Reuse sufficient results already in context instead of searching again.
- Pass a `packages` array to scope results when you know which packages are relevant.
- Use multiple broad, topic-based queries: `['rate limiting', 'routing rate limiting', 'routing']`. Expect the most relevant results first.
- Do not add package names to queries because package info is already shared. Use `test resource table`, not `filament 4 test resource table`.

### Search Syntax

1. Use words for auto-stemmed AND logic: `rate limit` matches both "rate" AND "limit".
2. Use `"quoted phrases"` for exact position matching: `"infinite scroll"` requires adjacent words in order.
3. Combine words and phrases for mixed queries: `middleware "rate limit"`.
4. Use multiple queries for OR logic: `queries=["authentication", "middleware"]`.

## Project Rules

- This project contains committed, area-grouped rules in `.ai/rules` when that directory exists (settled decisions, non-obvious traps, standing constraints). Framework and package guidelines that only apply to specific paths (testing, frontend, components) also live there, under `.ai/rules/boost` — this is not just recorded decisions, it is load-bearing guidance you have not seen inline. Before you enter plan mode or create/edit any file, you MUST first: open @.ai/rules/index.md (it maps file globs to rule files), read every rule file whose globs cover the path(s) in scope, and run `grep -rin 'keyword' .ai/rules` to catch what a path match alone misses. Do not write code until you have read and are following every matching rule. If `.ai/rules` does not exist, continue without it.
- Record a rule with `record-rule` only when the user explicitly asks for one. Instructions for the work at hand are not rules, no matter how emphatic: "remove this typo", "use X here" are work to do, not rules to record. Never record a rule on your own initiative, as a byproduct of a change, or to summarize what you just did. When the user does ask, pass a `glob` (e.g. `app/Http/Controllers/**`), a short `title`, and a few-line `note`. Use `record-rule` rather than your native memory or notes tool, because native memory is personal and session-scoped, while only `.ai/rules` is shared with the team and persists in the repo.

## Artisan

- Run Artisan commands directly via the command line (e.g., `php artisan route:list`). Use `php artisan list` to discover available commands and `php artisan [command] --help` to check parameters.
- Inspect routes with `php artisan route:list`. Filter with: `--method=GET`, `--name=users`, `--path=api`, `--except-vendor`, `--only-vendor`.
- Read configuration values using dot notation: `php artisan config:show app.name`, `php artisan config:show database.default`. Or read config files directly from the `config/` directory.

## Tinker

- Execute PHP in app context for debugging and testing code. Do not create models without user approval, prefer tests with factories instead. Prefer existing Artisan commands over custom tinker code.
- Always use single quotes to prevent shell expansion: `php artisan tinker --execute 'Your::code();'`
    - Double quotes for PHP strings inside: `php artisan tinker --execute 'User::where("active", true)->count();'`

=== php rules ===

# PHP

- Always use curly braces for control structures, even for single-line bodies.
- Use PHP 8 constructor property promotion: `public function __construct(public GitHub $github) { }`. Do not leave empty zero-parameter `__construct()` methods unless the constructor is private.
- Use explicit return type declarations and type hints for all method parameters: `function isAccessible(User $user, ?string $path = null): bool`
- Use TitleCase for Enum keys: `FavoritePerson`, `BestLake`, `Monthly`.
- Prefer PHPDoc blocks over inline comments. Only add inline comments for exceptionally complex logic.
- Use array shape type definitions in PHPDoc blocks.

=== deployments rules ===

# Deployment

- Laravel can be deployed using [Laravel Cloud](https://cloud.laravel.com/), which is the fastest way to deploy and scale production Laravel applications.
- Activate the `deploying-to-cloud` skill whenever deploying to Laravel Cloud, configuring Cloud environments or resources, using the Cloud CLI, or troubleshooting Cloud deployments.

=== herd rules ===

# Laravel Herd

- The application is served by Laravel Herd at `https?://[kebab-case-project-dir].test`. Use the `get-absolute-url` tool to generate valid URLs. Never run commands to serve the site. It is always available.
- Use the `herd` CLI to manage services, PHP versions, and sites (e.g. `herd sites`, `herd services:start <service>`, `herd php:list`). Run `herd list` to discover all available commands.

=== tests rules ===

# Test Enforcement

- Add or update tests for behavior and logic changes when a test provides meaningful regression coverage.
- Pure copy, styling, and layout-only changes do not require new or updated tests.
- When test coverage applies, run the affected tests and ensure they pass.
- Test the changed behavior and its important failure modes, but do not add tests beyond them.
- Read the `testing-best-practices` skill before writing tests.

=== inertia-laravel/core rules ===

# Inertia

- Inertia creates fully client-side rendered SPAs without modern SPA complexity, leveraging existing server-side patterns.
- Components live in `resources/js/pages` (unless specified in `vite.config.js`). Use `Inertia::render()` for server-side routing instead of Blade views.
- ALWAYS use `search-docs` tool for version-specific Inertia documentation and updated code examples.
- IMPORTANT: Activate `inertia-react-development` when working with Inertia client-side patterns.

# Inertia v3

- Use all Inertia features from v1, v2, and v3. Check the documentation before making changes to ensure the correct approach.
- New v3 features: standalone HTTP requests (`useHttp` hook), optimistic updates with automatic rollback, layout props (`useLayoutProps` hook), instant visits, simplified SSR via `@inertiajs/vite` plugin, custom exception handling for error pages.
- Carried over from v2: deferred props, infinite scroll, merging props, polling, prefetching, once props, flash data.
- When using deferred props, add an empty state with a pulsing or animated skeleton.
- Axios has been removed. Use the built-in XHR client with interceptors, or install Axios separately if needed.
- `Inertia::lazy()` / `LazyProp` has been removed. Use `Inertia::optional()` instead.
- Prop types (`Inertia::optional()`, `Inertia::defer()`, `Inertia::merge()`) work inside nested arrays with dot-notation paths.
- SSR works automatically in Vite dev mode with `@inertiajs/vite` - no separate Node.js server needed during development.
- Event renames: `invalid` is now `httpException`, `exception` is now `networkError`.
- `router.cancel()` replaced by `router.cancelAll()`.
- The `future` configuration namespace has been removed - all v2 future options are now always enabled.

=== laravel/core rules ===

# Do Things the Laravel Way

- Use `php artisan make:` commands to create new files (i.e. migrations, controllers, models, etc.). You can list available Artisan commands using `php artisan list` and check their parameters with `php artisan [command] --help`.
- If you're creating a generic PHP class, use `php artisan make:class`.
- Pass `--no-interaction` to all Artisan commands to ensure they work without user input. You should also pass the correct `--options` to ensure correct behavior.

### Model Creation

- When creating new models, create useful factories and seeders for them too. Ask the user if they need any other things, using `php artisan make:model --help` to check the available options.

## APIs & Eloquent Resources

- For APIs, default to using Eloquent API Resources and API versioning unless existing API routes do not, then you should follow existing application convention.

## URL Generation

- When generating links to other pages, prefer named routes and the `route()` function.

## Testing

- When creating models for tests, use the factories for the models. Check if the factory has custom states that can be used before manually setting up the model.
- Faker: Use methods such as `$this->faker->word()` or `fake()->randomDigit()`. Follow existing conventions whether to use `$this->faker` or `fake()`.
- When creating tests, make use of `php artisan make:test [options] {name}` to create a feature test, and pass `--unit` to create a unit test. Most tests should be feature tests.

## Vite Error

- If you receive an "Illuminate\Foundation\ViteException: Unable to locate file in Vite manifest" error, you can run `npm run build` or ask the user to run `npm run dev` or `composer run dev`.

=== wayfinder/core rules ===

# Laravel Wayfinder

Use Wayfinder to generate TypeScript functions for Laravel routes. Import from `@/actions/` (controllers) or `@/routes/` (named routes).

=== pint/core rules ===

# Laravel Pint Code Formatter

- If you have modified any PHP files, you must run `vendor/bin/pint --dirty --format agent` before finalizing changes to ensure your code matches the project's expected style.
- Do not run `vendor/bin/pint --test --format agent`, simply run `vendor/bin/pint --format agent` to fix any formatting issues.

=== pest/core rules ===

# Pest

- This project uses Pest. Create tests with `php artisan make:test --pest {name}`.
- Do not include the test suite directory in `{name}`. Use `SomeFeatureTest`, not `Feature/SomeFeatureTest`.
- Read the `testing-best-practices` skill for guidance on coverage, naming, structure, dependency isolation, and review.
- Do not delete tests or test files without approval. They are part of the application.

## Running Tests

- Run the narrowest set of tests that covers the change. Pass a file path or `--filter=testName` to `php artisan test --compact`.
- Rerun a test after each change to it.
- Run `vendor/bin/pest` to call the test runner directly. It accepts the same file path and `--filter=testName` arguments.
- After the feature tests pass, ask the user to run the complete suite with `php artisan test --compact`.

=== inertia-react/core rules ===

# Inertia + React

- IMPORTANT: Activate `inertia-react-development` when working with Inertia React client-side patterns.

</laravel-boost-guidelines>
