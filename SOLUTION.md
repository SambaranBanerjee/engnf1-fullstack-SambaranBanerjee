# TriageSync — Architecture & Engineering Solution

## Part A: Architecture Overview, Ticket Trace & Review Definition

### 1. System Architecture

TriageSync follows a modular monolith architecture consisting of a React frontend, an Express REST API, and a PostgreSQL database hosted on Neon.

The application separates presentation, business logic, authentication, and data-integrity responsibilities while keeping deployment and transaction management straightforward.

```text
+-------------------------------------------------------------------+
|                        Browser (React + Vite)                     |
|                                                                   |
|  AuthContext (in-memory JWT)                                      |
|          |                                                        |
|          v                                                        |
|  TanStack Query                                                  |
|          |                                                        |
|          v                                                        |
|  api.ts (Native Fetch API)                                        |
+---------------------------------+---------------------------------+
                                  |
                                  | HTTPS / REST
                                  | JSON + Bearer JWT
                                  v
+-------------------------------------------------------------------+
|                   Express Modular Monolith (Node.js)              |
|                                                                   |
|  Helmet / CORS / RateLimiter                                      |
|          |                                                        |
|          v                                                        |
|  Authentication Middleware                                        |
|          |                                                        |
|          v                                                        |
|  Role Authorization                                               |
|          |                                                        |
|          v                                                        |
|  Zod Request Validation                                           |
|          |                                                        |
|          v                                                        |
|  Controllers                                                      |
|          |                                                        |
|          v                                                        |
|  Domain Services                                                  |
|                                                                   |
|  [auth] [tickets] [resources] [bookings] [analytics]              |
|          |                                                        |
|          v                                                        |
|  Drizzle ORM + node-postgres Pool                                 |
+---------------------------------+---------------------------------+
                                  |
                                  v
+-------------------------------------------------------------------+
|                     Neon PostgreSQL Database                      |
|                                                                   |
|  users | tickets | ticket_events | resources | bookings           |
|                                                                   |
|  Foreign Keys | Unique Constraints | CHECK Constraints            |
|  Transactions | Row Locks | GiST Exclusion Constraint             |
+-------------------------------------------------------------------+
```

#### Component Responsibilities

| Component | Responsibility |
|---|---|
| React + Vite | User interface and client-side navigation |
| AuthContext | In-memory access-token and user-profile state |
| TanStack Query | Server-state caching, mutations, and optimistic updates |
| Centralized API client | HTTP requests, Bearer token attachment, and error handling |
| Express | REST routing and request lifecycle |
| Middleware | Authentication, authorization, validation, and security |
| Controllers | HTTP request and response handling |
| Domain services | Business rules and transaction coordination |
| Drizzle ORM | Typed database queries and transaction interface |
| PostgreSQL | Persistent storage and final data-integrity enforcement |

The frontend is not trusted to enforce security-sensitive business rules. Authentication, ownership, role permissions, and booking invariants are enforced by the backend and database.

---

### 2. Function-by-Function Trace: Imported Ticket to Dashboard

This section traces an imported ticket through classification, persistence, dashboard retrieval, and agent review.

#### Step 1: HTTP Ingestion

**Relevant files:**
- `backend/src/modules/tickets/tickets.routes.ts`
- `backend/src/modules/tickets/tickets.controller.ts`

The frontend or another authorized client sends:

```http
POST /api/tickets/import
Authorization: Bearer <access-token>
Content-Type: application/json
```

The request passes through:

1. Authentication middleware, which verifies the Bearer JWT.
2. Request validation using `validateBody(importTicketsBodySchema)`.
3. The ticket import controller.

The Zod request schema validates the incoming ticket array, including the external ID, subject, and body fields, and applies the configured trimming and length restrictions.

The controller passes the validated data to `importTicketsIdempotently`.

#### Step 2: Deterministic Classification

**Relevant file:**
- `backend/src/modules/tickets/classifier.ts`

The importer invokes:

```text
classifyTicket(item.subject, item.body)
```

The classifier first normalizes the input through `normalizeTicketText`, which handles casing and whitespace.

It then evaluates ordered keyword and phrase rules.

**Category classification**

| Category | Matching terms |
|---|---|
| BILLING | refund, invoice, charge, payment |
| LOGIN | password, 2FA, sign in, locked out, login |
| DELIVERY | package, arrived, shipping, tracking, delivery |
| BUG | crash, error, 500, exception, broken |
| FEATURE_REQUEST | Fallback when no category rule matches |

