# Phase 6 Prompt: Student Detail View

> **Feed this entire file to GitHub Copilot Chat or Replit Agent.**
> **Prerequisites**: Phases 1–5 complete.
> **Stack**: Next.js 14 App Router, TypeScript, shadcn/ui, Recharts.

---

## Task

Build the individual student detail page showing their scores across tests and assigned tasks.

## API Routes

### `GET /api/students/:id`

Returns complete student profile with scores across all tests:

```json
{
  "id": 1,
  "name": "Alice Johnson",
  "rosterId": 1,
  "rosterName": "Mrs. Johnson - 3rd Grade Math",
  "externalId": "stu_1",
  "scores": [
    {
      "testId": 1,
      "testName": "PM1",
      "sequence": 1,
      "overallScore": 5385,
      "level": 1,
      "rcScores": {
        "1": { "name": "Number and Operations", "score": 5342 },
        "2": { "name": "Algebraic Reasoning", "score": 5410 },
        "3": { "name": "Geometry and Measurement", "score": 5455 },
        "4": { "name": "Data Analysis and Probability", "score": 5345 }
      },
      "stdScores": {
        "1": { "code": "3.NF.A.1", "description": "Understand fractions...", "rcId": 1, "score": 5280 },
        "2": { "code": "3.NF.A.2", "description": "Represent fractions...", "rcId": 1, "score": 5345 }
      }
    },
    {
      "testId": 2,
      "testName": "PM2",
      "sequence": 2,
      "overallScore": 5463,
      "level": 2,
      "rcScores": { ... },
      "stdScores": { ... }
    }
  ]
}
```

**Implementation**: 
1. Get student basic info + roster name via JOIN
2. Get all scores for this student, JOIN with tests for name/sequence
3. For each score, parse `rc_scores` and `std_scores` JSON
4. Enrich with RC names and standard codes/descriptions from the respective tables
5. Sort scores by test sequence

### `GET /api/students/:id/assignments`

Returns all assignments for this student:

```json
{
  "assignments": [
    {
      "assignmentId": 1,
      "name": "Fractions Foundations",
      "platform": "ixl",
      "standards": [
        { "code": "3.NF.A.1", "description": "Understand fractions..." }
      ],
      "status": "completed",
      "startedAt": "2025-10-01",
      "completedAt": "2025-11-15",
      "preTestName": "PM1",
      "postTestName": "PM2"
    }
  ]
}
```

**Implementation**: JOIN `assignments.created_after_test_id` → `tests` for `preTestName`, and LEFT JOIN `assignments.impacted_test_id` → `tests` for `postTestName`.

## UI Components

### `src/app/student/[id]/page.tsx`

Main layout:

```tsx
<div className="p-6 space-y-6">
  <StudentHeader student={student} />
  
  <div className="grid grid-cols-3 gap-4">
    {student.scores.map(score => (
      <ScoreCard key={score.testId} score={score} />
    ))}
  </div>
  
  <RCTable scores={student.scores} />
  
  <StandardsAccordion scores={student.scores} />
  
  <TaskList assignments={assignments} />
</div>
```

### `src/components/student/StudentHeader.tsx`

- Back button (← "Back to Dashboard") using `router.back()` or link to `/dashboard`
- Student name (large, `text-3xl font-bold`)
- Roster name (muted text, smaller)
- Current level badge (from latest test, large badge with level name and color)
- Trend indicator: Compare level across all available tests. If level improved from earliest to latest, show green "↑ Improved". If same, show gray "→ Stable" (use `ArrowRight` icon, **not** `Minus`). If dropped, show red "↓ Declined".
- **Trend tooltip**: Wrap the trend indicator in a shadcn `Tooltip` with `cursor-help`. Tooltip text explains the meaning:
  - Stable: "Performance level unchanged between first and latest test"
  - Improved: "Performance level improved from first to latest test"
  - Declined: "Performance level dropped from first to latest test"

### `src/components/student/ScoreCards.tsx`

One shadcn `Card` per test taken:

