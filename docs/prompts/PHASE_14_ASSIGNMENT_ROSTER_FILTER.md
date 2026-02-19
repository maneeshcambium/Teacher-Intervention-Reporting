# Phase 14: Assignment Summary — Roster Filter Toggle

> **Prerequisites**: Phases 1–3, 13 complete.
> **Stack**: Next.js 14 App Router, TypeScript, shadcn/ui, Tailwind CSS, TanStack Query.

---

## Problem Statement

The Active Assignments table shows aggregate student counts (Total, Not Started, Started, Completed) across **all rosters** within the selected test group. When a teacher selects a specific roster in the dashboard filters, the assignment stats do not reflect that selection — making it hard to see how a particular class is progressing on assignments.

---

## Solution

Add a **"Filter by roster" toggle** (shadcn `Switch`) to the Assignment Summary card header. When enabled, student counts are scoped to only students belonging to the currently selected roster. When disabled (default), the original cross-roster behavior is preserved.

- Default state: **off** (all rosters)
- When toggled on: a `Badge` shows the selected roster name for clarity
- The toggle uses the `selectedRosterId` already available from `AppContext`

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
- New local state: `filterByRoster` (boolean, defaults to `false`)
- Reads `selectedRosterId` and `rosters` from `AppContext`
- Passes `effectiveRosterId` (either `selectedRosterId` or `null`) to `useAssignments`
- Card header now includes:
  - A `Switch` toggle with "Filter by roster" label on the right side
  - A `Badge` showing the selected roster name when the filter is active

---

## Files Changed

| File | Change |
|------|--------|
| `src/lib/queries.ts` | `getAssignments()` accepts optional `rosterId`, conditionally JOINs `students` table |
| `src/app/api/assignments/route.ts` | `GET` handler reads optional `rosterId` query param |
| `src/hooks/useAssignments.ts` | Hook accepts optional `rosterId`, includes in cache key and URL |
| `src/components/dashboard/AssignmentSummary.tsx` | Added `Switch` toggle, roster name badge, and filter logic |