**Priority classification**

| Priority | Matching terms |
|---|---|
| URGENT | urgent, production down, locked out |
| HIGH | error, refund, not arrived |
| MEDIUM | Fallback priority |

The classifier returns deterministic results for the same normalized input.

This makes the initial classification reproducible and allows the original automated prediction to be retained independently of subsequent human changes.

#### Step 3: Idempotent Persistence

**Relevant file:**
- `backend/src/modules/tickets/importer.ts`

The importer persists incoming tickets using a database transaction.

For a new ticket:

- `autoCategory` receives the classifier's predicted category.
- `category` initially receives the same category.
- `isHumanOverride` is set to `false`.

For an existing ticket:

- The importer identifies it using `externalId`.
- Existing human overrides are preserved.
- `autoCategory` is not replaced by a manually selected category.
- `skippedOverrideCount` is incremented when an existing override is preserved.
- Subject and body are refreshed when the source text changes, according to the import policy.

The database unique constraint on `externalId` provides the final duplicate-prevention guarantee.

The importer also uses conflict-aware insertion with `.onConflictDoNothing({ target: tickets.externalId })` so concurrent duplicate inserts cannot create multiple records.

#### Step 4: Dashboard Query and Statistics

**Relevant file:**
- `backend/src/modules/tickets/tickets.repository.ts`

When the frontend loads the ticket queue:

```text
TicketQueuePage.tsx
        |
        +---- useTicketsList()
        |         |
        |         +---- GET /api/tickets
        |
        +---- useTicketStats()
                  |
                  +---- GET /api/stats
```

`listTicketsPaginated` builds parameterized database conditions for the requested filters.

The filters are combined using AND semantics. Text search uses PostgreSQL `ILIKE` for case-insensitive partial matching.

The repository returns paginated ticket data.

`getTicketStatistics` computes:

- Ticket counts by category.
- Ticket counts by priority.
- Ticket counts by status.
- Reviewed ticket count.
- Model agreement rate.

The frontend uses these API results to render the ticket queue and dashboard statistics.

#### Step 5: Frontend Rendering and Optimistic Review

**Relevant directory:**
- `frontend/src/features/tickets/`

`TicketQueuePage.tsx` renders ticket information using React JSX text interpolation.

Untrusted ticket content is rendered as text rather than injected as raw HTML. This prevents an imported HTML or script payload from being interpreted as executable markup.

On the ticket details page, `useUpdateTicketOptimistic` manages the optimistic update lifecycle:

1. `onMutate` cancels relevant in-flight queries.
2. The current ticket detail and list caches are snapshotted.
3. The frontend applies the proposed change immediately.
4. A `PATCH /api/tickets/:id` request is sent.
5. If the API rejects the update, `onError` restores the previous snapshots and displays an error notice.
6. The affected queries are invalidated and reconciled with server state.

The backend remains authoritative. Optimistic UI only improves perceived responsiveness.

---

### 3. Definition of `isReviewed` and `modelAgreementRate`

#### `isReviewed`

**Relevant file:**
- `backend/src/modules/tickets/tickets.service.ts`

A ticket is marked:

```text
isReviewed = true
```

when an agent performs either of the following actions:

- Changes the ticket's category.
- Transitions its status from `OPEN` to another operational status:
  - `IN_PROGRESS`
  - `RESOLVED`
  - `CLOSED`

A priority-only or assignee-only update creates the appropriate audit event but does not mark classification review as complete.

This distinction ensures that the reviewed count reflects actual ticket assessment rather than every operational modification.

#### `modelAgreementRate`

**Relevant file:**
- `backend/src/modules/tickets/tickets.repository.ts`

The model agreement rate measures how often the automated category matches the final operational category among reviewed tickets.

Formula:

\[
\text{Model Agreement Rate} =
\frac{
\text{Reviewed tickets where category = autoCategory}
}{
\text{Total reviewed tickets}
}
\times 100
\]

When no tickets have been reviewed, the implementation defaults the agreement rate to `100%`.

Because `autoCategory` is retained independently of the operational `category`, the metric remains meaningful after manual overrides and subsequent imports.

---

## Part B: Concurrency (B6) & Idempotent Override (T-B2) Design

### 1. Concurrent Booking Protection (B6) and User Quota (B8)

