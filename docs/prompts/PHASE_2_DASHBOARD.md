# Phase 2 Prompt: Teacher Dashboard (Read-Only)

> **Feed this entire file to GitHub Copilot Chat or Replit Agent.**
> **Prerequisites**: Phase 1 is complete. Database is seeded with 67k+ records.
> **Stack**: Next.js 14 App Router, TypeScript, shadcn/ui, Tailwind CSS, Recharts, TanStack Query.

---

## Task

Build the read-only Teacher Dashboard page with:
1. Top bar with roster/test group/test selectors
2. Class Overall Performance panel with 4 performance level cards
3. Reporting category breakdown chart
4. Sortable student table (no pagination needed — class sizes ≤50)

## Context State

The dashboard needs a shared context for the currently selected roster, test group, and test. Use React Context + URL search params for shareable state.

### File: `src/hooks/useAppContext.ts`

Create a React context provider that manages:
- `selectedRosterId: number | null`
- `selectedTestGroupId: number | null`
- `selectedTestId: number | null`
- Setter functions for each
- On initial load: fetch rosters and test groups, auto-select the first of each. Then auto-select the first test in the selected group.

### File: `src/app/layout.tsx`

Wrap the app in:
1. `QueryClientProvider` (TanStack Query)
2. `AppContextProvider`

Use a clean layout with a sidebar or top navigation. Use shadcn `Separator` between sections.

## API Routes Needed

### `GET /api/rosters/:rosterId/performance?testId=X`

Returns performance level distribution:
```json
{
  "levels": [
    { "level": 1, "name": "Beginning to Understand", "color": "#EF4444", "count": 13, "percentage": 37.1 },
    { "level": 2, "name": "Approaching Understanding", "color": "#F97316", "count": 9, "percentage": 25.7 },
    { "level": 3, "name": "Understands", "color": "#22C55E", "count": 7, "percentage": 20.0 },
    { "level": 4, "name": "Advanced Understanding", "color": "#3B82F6", "count": 6, "percentage": 17.1 }
  ],
  "total": 35
}
```

SQL:
```sql
SELECT level, COUNT(*) as count
FROM scores sc
JOIN students s ON s.id = sc.student_id
WHERE s.roster_id = :rosterId AND sc.test_id = :testId
GROUP BY level ORDER BY level;
```

### `GET /api/rosters/:rosterId/rc-breakdown?testId=X`

Returns average RC scores grouped by performance level. Parse the JSON `rc_scores` column.

```json
{
  "categories": [
    {
      "rcId": 1,
      "rcName": "Number and Operations",
      "byLevel": [
        { "level": 1, "avgScore": 5310 },
        { "level": 2, "avgScore": 5435 },
        { "level": 3, "avgScore": 5495 },
        { "level": 4, "avgScore": 5590 }
      ]
    }
  ]
}
```

### `GET /api/rosters/:rosterId/students?testId=X&level=Y&rc=Z&sort=name&order=asc&search=`

Returns student list (no pagination needed — max ~50 students per roster):
```json
{
  "students": [
    {
      "id": 1,
      "name": "Alice Johnson",
      "level": 2,
      "overallScore": 5435,
      "rcScores": { "1": 5420, "2": 5410, "3": 5455, "4": 5445 },
      "assignmentCount": 2
    }
  ],
  "total": 35
}
```

Filtering logic:
- `level`: exact match on scores.level
- `rc`: filter students where `JSON_EXTRACT(rc_scores, '$."' || rc || '"') < 5470` (below proficiency)
- `search`: LIKE match on student name

## UI Components

### `src/components/TopBar.tsx`

- Fixed top bar, full width
- Left: App title "Teacher Intervention Dashboard"
- Right: three shadcn `Select` dropdowns:
  - Roster selector (fetches from `/api/rosters`)
  - Test Group selector (fetches from `/api/test-groups`)
  - Test selector (fetches from `/api/test-groups/:id/tests`, shows PM1–PM6)
- On change: update context → all child components re-fetch data
- Style: white background, subtle bottom border, `h-16`

### `src/components/dashboard/PerformanceOverview.tsx`