- **Header**: Test name (e.g., "PM1") + administered date
- **Hero number**: Overall scale score (large, `text-4xl font-bold`)
- **Level badge**: Colored badge showing level name (e.g., "Understands")
- **Mini bar**: A thin horizontal bar (5100–5800) showing the score visually
  - Color matches level color
  - Background: gray-200
  - **Tooltip on hover**: Wrap the bar in a shadcn `Tooltip` with `cursor-help` showing: "{score} on a 5100–5800 scale ({percent}%)"

Cards should be in a horizontal row. With 6 possible tests, use `grid-cols-6` (or fewer if the student hasn't taken all tests). Show only tests taken.

**Comparison callout**: On PM2+ cards, show a delta from the previous test: "+78 pts from PM1" in green (or red if negative).

### `src/components/student/RCTable.tsx`

A shadcn `Table` comparing RC scores across tests:

| Reporting Category | PM1 Score | PM1 Level | PM2 Score | PM2 Level | ... | Change (Latest vs First) |
|-------------------|-----------|-----------|-----------|-----------|-----|--------|
| Number and Operations | 5342 | Beginning | 5458 | Approaching | ... | +116 ↑ |
| Algebraic Reasoning | 5410 | Approaching | 5424 | Approaching | ... | +14 → |

**Level calculation** for individual RC: same scale score thresholds as overall (<5410=L1, 5410–5469=L2, 5470–5529=L3, ≥5530=L4)

**Change column**: 
- Positive change ≥30 pts: green text with ↑
- Small change (<30 pts): gray text with →  
- Negative change ≥30 pts: red text with ↓

**Row highlighting**: If a change is ≥50 scale score points, highlight the row with a subtle green background (`bg-green-50`).

The table should show columns for all tests taken (PM1 through PM6 if available).

### `src/components/student/StandardsAccordion.tsx`

Uses shadcn `Accordion` (type="multiple"):

One accordion item per Reporting Category. Inside each:

A nested table:

| Standard | Code | PM1 | PM2 | ... | Change |
|----------|------|-----|-----|-----|--------|
| Understand fractions... | 3.NF.A.1 | 5280 | 5462 | ... | +182 ↑ |
| Represent fractions... | 3.NF.A.2 | 5345 | 5459 | ... | +114 ↑ |

**Formatting**: Same coloring as RC table (green/gray/red for change).

**Highlight assigned standards**: If a standard is linked to an assignment the student has, show a small icon (📋) next to the code. This connects the standard improvement to the assignment.

### `src/components/student/TaskList.tsx`

**Title**: "My Assignments" with count badge

shadcn `Card` list (not a table — use cards for visual variety):

Each card:
- **Left**: Platform icon/badge (colored by platform)
- **Middle**: 
  - Assignment name (bold)
  - Standards (small badges)
  - **Test window**: "Window: PM1 → PM2" (from `preTestName` / `postTestName`)
  - Date info: "Started Oct 1, 2025" / "Completed Nov 15, 2025"
- **Right**: Status badge
  - "Not Yet Started" → gray badge
  - "Started" → yellow badge  
  - "Completed" → green badge with checkmark

**Empty state**: "No assignments yet! 🎉" (show only if student has no assignments)

## Student Name Linking

Update `src/components/dashboard/StudentTable.tsx`:

Make the student name a clickable link:
```tsx
<Link href={`/student/${student.id}`} className="text-blue-600 hover:underline font-medium">
  {student.name}
</Link>
```

## Navigation Breadcrumb

Add breadcrumbs to the student page:
```
Dashboard > Mrs. Johnson - 3rd Grade Math > Alice Johnson
```

Use shadcn `Breadcrumb` component (or simple text links).

## Hooks

### `src/hooks/useStudent.ts`
```typescript
// useStudent(studentId) - fetches student with scores
// useStudentAssignments(studentId) - fetches student's assignments
```

## Verification

After implementing:
1. Click a student name on the dashboard → navigates to `/student/1`
2. Student header shows name, roster, current level with trend
3. Score cards show all available tests (up to 6) with deltas between consecutive tests
4. RC table compares scores across all tests with color-coded changes
5. Standards accordion expands to show individual standard scores
6. Standards linked to assignments show the 📋 icon
7. Task list shows assignments with correct status badges
8. Back button returns to the dashboard
9. Page works for students with only PM1 data (no subsequent tests yet)

Generate all the code. Do not use placeholder comments — write the full implementation for every file.