#### The Problem With Application-Level Availability Checks

A simple application-level availability check followed by an insert is not sufficient to guarantee correctness under concurrent load.

Consider two requests attempting to reserve the same resource and time interval:

```text
Request A                  Request B
    |                          |
    v                          v
Check availability       Check availability
    |                          |
    v                          v
Slot appears free        Slot appears free
    |                          |
    v                          v
Insert booking           Insert booking
    |                          |
    v                          v
Commit                   Commit
```

Both requests may observe the same available slot before either transaction commits.

This is a time-of-check-to-time-of-use race condition.

TriageSync therefore enforces booking invariants inside PostgreSQL rather than relying exclusively on application-level checks.

#### A. Resource Overlap Prevention

**Relevant migration:**
- `0000_stale_blizzard.sql`

**Constraint:**
- `excl_bookings_no_resource_overlap`

The database migration enables the `btree_gist` extension and defines a partial GiST exclusion constraint.

```sql
ALTER TABLE "bookings"
ADD CONSTRAINT "excl_bookings_no_resource_overlap"
EXCLUDE USING gist (
  "resource_id" WITH =,
  tstzrange("start_time", "end_time", '[)') WITH &&
)
WHERE ("status" IN ('PENDING', 'APPROVED'));
```

The constraint combines:

- Resource equality using `resource_id WITH =`.
- Time-range overlap detection using `tstzrange(...) WITH &&`.
- A partial condition that applies only to active booking statuses.

**Why use `[)`?**

The range is half-open: it includes its start and excludes its end.

For example:

```text
Booking A: 10:00 -------- 10:30
Booking B:                 10:30 -------- 11:00
```

These bookings are consecutive, not overlapping.

The half-open interval representation allows both bookings to exist without producing a false conflict.

**Why use a partial constraint?**

Only bookings with the following statuses block a resource slot:

- `PENDING`
- `APPROVED`

A booking that becomes `REJECTED` or `CANCELLED` no longer occupies the resource interval under this constraint.

**Concurrent request behavior**

For ten simultaneous requests attempting to book the same resource and interval:

1. PostgreSQL evaluates the exclusion constraint during insertion.
2. Only one conflicting booking can commit.
3. Conflicting inserts raise SQLSTATE `23P01`.
4. The booking service translates the database violation into HTTP `409 Conflict`.
5. The successful request returns `201 Created`.

Expected result:

| Result | Expected count |
|---|---:|
| HTTP 201 Created | 1 |
| HTTP 409 Conflict | 9 |
| Active overlapping bookings | 1 |

The database constraint protects the invariant even if multiple backend instances process requests simultaneously.

#### B. Maximum Three Active Future Bookings Per User

**Relevant function:**
- `createBookingWithQuotaAndOverlapGuard`

The maximum-three-booking rule is different from resource overlap prevention.

A GiST exclusion constraint can prevent overlapping intervals, but it cannot directly enforce a maximum count of three non-overlapping active future bookings for an individual user.

TriageSync uses a transaction and a row-level lock on the requesting user.

```sql
SELECT id
FROM users
WHERE id = $1
FOR UPDATE;
```

The transaction follows this sequence:

1. Begin a transaction.
2. Lock the requesting user's row.
3. Count that user's future `PENDING` and `APPROVED` bookings.
4. If the count is already three or greater, raise `QuotaExceededError`.
5. Otherwise, insert the new booking.
6. Commit the transaction.

Concurrent requests from the same user serialize behind the user-row lock.

The next request therefore observes the previous committed booking count rather than independently proceeding from a stale count.

Requests from different users can continue concurrently because they lock different user rows.

The quota violation is returned as HTTP `409 Conflict`.

#### C. Competing Booking Lifecycle Decisions

**Relevant function:**
- `transitionBookingInTx`

The booking lifecycle also needs protection against simultaneous state changes.

For example, an administrator might approve a booking while its owner attempts to cancel it.

The booking service locks the target booking row:

```sql
SELECT *
FROM bookings
WHERE id = $1
FOR UPDATE;
```

The service then validates the requested transition using `booking-state-machine.ts`.

This ensures that competing actions are serialized and that an invalid or stale transition cannot silently overwrite a previously committed decision.

The state machine and transaction work together:

- The state machine defines valid transitions.
- The row lock coordinates competing operations.
- PostgreSQL commits the resulting state change atomically.

