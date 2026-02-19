# Phase 13: Assignment Student List Slide Panel

> **Prerequisites**: Phases 1–3 complete.
> **Stack**: Next.js 14 App Router, TypeScript, shadcn/ui, Tailwind CSS, TanStack Query.

---

## Problem Statement

The Active Assignments table on the Dashboard shows aggregate counts (Total, Not Started, Started, Completed) but provides no way to see **which students** are assigned to a specific assignment or what their individual status is. Teachers need to quickly drill into an assignment to see student-level detail without navigating away from the dashboard.

---

## Solution

Make each assignment row in the Active Assignments table **clickable**. Clicking a row opens a **slide-out panel** (shadcn `Sheet`) from the right showing:

- **Assignment name** as the panel title
- **Student count** in the description
- A list of assigned students, each showing:
  - **Student name** — clickable link to `/student/[id]` detail page
  - **Status badge** — color-coded: gray (Not Started), yellow (Started), green (Completed)

---

## Changes Made

### 1. Type — `AssignmentStudentRow`

**File**: `src/types/index.ts`

Added a new interface:

```ts
export interface AssignmentStudentRow {
  studentId: number;
  studentName: string;
  status: string; // 'not_started' | 'started' | 'completed'
}
```

### 2. Query Function — `getAssignmentStudents()`

**File**: `src/lib/queries.ts`

New function that joins `assignment_students` with `students` to return name + status for a given assignment ID, ordered alphabetically by student name.

### 3. API Route — `GET /api/assignments/[id]/students`

**File**: `src/app/api/assignments/[id]/students/route.ts`

Added a `GET` handler alongside the existing `POST` handler. Returns an array of `AssignmentStudentRow` objects.

### 4. Hook — `useAssignmentStudents()`

**File**: `src/hooks/useAssignmentStudents.ts`

TanStack Query hook with cache key `["assignment-students", assignmentId]`. Only enabled when `assignmentId` is non-null (i.e., panel is open).

### 5. Panel Component — `AssignmentStudentsPanel`

**File**: `src/components/dashboard/AssignmentStudentsPanel.tsx`

A `Sheet` component that:
- Accepts `assignment`, `open`, and `onOpenChange` props
- Fetches students via `useAssignmentStudents` only when open
- Renders a bordered, divided list of student rows
- Student names are blue `Link` components to `/student/[id]`
- Status badges use `Badge variant="outline"` with status-specific colors

### 6. Integration — `AssignmentSummary`

**File**: `src/components/dashboard/AssignmentSummary.tsx`

- Added `viewStudents` state to track which assignment's panel is open
- Each `AssignmentRow` receives an `onClick` prop that sets `viewStudents`
- Rows show `cursor-pointer` and hover highlight
- Delete button uses `e.stopPropagation()` to prevent opening the panel
- `AssignmentStudentsPanel` is rendered and controlled by `viewStudents` state

---

## Files Changed

| File | Change |
|------|--------|
| `src/types/index.ts` | Added `AssignmentStudentRow` interface |
| `src/lib/queries.ts` | Added `getAssignmentStudents()` function |
| `src/app/api/assignments/[id]/students/route.ts` | Added `GET` handler |
| `src/hooks/useAssignmentStudents.ts` | New hook |
| `src/components/dashboard/AssignmentStudentsPanel.tsx` | New panel component |
| `src/components/dashboard/AssignmentSummary.tsx` | Clickable rows + panel integration |
