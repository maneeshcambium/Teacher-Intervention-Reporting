# Implementation Plan — Phased Build Order

> **Estimated Total Time**: 4–6 hours with AI-assisted development
> Each phase produces a **working, testable increment**.

---

## Phase 0: Project Bootstrap (15 min)

### Goal
Scaffolded Next.js project with all dependencies, running locally.

### Steps
1. Run project init commands (see TECH_STACK.md)
2. Initialize shadcn/ui with "slate" theme
3. Add all shadcn components needed
4. Verify `npm run dev` works
5. Create folder structure

### Verification
- `localhost:3000` shows default Next.js page
- No TypeScript or build errors

### AI Tool
- **Replit Agent**: "Create a Next.js 14 app with TypeScript, Tailwind, shadcn/ui, Drizzle ORM with SQLite, Recharts, and TanStack Query. Set up the folder structure as specified."
- Or run commands manually and use **Copilot** for config files.

---

## Phase 1: Data Layer + Seed (45 min)

### Goal
Database schema created, 67k+ records seeded, queryable via API routes.

### Steps
1. Define Drizzle schema (`src/lib/schema.ts`) — includes `performance_levels` table
2. Create DB connection singleton (`src/lib/db.ts`)
3. Build seed script (`src/lib/seed.ts`) — see SEED_DATA_SPEC.md
4. Create API route `POST /api/seed` that triggers seed
5. Create basic query functions (`src/lib/queries.ts`)
6. Create API routes: `/api/rosters`, `/api/test-groups`, `/api/test-groups/:id/tests`, `/api/performance-levels`
7. Test with curl/browser

### Verification
- `POST /api/seed` creates DB file with 67k+ records (8,750 students × 6 tests + assignments)
- `GET /api/rosters` returns 250 rosters
- `GET /api/test-groups` returns test groups
- `GET /api/performance-levels` returns 4 performance levels
- DB file is < 100MB

### AI Prompt (feed to Copilot/Replit)
> See `docs/prompts/PHASE_1_DATA_LAYER.md`

---

## Phase 2: Teacher Dashboard — Read Only (60 min)

### Goal
Dashboard page renders with performance overview, RC breakdown, and student table — all from real seeded data.

### Steps
1. Build `TopBar` with `ContextSelector` (roster + test group dropdowns)
2. Create React Query hooks: `useRosters`, `useTestGroups`, `useStudents`, `usePerformance`, `useRCBreakdown`
3. Build `PerformanceOverview` component (4 performance level cards)
4. Build `RCBreakdown` component (grouped bar chart, 4 levels)
5. Build `StudentTable` with sorting (no pagination needed — class sizes ≤50)
6. Wire up click-to-filter: card click → filter student table
7. Build API routes: `/api/performance`, `/api/rc-breakdown`, `/api/students` (with filters)

### Verification
- Dashboard loads with auto-selected roster + test group
- Performance panel shows 4 level cards with distribution
- Clicking a level card filters the student table
- Student table shows all ~35 students per roster
- RC chart shows per-RC averages across 4 levels

### AI Prompt
> See `docs/prompts/PHASE_2_DASHBOARD.md`

---

## Phase 3: Assignment CRUD (45 min)

### Goal
Teachers can create assignments, assign students, and see assignment summary.

### Steps
1. Build `AssignmentSlideOver` form component
2. Create API routes: `POST /api/assignments`, `GET /api/assignments`
3. Add checkbox column to `StudentTable`
4. Build `AssignmentSummary` table component
5. Wire up: select students → click "Assign" → slide-over → submit → refresh summary
6. Build API route: `GET /api/assignments/:id` (with student counts by status)

### Verification
- Can select students via checkboxes
- "New Assignment" opens slide-over with cascading selects (RC → Domain → Standards)
- Submitting creates assignment + links students
- Assignment summary table shows correct counts

### AI Prompt
> See `docs/prompts/PHASE_3_ASSIGNMENTS.md`

---

## Phase 4: External Sync + Simulation (30 min)