---

### 2. Idempotent Import and Human Override Protection (T-B2)

**Relevant files:**
- `backend/src/modules/tickets/importer.ts`
- `backend/src/modules/tickets/tickets.schema.ts`

Ticket ingestion must support repeated feed imports without creating duplicate records or overwriting agent decisions.

#### A. Duplicate Prevention

The `tickets.external_id` column has a database `UNIQUE` constraint.

The importer uses conflict-aware insertion:

```text
.onConflictDoNothing({
    target: tickets.externalId
})
```

This prevents duplicate ticket creation when the same external ticket appears multiple times.

A database-level uniqueness constraint is important because a preliminary SELECT followed by INSERT alone cannot protect against simultaneous duplicate imports.

#### B. Preserving Human Overrides

TriageSync maintains three distinct pieces of classification information:

| Field | Meaning |
|---|---|
| `autoCategory` | Original automated category prediction |
| `category` | Current operational category |
| `isHumanOverride` | Whether an agent manually changed the category |

When an existing ticket has:

```text
isHumanOverride = true
```

the importer:

- Preserves the agent's operational category.
- Leaves `autoCategory` intact.
- Skips automatic category replacement.
- Increments `skippedOverrideCount`.
- Refreshes subject and body only when the source text changes.

When `isHumanOverride = false`, the classifier can run again on re-imported source content.

This separates source-data synchronization from human operational decisions.

It also preserves the original prediction required for calculating model agreement.

---

## Part C: Measure First, Then Optimise

### 1. Benchmark Objective

The objective is to measure ticket queue query latency before and after database indexing.

The benchmark should run against a development or test database containing at least 500 tickets.

**Query under measurement:**

```http
GET /api/tickets?status=OPEN&priority=HIGH&q=invoice&limit=100
```

The benchmark uses:

- A real Express API.
- A real Neon PostgreSQL connection.
- At least 500 persisted tickets.
- Two warm-up requests.
- Twenty sequential measured requests per run.

### 2. Benchmark Environment

Complete this table using the actual environment used for your measurement.

| Property | Measured Environment |
|---|---|
| Runtime | Node.js 20 |
| Backend | Express API |
| Database | Neon PostgreSQL |
| Database region | `Singapore` |
| Connection type | Neon pooled endpoint |
| Dataset size | `500` |
| Warm-up requests | 2 |
| Measured requests | 20 sequential requests |
| Query | `GET /api/tickets?status=OPEN&category=BILLING&q=invoice&page=1&limit=50` |

### 3. Before and After Results


| Configuration | Mean Latency (ms) | p95 Latency (ms) | Query Plan / Notes |
|---|---:|---:|---|
| Before optimization | `186.58` | `189.06` | `Unindexed tickets table (~500+ rows); round-trip includes remote Neon RTT and ILIKE text filtering` |
| After optimization | `188.02` | `191.03` | `B-tree indexes on status, category, priority, and created_at applied via migration; wall-clock time dominated by remote Neon network RTT across ~500 rows` |

#### Before Optimization

The initial configuration uses the unindexed filter and sorting configuration.

Record the actual PostgreSQL execution plan and determine whether the query uses a sequential scan, index scan, or another plan.

Do not assume a sequential scan occurred without verifying it.

#### After Optimization

The optimized configuration adds B-tree indexes to frequently filtered or sorted ticket columns:

- `idx_tickets_status`
- `idx_tickets_category`
- `idx_tickets_priority`
- `idx_tickets_created_at`

The application also applies a bounded pagination limit.

Record the actual execution plan after these changes. Depending on selectivity and the query planner's cost estimates, PostgreSQL may choose a bitmap index scan, an index scan, or another plan.

**Pagination note:** Verify the actual API maximum page size before benchmarking. If the API caps `limit` at 50, use the accepted limit in both runs and document that value instead of claiming a 100-row result.

### 4. Measurement Methodology

To make the comparison meaningful:

1. Use the same database and dataset for both runs.
2. Keep the query filters identical.
3. Use the same number of warm-up and measured requests.
4. Run the initial measurement before adding the indexes.
5. Apply the index migration.
6. Run the measurement again.
7. Record the mean and p95 latency.
8. Capture the actual query plans for both configurations.

For each run, sort the measured request durations in ascending order.

Mean latency:

\[
\text{Mean} = \frac{\sum_{i=1}^{n} t_i}{n}
\]

