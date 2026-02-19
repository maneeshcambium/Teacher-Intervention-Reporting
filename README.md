# Teacher Intervention Dashboard

A data-driven dashboard that helps teachers track student performance across sequential Progress Monitoring (PM) tests, assign targeted interventions on external platforms, and measure impact using **Difference-in-Differences (DiD)** statistical analysis.

![Status](https://img.shields.io/badge/status-hackathon%20POC-blue) ![Next.js](https://img.shields.io/badge/Next.js-16-black) ![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue) ![SQLite](https://img.shields.io/badge/SQLite-Drizzle%20ORM-green)

---

## Problem

Teachers administer periodic PM tests to students. After reviewing results, they assign targeted practice on external platforms (IXL, Khan Academy, etc.) to struggling students. When the next PM results arrive, there is **no automated way** to measure whether those assignments actually improved student performance — and by how much.

## What This Dashboard Does

1. **Tracks performance** across up to 6 PM windows per year with scale scores (~5100–5800) bucketed into 4 performance levels
2. **Breaks down scores** by Reporting Category (RC) and individual standards to pinpoint skill gaps
3. **Manages interventions** — teachers select struggling students, assign practice on external platforms, and track completion
4. **Measures impact** using DiD analysis: `Impact = (Treated_PM2 − Treated_PM1) − (Control_PM2 − Control_PM1)`
5. **Standards-level analysis** — heatmap view of per-standard mastery with drill-down to individual students

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict mode) |
| ORM | Drizzle ORM |
| Database | SQLite via better-sqlite3 |
| UI | shadcn/ui + Tailwind CSS |
| Charts | Recharts |
| State | TanStack Query (React Query v5) |
| Statistics | simple-statistics |
| Icons | lucide-react |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
git clone https://github.com/maneeshcambium/Teacher-Intervention-Reporting.git
cd Teacher-Intervention-Reporting
npm install
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — the app redirects to `/dashboard`.

### Seed the Database

The database is auto-created on first run. Click the **"Seed Data"** button in the dashboard to populate it with realistic sample data (~35 students per roster, 4 PM tests, scores, reporting categories, and standards).

---

## Pages & Features

### Teacher Dashboard (`/dashboard`)

- **Performance Overview** — 4 color-coded level cards (Beginning, Approaching, Understands, Advanced) showing student counts and percentages
- **RC Breakdown** — Grouped bar chart of average scores per reporting category by performance level
- **Student Table** — Sortable, filterable list with scale scores, RC scores, assignment counts; supports checkbox selection for bulk assignment creation
- **Test Selector** — Toggle between PM1–PM6 to view different test windows

### Standards Analysis (`/dashboard/standards`)

- **Standards Heatmap** — Per-standard average scores with color-coded cells by performance level
- **Filters** — Filter by reporting category, performance level, or search by standard code
- **Student Drill-down** — Click any standard to see which students need help, with quick-assign capability

### Impact Analysis (`/dashboard/impact`)

- **DiD Summary** — Cards for each assignment showing impact score, p-value, and statistical significance
- **Standard-Level Impact** — Expandable breakdown showing which specific standards improved (or didn't)
- **Scatter Plot** — Visualization of treated vs. control group score changes

### Student Detail (`/student/[id]`)

- **Score Cards** — Overall scale score and performance level across tests
- **RC Table** — Per-category scores with trend indicators
- **Standards Accordion** — Expandable view of individual standard mastery
- **Task List** — Assigned interventions with status tracking

---

## Database Schema

13 tables managed by Drizzle ORM:

| Table | Purpose |
|-------|---------|
| `rosters` | Class rosters |
| `students` | Student records linked to rosters |
| `test_groups` | Groups of related PM tests |
| `tests` | Individual PM tests (sequence within a group) |
| `performance_levels` | Level definitions with score thresholds |
| `reporting_categories` | RC definitions (e.g., Reading Informational Text) |
| `standards` | Individual standards linked to RCs |
| `scores` | Student test scores (overall + JSON RC/standard scores) |
| `assignments` | Teacher-created interventions |
| `assignment_standards` | Standards targeted by an assignment |
| `assignment_students` | Student assignment status tracking |

**Performance Level Thresholds:** L1 < 5410 · L2 = 5410–5469 · L3 = 5470–5529 · L4 ≥ 5530

---

## API Routes

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/rosters` | List all rosters |
| GET | `/api/test-groups` | List test groups |
| GET | `/api/test-groups/:id/tests` | Tests in a group |
| GET | `/api/rosters/:id/students` | Filtered student list |
| GET | `/api/rosters/:id/performance` | Level distribution |
| GET | `/api/rosters/:id/rc-breakdown` | RC avg scores by level |
| GET | `/api/rosters/:id/standards-breakdown` | Per-standard scores by level |
| GET | `/api/rosters/:id/standard-students` | Students for a specific standard |
| GET | `/api/students/:id` | Student detail |
| GET | `/api/students/:id/assignments` | Student assignments |
| GET/POST | `/api/assignments` | List / create assignments |
| DELETE | `/api/assignments/:id` | Delete an assignment |
| GET | `/api/assignments/:id/impact` | DiD for one assignment |
| GET | `/api/assignments/:id/standard-impact` | Standard-level DiD breakdown |
| GET | `/api/assignments/:id/students` | Students in an assignment |
| GET | `/api/impact/summary` | All assignments DiD summary |
| GET | `/api/performance-levels` | Performance level definitions |
| GET | `/api/reporting-categories` | RC definitions |
| POST | `/api/seed` | Generate seed data |
| POST | `/api/simulate-sync` | Randomly complete assignments |
| POST | `/api/external/sync` | External platform sync |

---

## Project Structure

```
src/
├── app/                  # Next.js App Router pages & API routes
│   ├── api/              # REST API endpoints
│   ├── dashboard/        # Teacher dashboard (overview, standards, impact)
│   └── student/[id]/     # Student detail view
├── components/
│   ├── ui/               # shadcn/ui primitives
│   ├── dashboard/        # Dashboard-specific components
│   ├── impact/           # Impact analysis components
│   ├── standards/        # Standards analysis components
│   └── student/          # Student view components
├── hooks/                # TanStack Query hooks
├── lib/
│   ├── db.ts             # Database connection singleton
│   ├── schema.ts         # Drizzle ORM schema (13 tables)
│   ├── seed.ts           # Seed data generator
│   ├── impact.ts         # DiD calculation logic
│   ├── queries.ts        # Reusable query functions
│   └── colors.ts         # Performance level color constants
└── types/
    └── index.ts          # Shared TypeScript types
```

---

## Impact Analysis (DiD)

The dashboard uses Difference-in-Differences to measure intervention effectiveness:

```
Impact = (Treated_PM2 − Treated_PM1) − (Control_PM2 − Control_PM1)
```

- **Treated group** = students who completed the assignment
- **Control group** = students NOT assigned, matched by performance level range in PM1
- **Statistical significance** computed via t-tests using `simple-statistics`
- Works at both the overall score level and individual standard level

---

## License

This is a hackathon proof-of-concept. No license specified.
