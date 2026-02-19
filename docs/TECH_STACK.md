# Tech Stack Decision & Rationale

## Recommended Stack: Next.js 14 + TypeScript + SQLite

### Why This Stack for a Hackathon POC

| Concern | Decision | Rationale |
|---------|----------|-----------|
| **Framework** | Next.js 14 (App Router) | Single project = API + UI. No CORS, no multi-repo. Replit supports it natively. Copilot excels at Next.js code generation. |
| **Language** | TypeScript | You know it. Copilot autocomplete is strongest in TS. End-to-end type safety. |
| **ORM** | Drizzle ORM | Type-safe, lightweight, SQLite-first. Faster to scaffold than Prisma. Schema-as-code. |
| **Database** | SQLite (via better-sqlite3) | Zero setup. File-based. Handles 67k+ records trivially. No Docker/Postgres needed. |
| **UI Library** | shadcn/ui + Tailwind CSS | Copy-paste components. Looks professional out of the box. Copilot knows it well. |
| **Charts** | Recharts | React-native charting. Bar charts, scatter plots, sparklines — all built in. |
| **State** | React Query (TanStack Query) | Caching, auto-refetch on context switch. Minimal boilerplate. |
| **Stats** | simple-statistics (npm) | t-test, mean, standard deviation — all in one lightweight package. |

### Why NOT C# / .NET for This POC

You have strong C# skills, but for a **hackathon POC**:

- .NET requires separate frontend project (React/Angular) → 2 things to deploy
- Next.js API routes eliminate the need for a separate backend
- Replit's Node.js support is more mature than .NET
- AI tools (Copilot, Replit Agent) generate more accurate Next.js code than .NET Minimal API
- SQLite integration is simpler in Node.js (no EF Core migration ceremony)

**If this moves beyond POC**: Consider migrating the API layer to .NET 8 Minimal API with the same React frontend.

### Alternative: If You Prefer C# Backend

If you strongly prefer C#, here's the split:

| Layer | Tech |
|-------|------|
| Backend | .NET 8 Minimal API + Dapper (not EF Core — faster for POC) |
| Database | SQLite via Microsoft.Data.Sqlite |
| Frontend | Vite + React + TypeScript (separate project) |
| Deployment | Two processes (dotnet run + npm run dev) |

This adds ~30 min setup overhead but is viable if you're faster in C#.

---

## Project Initialization Commands

### Option A: Next.js (Recommended)

```bash
npx create-next-app@latest teacher-dashboard --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd teacher-dashboard
npm install drizzle-orm better-sqlite3 recharts @tanstack/react-query simple-statistics
npm install -D drizzle-kit @types/better-sqlite3
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card table select dialog sheet badge tabs input checkbox dropdown-menu separator
```

### Option B: .NET + React

```bash
# Backend
dotnet new web -n TeacherDashboard.Api
cd TeacherDashboard.Api
dotnet add package Dapper
dotnet add package Microsoft.Data.Sqlite
dotnet add package System.Text.Json

# Frontend (separate terminal)
npm create vite@latest teacher-dashboard-ui -- --template react-ts
cd teacher-dashboard-ui
npm install recharts @tanstack/react-query axios
npx shadcn-ui@latest init
```

---

## Folder Structure (Next.js)

```
teacher-dashboard/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout with providers
│   │   ├── page.tsx                # Redirect to /dashboard
│   │   ├── dashboard/
│   │   │   ├── page.tsx            # Teacher dashboard
│   │   │   ├── assignments/
│   │   │   │   └── page.tsx        # Assignment list + create
│   │   │   └── impact/
│   │   │       └── page.tsx        # Impact analysis
│   │   ├── student/
│   │   │   └── [id]/
│   │   │       └── page.tsx        # Student detail view
│   │   └── api/
│   │       ├── rosters/
│   │       │   └── route.ts
│   │       ├── test-groups/
│   │       │   ├── route.ts
│   │       │   └── [id]/
│   │       │       └── tests/
│   │       │           └── route.ts
│   │       ├── students/
│   │       │   └── [id]/
│   │       │       ├── route.ts
│   │       │       └── assignments/
│   │       │           └── route.ts
│   │       ├── performance/
│   │       │   └── route.ts
│   │       ├── rc-breakdown/
│   │       │   └── route.ts
│   │       ├── assignments/
│   │       │   ├── route.ts
│   │       │   └── [id]/
│   │       │       └── impact/
│   │       │           └── route.ts
│   │       ├── impact/
│   │       │   └── summary/
│   │       │       └── route.ts
│   │       ├── external/
│   │       │   └── sync/
│   │       │       └── route.ts
│   │       ├── seed/
│   │       │   └── route.ts
│   │       └── simulate-sync/
│   │           └── route.ts
│   ├── components/
│   │   ├── ui/                     # shadcn components
│   │   ├── dashboard/
│   │   │   ├── PerformanceOverview.tsx
│   │   │   ├── RCBreakdown.tsx
│   │   │   ├── StudentTable.tsx
│   │   │   └── AssignmentSummary.tsx
│   │   ├── impact/
│   │   │   ├── ImpactCard.tsx
│   │   │   ├── ScatterPlot.tsx
│   │   │   └── ImpactTable.tsx
│   │   ├── student/
│   │   │   ├── ScoreCards.tsx
│   │   │   ├── RCTable.tsx
│   │   │   ├── StandardsAccordion.tsx
│   │   │   └── TaskList.tsx
│   │   ├── AssignmentSlideOver.tsx
│   │   ├── ContextSelector.tsx
│   │   └── TopBar.tsx
│   ├── lib/
│   │   ├── db.ts                   # Database connection
│   │   ├── schema.ts               # Drizzle schema
│   │   ├── seed.ts                 # 67k+ record generator (250 rosters × 35 students × 6 tests)
│   │   ├── impact.ts               # DiD calculation logic
│   │   └── queries.ts              # Reusable query functions
│   ├── hooks/
│   │   ├── useContext.ts           # Roster + test group state
│   │   ├── useStudents.ts
│   │   ├── useAssignments.ts
│   │   └── useImpact.ts
│   └── types/
│       └── index.ts                # Shared TypeScript types
├── drizzle.config.ts
├── data/
│   └── teacher-dashboard.db        # SQLite file (gitignored)
└── package.json
```

---

## Key Dependencies & Versions

```json
{
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "drizzle-orm": "^0.34.0",
    "better-sqlite3": "^11.0.0",
    "recharts": "^2.12.0",
    "@tanstack/react-query": "^5.60.0",
    "simple-statistics": "^7.8.0",
    "tailwindcss": "^3.4.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "lucide-react": "^0.400.0",
    "tailwind-merge": "^2.5.0"
  }
}
```