For p95, use a consistent percentile calculation across both runs, such as the nearest-rank method:

\[
P_{95} = t_{\lceil 0.95n \rceil}
\]

where \(t\) is the sorted array of measured request durations.

### 5. Optimization Trade-Off

Adding B-tree indexes improves lookup and filtering performance for suitable query patterns.

However, indexes also introduce costs:

- Additional storage.
- Index maintenance during INSERT operations.
- Index maintenance during UPDATE operations affecting indexed columns.
- Additional work during batch ticket imports.

The goal is not to add indexes indiscriminately. Each index should support a real query pattern and justify its write and storage overhead.

The final optimization conclusion should be based on the measured results rather than an assumed performance improvement.

---

## Part D: What I Would Improve With One More Day

Given one additional development day, I would prioritize the following improvements.

### 1. Database-Level Aggregation in `getTicketStatistics`

**Relevant file:**
- `backend/src/modules/tickets/tickets.repository.ts`

The current implementation retrieves a lightweight projection containing:

- `category`
- `autoCategory`
- `priority`
- `status`
- `isReviewed`

It then calculates the statistics in JavaScript.

This is straightforward and sufficient for the current assessment dataset.

However, as the number of tickets grows, fetching every relevant row into application memory becomes increasingly expensive.

**Proposed improvement**

Replace the JavaScript aggregation with PostgreSQL aggregate queries using:

- `GROUP BY`
- Aggregate functions such as `COUNT`
- Conditional aggregation using `FILTER (WHERE ...)`

The database could return the category, priority, status, reviewed count, and agreement counts without transferring every ticket projection to Node.js.

This would reduce application-side data processing and make the statistics endpoint more scalable.

### 2. HttpOnly Refresh Cookie and Silent Session Renewal

**Relevant files:**
- `frontend/src/context/AuthContext.tsx`
- `backend/src/modules/auth/auth.service.ts`

The current authentication design stores the access JWT in React memory.

This reduces persistent token exposure, but the token is lost when the browser tab reloads. Users must sign in again.

**Proposed improvement**

Introduce a short-lived access-token and refresh-token architecture:

- Keep the access token short-lived.
- Store the refresh token in an `HttpOnly` cookie.
- Configure `Secure` and an appropriate `SameSite` policy.
- Add a refresh endpoint.
- Rotate refresh tokens and revoke them on logout.
- Apply appropriate CSRF protections to cookie-authenticated operations.

This would provide session continuity across browser reloads while avoiding persistent access-token storage in JavaScript-accessible browser storage.

It would require additional authentication endpoints, token lifecycle management, and cookie security configuration.

### 3. Debounced Ticket Queue Search

**Relevant file:**
- `frontend/src/features/tickets/pages/TicketQueuePage.tsx`

The current queue search updates the filter value as the user types.

If every keystroke changes the TanStack Query key, the frontend can issue unnecessary API requests.

**Proposed improvement**

Introduce a 250 ms debounce before updating the search query parameter.

The intended behavior:

```text
User types
    |
    v
Search input changes
    |
    v
Wait 250 ms
    |
    v
Update search query
    |
    v
TanStack Query fetches filtered tickets
```

This would reduce unnecessary API traffic and avoid repeatedly executing partial searches while the user is still typing.

---

## Final Engineering Summary

TriageSync uses a modular monolith architecture to keep the application maintainable while preserving a clear separation between frontend presentation, backend business logic, and database integrity.

The most important engineering decisions are:

1. **Deterministic classification:** Produces reproducible ticket categories and priorities.
2. **Idempotent ingestion:** Uses database uniqueness and conflict-aware insertion to prevent duplicate tickets.
3. **Human override protection:** Preserves agent decisions independently of automated classification.
4. **Transactional audit history:** Ensures ticket changes and their audit events commit or roll back together.
5. **Database-level booking protection:** Uses a PostgreSQL GiST exclusion constraint to prevent overlapping active bookings.
6. **User quota enforcement:** Uses row-level locking to enforce the maximum of three active future bookings per user.
7. **Explicit booking state machine:** Prevents invalid lifecycle transitions and coordinates competing decisions.
8. **Optimistic frontend updates:** Improves responsiveness while retaining server-side authority and rollback behavior.

The overall design prioritizes correctness, traceability, and predictable behavior under concurrent requests without introducing unnecessary infrastructure complexity.