### Goal
Simulated external platform callbacks update assignment statuses.

### Steps
1. Build `POST /api/external/sync` route
2. Build `POST /api/simulate-sync` route (randomly completes 60–80% of assigned students)
3. Add "Simulate Sync" button to dashboard
4. Update `AssignmentSummary` to show live status counts
5. Add status badges to student table

### Verification
- "Simulate Sync" button updates assignment statuses
- Assignment summary counts update (Not Started → Started → Completed)
- Refreshing shows persisted status changes

### AI Prompt
> See `docs/prompts/PHASE_4_SYNC.md`

---

## Phase 5: Impact Analysis (60 min)

### Goal
DiD calculations run and visualize assignment effectiveness.

### Steps
1. Build `src/lib/impact.ts` — DiD calculation engine
2. Create API routes: `GET /api/assignments/:id/impact`, `GET /api/impact/summary`
3. Build `ImpactCard` component (DiD scale score points, sparkline)
4. Build `ScatterPlot` component (Pre vs Post, treated/control)
5. Build `ImpactTable` component (summary statistics)
6. Assemble `/dashboard/impact` page

### Verification
- Impact page shows one card per assignment (8 total)
- DiD is positive (~35–65 scale score points) for assignments with completed students
- Scatter plot shows clear separation between treated (green) and control (gray)
- Summary table shows N, deltas, and DiD for each assignment

### AI Prompt
> See `docs/prompts/PHASE_5_IMPACT.md`

---

## Phase 6: Student Detail View (30 min)

### Goal
Individual student page with scores and assignments.

### Steps
1. Create API routes: `GET /api/students/:id`, `GET /api/students/:id/assignments`
2. Build `StudentHeader`, `ScoreCards`, `RCTable`, `StandardsAccordion`, `TaskList` components
3. Assemble `/student/[id]` page
4. Link student names in `StudentTable` to detail page

### Verification
- Clicking a student name navigates to `/student/:id`
- Score cards show all available test scores (up to 6 PMs) with deltas
- RC table shows per-RC scores across tests
- Standards accordion expands to show individual standard scores
- Task list shows assigned work with status badges

### AI Prompt
> See `docs/prompts/PHASE_6_STUDENT_VIEW.md`

---

## Phase 7: Polish & Demo Prep (30 min)

### Goal
Demo-ready with smooth transitions, loading states, and error handling.

### Steps
1. Add loading skeletons to all data-fetching components
2. Add empty states ("No assignments yet")
3. Add toast notifications for actions (assignment created, sync completed)
4. Test full flow end-to-end:
   - Load dashboard → view PM1 scores → filter Level 1 → select students → create assignment → simulate sync → view impact → drill into student
5. Prepare demo script (3-minute walkthrough)

### Verification
- Full flow works without errors
- No blank screens or missing data states
- Demo script covers all key features

---

## Phase Dependency Graph

```
Phase 0 (Bootstrap)
    │
    ▼
Phase 1 (Data Layer + Seed)
    │
    ├──────────────────┐
    ▼                  ▼
Phase 2 (Dashboard)   Phase 6 (Student View) ← can start in parallel
    │
    ▼
Phase 3 (Assignments)
    │
    ▼
Phase 4 (Sync Simulation)
    │
    ▼
Phase 5 (Impact Analysis)
    │
    ▼
Phase 7 (Polish)
```

### Parallelization Strategy (if 2 people)

- **Person A**: Phase 0 → 1 → 2 → 3 → 4 → 5
- **Person B**: (after Phase 1) → Phase 6 → help with Phase 5 charts → Phase 7

### Solo Strategy with AI Tools

1. Use **Replit Agent** for Phase 0 + 1 (schema + seed — perfect for agent)
2. Use **GitHub Copilot** for Phase 2 + 3 (component-by-component, inline suggestions)
3. Use **ChatGPT/Gemini** for Phase 5 DiD logic (ask it to verify your statistics)
4. Use **Copilot** for Phase 4, 6, 7 (straightforward CRUD + UI)