- **Title**: "Class Overall Performance"
- **Layout**: 4 horizontally stacked performance level cards (matching real assessment dashboard)
- **Each card** shows:
  - Performance level name (e.g., "Beginning to Understand")
  - Student count and percentage
  - Colored header bar matching the level color (#EF4444, #F97316, #22C55E, #3B82F6)
  - Proficiency description text
- **Interaction**: Clicking a card updates a `selectedLevel` state passed up to parent, which filters the student table
- **Active state**: Clicked card has a ring/border highlight, others remain normal
- **Clear filter**: Clicking the active card again clears the filter
- Also fetch the `performance_levels` table from a new `/api/performance-levels` endpoint to get names, descriptions, and colors
- Wrap in a shadcn `Card` with `CardHeader` and `CardContent`

### `src/components/dashboard/RCBreakdown.tsx`

- **Title**: "Reporting Category Breakdown"
- **Chart type**: Recharts `BarChart` (vertical bars, grouped)
- **Groups**: One group per RC (x-axis)
- **Bars in each group**: One per level (1–4), same colors as performance level cards
- **Y-axis**: Average scale score (5100–5800)
- **Interaction**: Clicking an RC group filters the student table by that RC
- **Tooltip**: Show level + average score on hover
- Wrap in a shadcn `Card`

### `src/components/dashboard/StudentTable.tsx`

- Uses shadcn `Table` component
- **Columns**:
  - Checkbox (for bulk selection — prepared for Phase 3)
  - Student Name (link to `/student/:id`)
  - Level (badge with level name, colored by level)
  - Overall Score (scale score)
  - RC1 Score, RC2 Score, RC3 Score, RC4 Score (scale scores)
  - Assignments (count badge)
- **Header row**: Clickable for sorting (ascending/descending toggle)
- **No pagination** — show all students (max ~50 per roster)
- **Search**: Text input above table for name search (debounced 300ms)
- **Active filters**: Show chips above table ("Beginning to Understand" × or "RC: Number and Operations" ×) with clear buttons
- **Loading state**: Show skeleton rows while data fetches
- **Empty state**: "No students match the current filters"

### `src/app/dashboard/page.tsx`

Assemble all components:

```tsx
<div className="p-6 space-y-6">
  <div className="grid grid-cols-2 gap-6">
    <PerformanceOverview />
    <RCBreakdown />
  </div>
  <StudentTable />
</div>
```

### `src/app/page.tsx`

Redirect to `/dashboard`:
```tsx
import { redirect } from 'next/navigation';
export default function Home() { redirect('/dashboard'); }
```

## TanStack Query Hooks

### `src/hooks/useStudents.ts`
```typescript
// Accepts: rosterId, testId, level?, rc?, sort, order, search
// Fetches from /api/rosters/:rosterId/students with query params
// Returns: { data, isLoading, error }
// No pagination needed (class sizes ≤50)
```

### `src/hooks/usePerformance.ts`
```typescript
// Accepts: rosterId, testId
// Fetches from /api/rosters/:rosterId/performance?testId=X
// Returns: { data, isLoading }
```

### `src/hooks/useRCBreakdown.ts`
```typescript
// Accepts: rosterId, testId
// Fetches from /api/rosters/:rosterId/rc-breakdown?testId=X
// Returns: { data, isLoading }
```

## Styling Notes

- Use `slate` color scheme from Tailwind
- Cards should have `shadow-sm` and `rounded-lg`
- Level badge colors match bar colors
- Dashboard title in top bar: `text-lg font-semibold`
- Use `Skeleton` from shadcn for loading states
- Responsive: At `< 1280px` width, stack the two charts vertically (single column)

## Verification

After implementing, when I visit `http://localhost:3000/dashboard`:
1. Top bar shows with auto-selected roster and test
2. Performance panel renders 4 colored performance level cards with student counts
3. RC chart renders 4 groups of 4 bars each
4. Student table shows all ~35 students (no pagination needed)
5. Clicking "Beginning to Understand" card filters table to ~13 students
6. Clicking a different test (PM2–PM6) reloads all data
7. Typing a name in search filters the table
8. Sorting by "Overall Score" re-orders the table

Generate all the code. Do not use placeholder comments — write the full implementation for every file.
