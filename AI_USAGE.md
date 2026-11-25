# AI Usage Disclosure

## 1. AI Tools Used

The following AI tools were actively used as development assistants throughout the TriageSync project:

- **OpenAI ChatGPT:** Used extensively for architecture planning, technical decision-making, implementation guidance, evaluating engineering trade-offs, debugging, Viva preparation, documentation, and performance analysis.
- **Google Gemini:** Used for architecture discussions, implementation assistance, code-related troubleshooting, test and lint debugging, deployment configuration, and documentation refinement.

Both tools contributed to different stages of the development process, from initial system design through implementation, testing, optimization, and deployment.

AI assistance was an integral part of the development workflow. However, the final architecture, technology selections, implementation decisions, and submitted solution were directed, evaluated, and verified by me.

## 2. How AI Was Used

### Architecture and System Design

AI tools were used extensively during architecture planning to explore alternative approaches, compare their trade-offs, understand technical constraints, and refine the overall system design.

This included discussions around:

- **Application Architecture:** Designing a modular monolith with clearly separated frontend, backend, domain modules, and database responsibilities.
- **Database Design:** Evaluating PostgreSQL, relational constraints, Drizzle ORM, migrations, and transactional consistency.
- **Authentication and Authorization:** Designing JWT-based authentication, role-based access control, ownership checks, and secure password storage using Argon2id.
- **Ticket Management:** Establishing deterministic ticket classification, preserving manually overridden categories through the `isHumanOverride` mechanism, and maintaining transactional audit history through `ticket_events`.
- **Booking Concurrency:** Evaluating database-level concurrency control, including PostgreSQL's `EXCLUDE USING gist` constraint, half-open `[start, end)` time ranges, `SQLSTATE 23P01` conflict handling, and `SELECT ... FOR UPDATE` row locking for the maximum-three-active-future-bookings requirement.
- **API Design:** Defining validation boundaries, centralized error handling, authorization responsibilities, and consistent API response structures.

These discussions helped assess the strengths and limitations of different approaches before settling on the final architecture. The selected solutions were based on the project's functional requirements, data-integrity guarantees, concurrency requirements, development timeline, and deployment constraints.

### Full-Stack Implementation Assistance

AI tools provided implementation-level assistance across the frontend, backend, and database layers.

Areas of assistance included:

- **Database:** Drizzle ORM schemas, PostgreSQL queries, migration structure, database constraints, and transaction design.
- **Backend:** Express middleware, route organization, service and repository layers, Zod validation, authentication, authorization, and centralized error handling.
- **Frontend:** React, Vite, TypeScript, React Router, reusable UI components, form handling, and Recharts visualizations.
- **Server State:** TanStack Query hooks, query invalidation, mutation handling, optimistic updates, and snapshot-based rollback.
- **Application Integration:** Coordinating frontend API interactions, backend responses, database operations, and error-handling behavior.

AI assistance was used not only to explore implementation approaches but also to accelerate development and resolve technical uncertainties while building these components.

### Debugging, Testing, and Deployment

AI tools were used as active troubleshooting resources to investigate errors, understand framework-specific behavior, and identify possible solutions.

This included:

- Vitest 4 test configuration and setup.
- React 19 ESLint rules, including fast-refresh and effect-related linting constraints.
- TypeScript module resolution and Drizzle Kit configuration.
- Backend production bundling using `esbuild --packages=external`.
- Render build and deployment configuration.
- Vercel SPA rewrites and frontend/backend integration.
- Database migration and seeding issues.
- API latency measurement, benchmark interpretation, and database query optimization considerations.

Suggested fixes and configuration changes were evaluated in the project environment rather than being assumed correct solely because an AI tool proposed them.

### Documentation and Viva Preparation

AI tools assisted in preparing and refining the project's technical documentation, including:

- `README.md` — project overview, features, technology stack, architecture, setup, and deployment instructions.
- `SOLUTION.md` — architectural explanations, implementation traces, concurrency design, and performance benchmarking.
- `AI_USAGE.md` — disclosure of AI involvement throughout development.

They were also used to explain implementation details, compare alternative designs, and prepare for questions about architectural decisions, database behavior, concurrency, security, and system trade-offs during the technical Viva.

## 3. Architectural Ownership and Independent Verification

AI assistance contributed to the development process, but the final technical direction and responsibility for the submitted solution remained mine.

I evaluated the proposed approaches against the assessment requirements and made the final decisions concerning the architecture, technology stack, database design, business rules, and implementation strategy.

In particular, I took responsibility for ensuring that the final system addressed the important engineering requirements:

- Database-level protection against overlapping bookings rather than relying exclusively on application-level availability checks.
- Transactional consistency between ticket updates and their corresponding audit events.
- Preservation of human category overrides during repeated ticket imports.
- Concurrency-safe enforcement of the maximum active booking limit.
- Separation of authentication, role authorization, ownership checks, and business validation.
- Consistent error handling across the API and frontend.

I also performed direct verification of the implemented system, including:

- Executing database migrations and verifying the resulting schema.
- Testing idempotent seed execution and duplicate-import behavior.
- Verifying API responses and authentication/authorization behavior.
- Executing booking concurrency tests against real PostgreSQL.
- Checking booking overlap prevention and the maximum-three-active-bookings rule.
- Testing frontend/backend integration and deployment on Vercel and Render.
- Measuring API response latency and evaluating the results.
- Reviewing the final application behavior and submitted documentation.

AI-generated suggestions and implementation assistance were treated as part of the development process, not as substitutes for testing or verification.

## 4. Individual Work and Git History

TriageSync was developed and submitted as an individual project.

- I directed the development process and retained responsibility for the final technical decisions and submitted solution.
- AI tools were used as development assistants, but the resulting implementation was evaluated and integrated against the project's requirements.
- Development was tracked through small, focused commits on the `main` branch.
- Changes were committed incrementally throughout the development period rather than as one large submission.
- I am responsible for understanding and explaining the architecture, implementation, technical trade-offs, and behavior of the submitted application during the Viva.