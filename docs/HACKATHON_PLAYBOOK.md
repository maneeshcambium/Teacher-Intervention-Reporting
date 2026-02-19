# Hackathon Playbook — How to Use These Docs

## Quick Start (Read This First)

You have **7 documents** ready to go. Here's how to use them with your AI tools.

---

## Document Inventory

```
docs/
├── PRD.md                          ← Master product spec (feed to any agent for context)
├── TECH_STACK.md                   ← Stack decisions + project init commands
├── IMPLEMENTATION_PLAN.md          ← Phase-by-phase build order with timing
├── SEED_DATA_SPEC.md               ← 67k+ record generation strategy (250 rosters × 35 students × 6 tests)
├── HACKATHON_PLAYBOOK.md           ← This file (you are here)
└── prompts/
    ├── PHASE_1_DATA_LAYER.md       ← Copy-paste into AI agent
    ├── PHASE_2_DASHBOARD.md        ← Copy-paste into AI agent
    ├── PHASE_3_ASSIGNMENTS.md      ← Copy-paste into AI agent
    ├── PHASE_4_SYNC.md             ← Copy-paste into AI agent
    ├── PHASE_5_IMPACT.md           ← Copy-paste into AI agent
    ├── PHASE_6_STUDENT_VIEW.md     ← Copy-paste into AI agent
    └── PHASE_7_POLISH.md           ← Copy-paste into AI agent
```

---

## Recommended Workflow

### Option A: Replit Agent (Fastest for Full Phases)

1. **Create a new Replit** (Node.js template)
2. **Paste the PRD.md** into Replit Agent chat as initial context
3. **Then paste each phase prompt** one at a time:
   - Start with Phase 1 → verify it works → Phase 2 → etc.
4. **Fix issues** with follow-up prompts like "The student table isn't filtering when I click a bar — fix the click handler"

**Replit Agent strengths**: Full-file generation, dependency management, live preview.
**Replit Agent weaknesses**: Can lose context on long conversations. Start fresh threads between phases if it starts hallucinating.

### Option B: GitHub Copilot Chat (Best for Component-by-Component)

1. **Bootstrap locally** using the commands in TECH_STACK.md
2. **Open the workspace** in VS Code with Copilot
3. **Use `@workspace` context** — paste the PRD.md into a `docs/` folder so Copilot can reference it
4. **For each phase**, open the phase prompt in the editor, then in Copilot Chat:
   - "Read the prompt in docs/prompts/PHASE_1_DATA_LAYER.md and implement all the files described"
5. **For individual files**, use inline Copilot (Ctrl+I) with specific instructions:
   - "Create the PerformanceOverview component as described in docs/prompts/PHASE_2_DASHBOARD.md"

**Copilot strengths**: Inline suggestions, workspace-aware, handles edits to existing files well.
**Copilot weaknesses**: Struggles with very long prompts. Break into per-file instructions if needed.

### Option C: Copilot Edits / Agent Mode (Good for Multi-File Changes)

1. **Setup project locally** with TECH_STACK.md commands
2. **Open Copilot Edits** (Ctrl+Shift+I)
3. **Attach the PRD.md** as context
4. **Request**: "Implement Phase 1 as described in docs/prompts/PHASE_1_DATA_LAYER.md. Create all the files with full implementations."
5. **Review diffs**, accept, test, move to next phase

### Option D: Hybrid (Recommended for Speed + Quality)

1. **Phase 0+1**: Use **Replit Agent** — it's great at scaffolding + data layer
2. **Phase 2+3**: Use **Copilot Agent Mode** — it's better at React components with existing code context
3. **Phase 4**: Use **Copilot inline** — small, surgical changes
4. **Phase 5**: Use **ChatGPT/Gemini** to verify your DiD statistics, then **Copilot** to implement
5. **Phase 6+7**: Use **Copilot Agent Mode** — straightforward UI work

---

## Common Issues & Fixes

### "The database file doesn't exist"
→ Run `POST /api/seed` first, or add the seed trigger to app initialization

### "Drizzle schema types don't match"
→ Regenerate types: `npx drizzle-kit generate:sqlite`
→ Or use raw SQL with `sqlite.prepare()` instead of Drizzle for complex queries

### "Recharts doesn't render"
→ Ensure you're using `'use client'` directive on chart components
→ Recharts requires a parent with explicit width/height — wrap in `<ResponsiveContainer>`

### "JSON_EXTRACT doesn't work in Drizzle"
→ Use raw SQL: `db.all(sql\`SELECT ... JSON_EXTRACT(rc_scores, '$.1') ...\`)`
→ Or parse JSON in TypeScript after fetching the raw text column

### "TanStack Query not refetching"
→ Check that query keys change when context switches: `['students', rosterId, testId, level]`
→ Use `queryClient.invalidateQueries({ queryKey: ['students'] })` after mutations

### "Bulk insert is slow"
→ NOTE: We now generate ~67k+ records (8,750 students × 6 tests + 6,000 assignment-students) — still fast with batch inserts
→ Use `better-sqlite3` synchronous API with transactions (NOT Drizzle's async insert for bulk)
→ Wrap in `sqlite.transaction(() => { ... })()` — this is 100x faster

### "Next.js 'use client' vs 'use server' confusion"
→ API routes (`route.ts`) are always server-side — no directive needed
→ Components with `useState`, `useEffect`, event handlers → need `'use client'`
→ Components that only render props → can be server components (no directive)

---

## Time Budget (Solo Developer)

| Phase | Estimated | With AI Tools | Notes |
|-------|-----------|---------------|-------|
| 0: Bootstrap | 15 min | 5 min | Replit Agent or CLI commands |
| 1: Data Layer | 45 min | 20 min | High AI accuracy for schema/seed |
| 2: Dashboard | 60 min | 30 min | Charts may need manual tweaking |
| 3: Assignments | 45 min | 25 min | Form cascading selects need care |
| 4: Sync | 30 min | 15 min | Straightforward API work |
| 5: Impact | 60 min | 35 min | Stats logic needs verification |
| 6: Student View | 30 min | 20 min | Standard CRUD + display |
| 7: Polish | 30 min | 15 min | Mostly CSS + loading states |
| **Total** | **5h 15m** | **~2h 45m** | With experienced AI usage |

---

## Key Design Decisions Recap

1. **Why Next.js?** — Single deployable unit, API + UI together, best AI tool support
4. **Why SQLite?** — Zero ops, file-based, handles 67k+ trivially, perfect for POC
5. **Why Drizzle over Prisma?** — Lighter, faster cold start, better SQLite support
6. **Why Recharts?** — React-native, supports all chart types needed, works with SSR
7. **Why 67k+ records?** — Proves the system works at scale (250 rosters, 8,750 students, 6 tests), not just with 10 demo records
6. **Why DiD?** — Industry-standard causal inference method, impressive to stakeholders
7. **Why no auth?** — Hackathon POC, auth adds zero demo value

---

## After the Hackathon

If this POC gets green-lit for production:

1. **Auth**: Add NextAuth.js with school SSO (Clever/ClassLink)
2. **Database**: Migrate SQLite → PostgreSQL (Drizzle makes this easy)
3. **Real integrations**: Replace `/api/external/sync` mock with actual IXL/Khan webhooks
4. **Multi-tenant**: Add school/district scoping to all queries
5. **Backend migration** (optional): Move API layer to .NET 8 Minimal API if the team prefers C#
6. **Testing**: Add Playwright E2E tests for critical flows
7. **Deployment**: Vercel (frontend) + Railway/Fly.io (if separate backend)
