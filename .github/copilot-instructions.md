# Copilot Instructions — Teacher Intervention Dashboard

## Project Overview

This is a **Teacher Intervention Dashboard** — a hackathon POC that tracks student performance across sequential Progress Monitoring (PM) tests, manages teacher-assigned interventions on external platforms (IXL, Khan Academy, etc.), and measures impact using Difference-in-Differences (DiD) statistical analysis.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict mode) |
| ORM | Drizzle ORM |
| Database | SQLite via better-sqlite3 |
| UI | shadcn/ui + Tailwind CSS |
| Charts | Recharts |
| State | TanStack Query (React Query v5) |
| Stats | simple-statistics |

## MCP SQLite Tool

An **MCP SQLite server** is available in this workspace. You can use it to:

- **List tables**: `mcp_sqlite_list_tables`
- **Describe table schema**: `mcp_sqlite_describe_table`
- **Run read queries**: `mcp_sqlite_read_query` (SELECT statements)
- **Run write queries**: `mcp_sqlite_write_query` (INSERT/UPDATE/DELETE)
- **Create tables**: `mcp_sqlite_create_table`
- **Append insights**: `mcp_sqlite_append_insight`

Use these tools to inspect the database, verify seed data, debug queries, and validate schema changes directly rather than guessing at table structures.

## Architecture & Conventions

### Folder Structure

```
src/
├── app/                  # Next.js App Router pages & API routes
│   ├── api/              # REST API routes (route.ts files)
│   ├── dashboard/        # Teacher dashboard pages
│   └── student/[id]/     # Student detail view
├── components/
│   ├── ui/               # shadcn/ui primitives (do not edit directly)
│   ├── dashboard/        # Dashboard-specific components
│   ├── impact/           # Impact analysis components
│   └── student/          # Student view components
├── lib/
│   ├── db.ts             # Database connection singleton
│   ├── schema.ts         # Drizzle ORM schema definitions
│   ├── seed.ts           # Seed data generator
│   ├── impact.ts         # DiD calculation logic
│   └── queries.ts        # Reusable query functions
├── hooks/                # Custom React hooks (useContext, useStudents, etc.)
└── types/
    └── index.ts          # Shared TypeScript types
```

### Coding Conventions

- Use **App Router** conventions: `page.tsx` for pages, `route.ts` for API routes, `layout.tsx` for layouts.
- API routes return JSON via `NextResponse.json()`.
- Use **Drizzle ORM** query builder for all database access — avoid raw SQL unless computing complex aggregations (DiD).
- Use `@/*` import alias for all project imports.
- Components are React Server Components by default; add `"use client"` only when needed (interactivity, hooks, browser APIs).
- Use shadcn/ui components from `@/components/ui` — do not install alternative UI libraries.
- Prefer TanStack Query (`useQuery`, `useMutation`) for client-side data fetching with proper cache keys.
- Keep API route handlers thin — delegate to functions in `lib/queries.ts`.

### Database Schema Key Points

- **13 tables**: `rosters`, `students`, `test_groups`, `tests`, `performance_levels`, `reporting_categories`, `standards`, `scores`, `assignments`, `assignment_standards`, `assignment_students`
- **Scale scores** range ~5100–5800 (not percentages).
- **Performance levels** (1–4): Beginning (L1 < 5410), Approaching (5410–5469), Understands (5470–5529), Advanced (≥ 5530).
- `scores.rc_scores` and `scores.std_scores` are **JSON strings** stored as TEXT.
- `assignment_students.status` is one of: `'not_started'`, `'started'`, `'completed'`.
- `assignments.platform` is one of: `'ixl'`, `'lexiacore5'`, `'reflex'`, `'khan_academy'`.

### API Routes

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/rosters` | List all rosters |
| GET | `/api/test-groups` | List test groups |
| GET | `/api/test-groups/:id/tests` | Tests in a group |
| GET | `/api/rosters/:rosterId/students` | Filtered student list |
| GET | `/api/rosters/:rosterId/performance` | Level distribution |
| GET | `/api/rosters/:rosterId/rc-breakdown` | RC avg scores by level |
| GET | `/api/students/:id` | Student detail |
| GET | `/api/students/:id/assignments` | Student assignments |
| GET/POST | `/api/assignments` | List / create assignments |
| GET | `/api/assignments/:id/impact` | DiD for one assignment |
| GET | `/api/impact/summary` | All assignments DiD summary |
| POST | `/api/external/sync` | External platform sync |
| POST | `/api/seed` | Generate seed data |
| POST | `/api/simulate-sync` | Randomly complete assignments |

### Impact Analysis (DiD)

```
Impact = (Treated_PM2 − Treated_PM1) − (Control_PM2 − Control_PM1)
```

- **Treated** = students who completed the assignment.
- **Control** = students NOT assigned, same performance level range in PM1.
- Use `simple-statistics` for t-tests when computing p-values.

## Style & UI Guidelines

- Desktop-first layout, minimum 1280px width.
- Performance level color coding: L1 `#EF4444` (red), L2 `#F97316` (orange), L3 `#22C55E` (green), L4 `#3B82F6` (blue).
- Use Tailwind utility classes; avoid inline styles or CSS modules.
- Use `lucide-react` for icons.

## What NOT to Do

- Do not add authentication — this is a no-auth POC.
- Do not add pagination — class sizes are ≤ 50 students.
- Do not use Prisma — this project uses Drizzle ORM.
- Do not use `pages/` directory — this is App Router only.
- Do not modify files inside `components/ui/` — those are shadcn-managed.
