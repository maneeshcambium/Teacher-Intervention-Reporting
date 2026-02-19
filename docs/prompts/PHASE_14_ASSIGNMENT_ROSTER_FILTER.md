# Phase 14: Assignment Summary — Roster & Test Filter Toggles

> **Prerequisites**: Phases 1–3, 13 complete.
> **Stack**: Next.js 14 App Router, TypeScript, shadcn/ui, Tailwind CSS, TanStack Query.

---

## Problem Statement

The Active Assignments table shows aggregate student counts (Total, Not Started, Started, Completed) across **all rosters** and **all tests** within the selected test group. When a teacher selects a specific roster or test in the dashboard filters, the assignment stats do not reflect those selections — making it hard to see how a particular class is progressing on assignments or which assignments are relevant to a specific test window (e.g. PM1, PM2).

---

## Solution

Add two independent **filter toggles** (shadcn `Switch`) to the Assignment Summary card header:

### Filter by Roster
When enabled, student counts are scoped to only students belonging to the currently selected roster. This is a **server-side filter** — the `rosterId` is passed to the API and the SQL query JOINs through the `students` table.

### Filter by Test
When enabled, only assignments whose `createdAfterTestId` matches the currently selected test are shown. This is a **client-side filter** since the field is already in the response data.

Both toggles:
- Default state: **off** (show all)
- When toggled on: a `Badge` shows the active roster/test name for clarity
- Can be used independently or together (e.g. "PM1 assignments for Roster A only")

---

## Changes Made

### 1. Query Function — `getAssignments()` updated

**File**: `src/lib/queries.ts`

- Added optional `rosterId` parameter: `getAssignments(groupId: number, rosterId?: number | null)`
- When `rosterId` is provided, student count subqueries JOIN through the `students` table to filter by `roster_id`
- When `rosterId` is omitted/null, behavior is unchanged (counts all students)

### 2. API Route — `GET /api/assignments`

**File**: `src/app/api/assignments/route.ts`

- Accepts optional `rosterId` query parameter
- Passes it to `getAssignments()` as a number (or null if absent)

### 3. Hook — `useAssignments()` updated

**File**: `src/hooks/useAssignments.ts`

- Added optional `rosterId` parameter: `useAssignments(groupId, rosterId?)`
- Includes `rosterId` in the TanStack Query cache key (`["assignments", groupId, rosterId ?? "all"]`)
- Appends `rosterId` to the fetch URL when provided

### 4. UI — `AssignmentSummary` component

**File**: `src/components/dashboard/AssignmentSummary.tsx`

- Added `Switch` and `Label` imports from shadcn/ui
- New local state: `filterByRoster` and `filterByTest` (booleans, default `false`)
- Reads `selectedRosterId`, `selectedTestId`, `rosters`, and `tests` from `AppContext`
- Passes `effectiveRosterId` (either `selectedRosterId` or `null`) to `useAssignments`
- Client-side filters assignments by `createdAfterTestId === selectedTestId` when test filter is active
- Card header now includes:
  - Two `Switch` toggles: "Filter by test" and "Filter by roster" on the right side
  - `Badge` components showing the active roster/test name when their respective filters are enabled

---

## Files Changed

| File | Change |
|------|--------|
| `src/lib/queries.ts` | `getAssignments()` accepts optional `rosterId`, conditionally JOINs `students` table |
| `src/app/api/assignments/route.ts` | `GET` handler reads optional `rosterId` query param |
| `src/hooks/useAssignments.ts` | Hook accepts optional `rosterId`, includes in cache key and URL |
| `src/components/dashboard/AssignmentSummary.tsx` | Added two `Switch` toggles (roster + test), badge indicators, and client-side test filtering |
