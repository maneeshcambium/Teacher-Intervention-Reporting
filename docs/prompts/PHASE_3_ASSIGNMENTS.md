# Phase 3 Prompt: Assignment CRUD

> **Feed this entire file to GitHub Copilot Chat or Replit Agent.**
> **Prerequisites**: Phase 1 + Phase 2 complete. Dashboard renders with student data.
> **Stack**: Next.js 14 App Router, TypeScript, shadcn/ui, Tailwind CSS, Drizzle ORM, SQLite.

---

## Task

Add assignment creation and tracking to the Teacher Dashboard:
1. Checkbox selection on student table
2. "New Assignment" slide-over form with cascading selects
3. Assignment summary table showing all active assignments
4. API routes for CRUD operations

## API Routes

### `GET /api/reporting-categories`

Returns all reporting categories with their standards grouped by domain:
```json
[
  {
    "id": 1,
    "name": "Number and Operations",
    "domains": [
      {
        "name": "Number and Operations - Fractions",
        "subDomains": [
          {
            "name": "Develop understanding of fractions",
            "standards": [
              { "id": 1, "code": "3.NF.A.1", "description": "Understand a fraction 1/b..." }
            ]
          }
        ]
      }
    ]
  }
]
```

### `POST /api/assignments`

Request body:
```json
{
  "name": "Fractions Practice",
  "platform": "ixl",
  "rcId": 1,
  "groupId": 1,
  "createdAfterTestId": 1,
  "impactedTestId": 2,
  "standardIds": [1, 2, 3],
  "studentIds": [101, 102, 103]
}
```

Logic:
1. Insert into `assignments` table
2. Insert into `assignment_standards` for each standard
3. Insert into `assignment_students` for each student with status 'not_started'
4. Return the created assignment with counts

Response:
```json
{
  "id": 5,
  "name": "Fractions Practice",
  "platform": "ixl",
  "standardCount": 3,
  "studentCount": 3,
  "createdAt": "2026-02-18T10:00:00Z"
}
```

### `GET /api/assignments?groupId=X`

Returns all assignments for the test group with status counts:
```json
[
  {
    "id": 1,
    "name": "Fractions Foundations",
    "platform": "ixl",
    "rcName": "Number and Operations",
    "standards": ["3.NF.A.1", "3.NF.A.2", "3.NF.A.3"],
    "totalStudents": 22,
    "notStarted": 5,
    "started": 4,
    "completed": 13,
    "createdAt": "2025-09-20"
  }
]
```

SQL approach: Join assignments with assignment_students and GROUP BY + COUNT with CASE WHEN for status breakdown.

### `DELETE /api/assignments/:id`

Delete the assignment and cascade to assignment_standards and assignment_students.

## UI Components

### Update `src/components/dashboard/StudentTable.tsx`

Add these features to the existing student table:

1. **Checkbox column** (first column):
   - Header checkbox: select/deselect all on current page
   - Row checkboxes: individual selection
   - Selected count badge: "3 students selected" floating bar at bottom
   - Keep selection across page changes (store selected IDs in state)

2. **Bulk action bar** (appears when ≥1 student selected):
   - Fixed bottom bar with: "{N} students selected" + "Create Assignment" button
   - "Create Assignment" button opens the `AssignmentSlideOver`
   - "Clear Selection" button

### `src/components/AssignmentSlideOver.tsx`

A shadcn `Sheet` (side="right", size large) with a form:

**Form Fields (top to bottom):**

1. **Assignment Name** — shadcn `Input`, required
   - Placeholder: "e.g., Fractions Practice Week 3"

2. **Platform** — shadcn `Select`, required
   - Options: "IXL", "LexiaCore5", "Reflex", "Khan Academy"
   - Show platform icon/emoji next to each

3. **Reporting Category** — shadcn `Select`, required
   - Populated from `/api/reporting-categories`
   - On change: reset Domain and Standards selections

4. **Domain** — shadcn `Select`, required
   - Options filtered by selected RC
   - On change: reset Standards selection

5. **Sub-Domain** — shadcn `Select`, optional
   - Options filtered by selected Domain

6. **Standards** — Multi-select with checkboxes (use shadcn `Checkbox` list)
   - Filtered by RC + Domain + Sub-Domain
   - Show standard code + truncated description
   - At least 1 required

7. **Selected Students** — Read-only list
   - Show count: "12 students selected"
   - Expandable to show names
   - Not editable here (selection happens in table)

8. **Test Context** — Read-only display
   - "Created after: PM1" (or PM3, PM4 depending on current test context)
   - "Expected impact: PM2" (or PM4, PM5)
   - Auto-determined from current context (teacher's selected test)

**Footer:**
- "Cancel" button (closes sheet)
- "Create Assignment" button (primary, submits form)
- Loading state on submit

**On Submit:**
1. POST to `/api/assignments` with all data
2. On success: close sheet, clear student selection, show toast "Assignment created successfully", invalidate assignments query
3. On error: show toast with error message

### `src/components/dashboard/AssignmentSummary.tsx`

A shadcn `Card` placed below the student table on the dashboard.

**Header:** "Active Assignments" with a count badge

**Table columns:**
- Assignment Name
- Platform (badge with color: IXL=purple, Khan=green, Reflex=blue, Lexia=orange)
- Standards (comma-separated codes, max 3 shown + "+N more" tooltip)
- Total Students
- Not Started (count + percentage bar)
- Started (count + percentage bar)
- Completed (count + percentage bar)
- Actions (delete button with confirmation dialog)

**Each status column** should show:
- The count number
- A small background progress bar (using the row as context)
- Color: not_started=gray, started=yellow, completed=green

**Empty state:** "No assignments yet. Select students and click 'Create Assignment' to get started."

### Update `src/app/dashboard/page.tsx`

Add the `AssignmentSummary` component below the `StudentTable`:

```tsx
<div className="p-6 space-y-6">
  <div className="grid grid-cols-2 gap-6">
    <PerformanceOverview />
    <RCBreakdown />
  </div>
  <StudentTable 
    onSelectionChange={setSelectedStudents}
    selectedStudents={selectedStudents}
  />
  <AssignmentSummary />
</div>
```

## Hooks

### `src/hooks/useAssignments.ts`
```typescript
// GET assignments with TanStack Query
// Key: ['assignments', groupId]
// Auto-refetch when groupId changes
```

### `src/hooks/useCreateAssignment.ts`
```typescript
// POST mutation with TanStack Query
// On success: invalidate ['assignments'] queries
// Returns: { mutate, isLoading, error }
```

### `src/hooks/useReportingCategories.ts`
```typescript
// GET /api/reporting-categories
// Stale time: Infinity (this data doesn't change)
```

## Verification

After implementing:
1. Student table has checkboxes — selecting 3 students shows "3 students selected" bar
2. "Create Assignment" button opens slide-over
3. Selecting RC filters domains, selecting domain filters standards
4. Submitting creates the assignment — toast confirms
5. Assignment summary table shows the new assignment with 3 students, all "Not Started"
6. Pre-seeded assignments also appear with correct status counts
7. Deleting an assignment removes it from the summary

Generate all the code. Do not use placeholder comments — write the full implementation for every file.
