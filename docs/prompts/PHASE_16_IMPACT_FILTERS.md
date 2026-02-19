# Phase 16: Impact Analysis — Filter by Test & Filter by Roster

> **Prerequisites**: Phases 1–5, 9, 15 complete.
> **Stack**: Next.js 14 App Router, TypeScript, shadcn/ui, Tailwind CSS, TanStack Query.

---

## Problem Statement

The Impact Analysis page shows **all** assignments for the selected test group, with no way to narrow results by the currently selected roster or test. Teachers managing multiple rosters or reviewing specific test windows need to quickly isolate relevant assignment impact cards without scanning through the full list.

The Active Assignments table on the Overview tab already has "Filter by test" and "Filter by roster" toggles — the Impact Analysis page should have matching filters.

---

## Solution

Add **"Filter by test"** and **"Filter by roster"** toggle switches to the Impact Analysis page header, consistent with the existing filter UX on the Assignments table.

### Data Changes

1. **`ImpactResult` type** — add two new metadata fields:
   - `createdAfterTestId: number` — the pre-test ID the assignment was created after.
   - `rosterIds: number[]` — roster IDs of the treated students in the assignment.

2. **`calculateAssignmentImpact()`** — populate the new fields:
   - `createdAfterTestId` comes directly from the assignment metadata.
   - `rosterIds` is derived from the treated students' `roster_id` values (already computed as `rosterIds` internally for control group selection).

### UI Changes

3. **Impact page header** — add two `Switch` toggles with `Label`:
   - **Filter by test**: when ON, only show impact cards where `createdAfterTestId === selectedTestId`.
   - **Filter by roster**: when ON, only show impact cards where `rosterIds` includes `selectedRosterId`.
   - Active filter badges appear next to the page title showing the selected roster/test name.

4. **Client-side filtering** — use `useMemo` to filter the `allImpacts` array before passing to `ImpactCards`, `ImpactTable`, and `ScatterPlot`. Both filters can be combined.

---

## Files Changed

| File | Change |
|------|--------|
| `src/types/index.ts` | Added `createdAfterTestId` and `rosterIds` fields to `ImpactResult` |
| `src/lib/impact.ts` | Populated `createdAfterTestId` and `rosterIds` in both the zero-treated and normal return paths of `calculateAssignmentImpact` |
| `src/app/dashboard/impact/page.tsx` | Added filter state, `useMemo` filtering logic, `Switch` toggles, and active filter `Badge` indicators |

---

## Key Decisions

- **Client-side filtering**: Since the impact summary is already fully computed server-side and cached for 5 minutes, filters are applied client-side via `useMemo` for instant toggling without re-fetching.
- **Consistent UX**: Filter toggle placement and styling matches the existing Active Assignments table filters (same `Switch` + `Label` pattern).
- **Defensive access**: `rosterIds?.includes()` with optional chaining guards against stale cached data that may lack the new field.
