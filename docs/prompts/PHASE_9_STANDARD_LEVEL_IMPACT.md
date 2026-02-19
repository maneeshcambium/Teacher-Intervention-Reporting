# Phase 9 Prompt: Standard-Level Impact Analysis

> **Feed this entire file to GitHub Copilot Chat or Replit Agent.**
> **Prerequisites**: Phases 1–8 complete. Assignments tab shows overall DiD impact per assignment.
> **Stack**: Next.js 14 App Router, TypeScript, shadcn/ui, Tailwind CSS, Recharts, TanStack Query, simple-statistics.

---

## Problem

The Assignments tab (Phase 5) answers: *"Did this assignment improve overall student performance?"* using Difference-in-Differences on the **average of aligned standard scores**. But teachers also need to know: *"Which specific standards improved and which didn't?"*

An assignment like "Fractions Foundations" may be aligned to standards `3.NF.A.1`, `3.NF.A.2`, and `3.NF.A.3`. The current view collapses all three into a single DiD number (+53 pts). But maybe `3.NF.A.1` improved by +90 pts while `3.NF.A.3` actually regressed by −15 pts. The teacher needs this granularity to decide whether to re-assign targeted practice on `3.NF.A.3` or move on.

## Design Decision: Expand Within Assignments Tab (Not a New Tab)

This belongs **inside the existing Assignments tab** rather than a new tab because:

1. **Context matters** — Standard-level impact only makes sense in the context of a specific assignment. It answers *"How did this assignment affect each standard it targeted?"* which is a drill-down from the existing assignment cards.
2. **Avoids tab sprawl** — We already have 3 tabs (Overview, Standards Analysis, Assignments). A 4th tab for a sub-feature would fragment the workflow.
3. **Natural interaction** — Teachers already click an assignment card to see its scatter plot. Extending that detail view with a per-standard breakdown feels intuitive — click card → see overall DiD + per-standard DiD.

**Placement**: Below the existing scatter plot / impact table row, show a **Standard Impact Breakdown** panel that appears when an assignment is selected. This panel contains a bar chart and detail table showing DiD results per individual standard.

---

## 1. Backend: Per-Standard DiD Calculation

### New Function in `src/lib/impact.ts`

#### `calculateStandardLevelImpact(assignmentId: number): StandardImpactResult | null`

This function computes DiD **per standard** rather than averaging all aligned standards together.

```typescript
export interface StandardDiDResult {
  standardId: number;
  code: string;              // e.g. "3.NF.A.1"
  description: string;       // e.g. "Understand a fraction 1/b..."
  
  // Treated group
  treatedCount: number;
  treatedPreAvg: number;     // Avg scale score on this standard, pre-test
  treatedPostAvg: number;    // Avg scale score on this standard, post-test
  treatedDelta: number;      // treatedPostAvg - treatedPreAvg

  // Control group
  controlCount: number;
  controlPreAvg: number;
  controlPostAvg: number;
  controlDelta: number;

  // DiD
  didImpact: number;         // treatedDelta - controlDelta
  pValue: number | null;
  isSignificant: boolean;
}

export interface StandardImpactResult {
  assignmentId: number;
  assignmentName: string;
  platform: string;
  rcName: string;
  preTestName: string;
  postTestName: string;
  overallDidImpact: number;  // The existing overall DiD for context
  standards: StandardDiDResult[];
}
```

**Implementation steps:**

1. **Get assignment metadata** — same as `calculateAssignmentImpact`: load assignment, linked standards, pre/post test IDs.

2. **Get treated & control student lists** — same logic as existing (treated = completed; control = same roster, not assigned).

3. **For each linked standard**, independently:
   a. Extract that single standard's score from `std_scores` JSON for each treated student on pre-test and post-test.
   b. Do the same for each control student.
   c. Compute `treatedDelta`, `controlDelta`, `didImpact` for this standard alone.
   d. Run `tTestTwoSample` on per-student gains (treated vs control) for this standard.
   e. Compute approximate p-value.

4. **Return** the array sorted by `didImpact` descending (highest impact standards first).

```typescript
export function calculateStandardLevelImpact(
  assignmentId: number
): StandardImpactResult | null {
  // 1. Get assignment metadata (same as calculateAssignmentImpact)
  const assignment = sqlite
    .prepare(
      `SELECT a.id, a.name, a.platform, a.created_after_test_id as createdAfterTestId,
              a.impacted_test_id as impactedTestId, a.group_id as groupId,
              COALESCE(rc.name, '') as rcName
       FROM assignments a
       LEFT JOIN reporting_categories rc ON rc.id = a.rc_id
       WHERE a.id = ?`
    )
    .get(assignmentId) as AssignmentMeta | undefined;

  if (!assignment || !assignment.impactedTestId) return null;

  const preTest = sqlite
    .prepare(`SELECT name FROM tests WHERE id = ?`)
    .get(assignment.createdAfterTestId) as { name: string } | undefined;
  const postTest = sqlite
    .prepare(`SELECT name FROM tests WHERE id = ?`)
    .get(assignment.impactedTestId) as { name: string } | undefined;
  const preTestName = preTest?.name ?? `Test ${assignment.createdAfterTestId}`;
  const postTestName = postTest?.name ?? `Test ${assignment.impactedTestId}`;

  // 2. Get linked standards with descriptions
  const standardRows = sqlite
    .prepare(
      `SELECT ast.standard_id as standardId, s.code, s.description
       FROM assignment_standards ast
       JOIN standards s ON s.id = ast.standard_id
       WHERE ast.assignment_id = ?`
    )
    .all(assignmentId) as { standardId: number; code: string; description: string }[];

  if (standardRows.length === 0) return null;

  // 3. Get treated students (completed)
  const treatedStudents = sqlite
    .prepare(
      `SELECT asn.student_id as studentId, st.roster_id as rosterId
       FROM assignment_students asn
       JOIN students st ON st.id = asn.student_id
       WHERE asn.assignment_id = ? AND asn.status = 'completed'`
    )
    .all(assignmentId) as TreatedStudentRow[];

  const treatedStudentIds = treatedStudents.map((s) => s.studentId);
  const rosterIds = [...new Set(treatedStudents.map((s) => s.rosterId))];

  // 4. Get control students (same roster, not assigned)
  const allAssignedRows = sqlite
    .prepare(
      `SELECT student_id as studentId FROM assignment_students WHERE assignment_id = ?`
    )
    .all(assignmentId) as { studentId: number }[];
  const allAssignedIds = new Set(allAssignedRows.map((r) => r.studentId));

  const rosterPlaceholders = rosterIds.map(() => "?").join(",");
  const controlStudents = rosterIds.length > 0
    ? (sqlite
        .prepare(
          `SELECT id as studentId FROM students WHERE roster_id IN (${rosterPlaceholders})`
        )
        .all(...rosterIds) as { studentId: number }[])
    : [];
  const controlStudentIds = controlStudents
    .map((s) => s.studentId)
    .filter((id) => !allAssignedIds.has(id));

  // 5. Load all std_scores for treated and control on pre and post tests
  function getStdScoresMap(
    studentIds: number[],
    testId: number
  ): Map<number, Record<string, number>> {
    if (studentIds.length === 0) return new Map();
    const placeholders = studentIds.map(() => "?").join(",");
    const rows = sqlite
      .prepare(
        `SELECT student_id as studentId, std_scores as stdScores
         FROM scores
         WHERE student_id IN (${placeholders}) AND test_id = ?`
      )
      .all(...studentIds, testId) as { studentId: number; stdScores: string }[];
    const map = new Map<number, Record<string, number>>();
    for (const r of rows) {
      map.set(r.studentId, JSON.parse(r.stdScores));
    }
    return map;
  }

  const preTestId = assignment.createdAfterTestId;
  const postTestId = assignment.impactedTestId;

  const treatedPre = getStdScoresMap(treatedStudentIds, preTestId);
  const treatedPost = getStdScoresMap(treatedStudentIds, postTestId);
  const controlPre = getStdScoresMap(controlStudentIds, preTestId);
  const controlPost = getStdScoresMap(controlStudentIds, postTestId);

  // 6. Compute per-standard DiD
  const overallImpact = calculateAssignmentImpact(assignmentId, false);

  const standardResults: StandardDiDResult[] = standardRows.map((std) => {
    const sid = String(std.standardId);

    // Treated gains for this standard
    const treatedGains: number[] = [];
    const treatedPreVals: number[] = [];
    const treatedPostVals: number[] = [];
    for (const studentId of treatedStudentIds) {
      const pre = treatedPre.get(studentId)?.[sid];
      const post = treatedPost.get(studentId)?.[sid];
      if (pre != null && post != null) {
        treatedPreVals.push(pre);
        treatedPostVals.push(post);
        treatedGains.push(post - pre);
      }
    }

    // Control gains for this standard
    const controlGains: number[] = [];
    const controlPreVals: number[] = [];
    const controlPostVals: number[] = [];
    for (const studentId of controlStudentIds) {
      const pre = controlPre.get(studentId)?.[sid];
      const post = controlPost.get(studentId)?.[sid];
      if (pre != null && post != null) {
        controlPreVals.push(pre);
        controlPostVals.push(post);
        controlGains.push(post - pre);
      }
    }

    const treatedPreAvg = mean(treatedPreVals);
    const treatedPostAvg = mean(treatedPostVals);
    const treatedDelta = treatedPostAvg - treatedPreAvg;

    const controlPreAvg = mean(controlPreVals);
    const controlPostAvg = mean(controlPostVals);
    const controlDelta = controlPostAvg - controlPreAvg;

    const didImpact = treatedDelta - controlDelta;

    // t-test on gains
    let pValue: number | null = null;
    let isSignificant = false;
    if (treatedGains.length >= 2 && controlGains.length >= 2) {
      try {
        const tStat = tTestTwoSample(treatedGains, controlGains);
        if (tStat != null) {
          const df = treatedGains.length + controlGains.length - 2;
          pValue = approximatePValue(Math.abs(tStat), df);
          isSignificant = pValue < 0.05;
        }
      } catch {
        pValue = null;
      }
    }

    return {
      standardId: std.standardId,
      code: std.code,
      description: std.description,
      treatedCount: treatedGains.length,
      treatedPreAvg: Math.round(treatedPreAvg),
      treatedPostAvg: Math.round(treatedPostAvg),
      treatedDelta: Math.round(treatedDelta),
      controlCount: controlGains.length,
      controlPreAvg: Math.round(controlPreAvg),
      controlPostAvg: Math.round(controlPostAvg),
      controlDelta: Math.round(controlDelta),
      didImpact: Math.round(didImpact),
      pValue: pValue != null ? Math.round(pValue * 1000) / 1000 : null,
      isSignificant,
    };
  });

  // Sort by didImpact descending
  standardResults.sort((a, b) => b.didImpact - a.didImpact);

  return {
    assignmentId: assignment.id,
    assignmentName: assignment.name,
    platform: assignment.platform,
    rcName: assignment.rcName,
    preTestName,
    postTestName,
    overallDidImpact: overallImpact?.didImpact ?? 0,
    standards: standardResults,
  };
}
```

Note: `mean`, `approximatePValue`, and `tTestTwoSample` already exist in `impact.ts`. Make sure `approximatePValue` is accessible to the new function (it's already a module-scoped function). The `AssignmentMeta` and `TreatedStudentRow` interfaces are already defined.

---

## 2. API Route

### `GET /api/assignments/:id/standard-impact`

**File**: `src/app/api/assignments/[id]/standard-impact/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { calculateStandardLevelImpact } from "@/lib/impact";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const assignmentId = Number(id);

    if (isNaN(assignmentId)) {
      return NextResponse.json(
        { error: "Invalid assignment ID" },
        { status: 400 }
      );
    }

    const result = calculateStandardLevelImpact(assignmentId);

    if (!result) {
      return NextResponse.json(
        { error: "Assignment not found or has no impacted test" },
        { status: 404 }
      );
    }

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    console.error("Failed to calculate standard-level impact:", error);
    return NextResponse.json(
      { error: "Failed to calculate standard-level impact" },
      { status: 500 }
    );
  }
}
```

---

## 3. Types

### Add to `src/types/index.ts`

```typescript
// ─── Standard-Level Impact Types ────────────────────────────────────────────

export interface StandardDiDResult {
  standardId: number;
  code: string;
  description: string;
  treatedCount: number;
  treatedPreAvg: number;
  treatedPostAvg: number;
  treatedDelta: number;
  controlCount: number;
  controlPreAvg: number;
  controlPostAvg: number;
  controlDelta: number;
  didImpact: number;
  pValue: number | null;
  isSignificant: boolean;
}

export interface StandardImpactResult {
  assignmentId: number;
  assignmentName: string;
  platform: string;
  rcName: string;
  preTestName: string;
  postTestName: string;
  overallDidImpact: number;
  standards: StandardDiDResult[];
}
```

---

## 4. Hook

### `src/hooks/useStandardImpact.ts`

```typescript
"use client";

import { useQuery } from "@tanstack/react-query";
import type { StandardImpactResult } from "@/types";

export function useStandardImpact(assignmentId: number | null) {
  return useQuery<StandardImpactResult>({
    queryKey: ["standard-impact", assignmentId],
    queryFn: async () => {
      const res = await fetch(`/api/assignments/${assignmentId}/standard-impact`);
      if (!res.ok) throw new Error("Failed to fetch standard-level impact");
      return res.json();
    },
    enabled: assignmentId != null,
    staleTime: 5 * 60 * 1000,
  });
}
```

---

## 5. UI Components

### 5a. `src/components/impact/StandardImpactBreakdown.tsx`

This is the main component that appears below the scatter plot + impact table when an assignment is selected. It contains two sub-sections: a horizontal bar chart and a detail table.

**Layout:**

```tsx
<Card className="col-span-full">
  <CardHeader>
    <div className="flex items-center justify-between">
      <div>
        <CardTitle className="text-lg">
          Standard-Level Impact: {assignmentName}
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          DiD impact broken down by each targeted standard •
          Overall: <span className="font-semibold text-green-600">+{overallDidImpact} pts</span>
        </p>
      </div>
    </div>
  </CardHeader>
  <CardContent className="space-y-6">
    <StandardImpactChart standards={standards} />
    <StandardImpactTable standards={standards} preTestName={preTestName} postTestName={postTestName} />
  </CardContent>
</Card>
```

**Visibility**: Only render when `selectedAssignmentId` is not null and data has loaded. Show a `Skeleton` while loading. When no assignment is selected, do not render this section at all.

### 5b. `StandardImpactChart` (inside the same file or separate)

A **horizontal bar chart** using Recharts `BarChart` with `layout="vertical"`:

- **Y-axis**: Standard code (e.g. "3.NF.A.1", "3.NF.A.2")
- **X-axis**: DiD Impact (scale score points)
- **Bars**: Color-coded:
  - Green (`#16a34a`) for positive impact
  - Red (`#dc2626`) for negative impact
- **Reference line** at x=0 (vertical dashed line)
- **Overall average line**: Dashed blue line at the overall DiD value
- **Labels**: Show value on each bar (e.g. "+90", "−15")
- **Tooltip**: Show standard description, treated Δ, control Δ, DiD, p-value
- **Height**: Dynamic based on number of standards — `Math.max(200, standards.length * 50)` px

```tsx
<ResponsiveContainer width="100%" height={Math.max(200, standards.length * 50)}>
  <BarChart data={chartData} layout="vertical" margin={{ left: 80, right: 40 }}>
    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
    <XAxis type="number" label={{ value: "DiD Impact (pts)", position: "bottom" }} />
    <YAxis type="category" dataKey="code" width={75} tick={{ fontSize: 12 }} />
    <ReferenceLine x={0} stroke="#6b7280" strokeDasharray="3 3" />
    <ReferenceLine
      x={overallDidImpact}
      stroke="#3b82f6"
      strokeDasharray="5 5"
      label={{ value: `Overall: +${overallDidImpact}`, position: "top", fill: "#3b82f6", fontSize: 11 }}
    />
    <Bar dataKey="didImpact" radius={[0, 4, 4, 0]}>
      {chartData.map((entry, index) => (
        <Cell key={index} fill={entry.didImpact >= 0 ? "#16a34a" : "#dc2626"} />
      ))}
      <LabelList dataKey="didImpact" position="right" fontSize={11}
        formatter={(val: number) => `${val >= 0 ? "+" : ""}${val}`} />
    </Bar>
    <Tooltip content={<StandardImpactTooltip />} />
  </BarChart>
</ResponsiveContainer>
```

The custom tooltip should show:
```
3.NF.A.1 — Understand a fraction 1/b...
────────────────────────────
Treated:  5280 → 5395  (+115)
Control:  5510 → 5535  (+25)
DiD Impact: +90 pts
p = 0.002 ✓
```

### 5c. `StandardImpactTable` (inside same file or separate)

A shadcn `Table` with sortable columns:

| Standard | Description | Treated Δ | Control Δ | **DiD Impact** | p-value | Sig? |
|----------|-------------|-----------|-----------|----------------|---------|------|
| 3.NF.A.1 | Understand a fraction... | +115 | +25 | **+90** | 0.002 | ✓ |
| 3.NF.A.2 | Understand a fraction... | +72 | +18 | **+54** | 0.012 | ✓ |
| 3.NF.A.3 | Explain equivalence... | +10 | +25 | **−15** | 0.340 | ✗ |

**Formatting:**
- Standard code in `font-mono` styling
- Description truncated with tooltip for full text
- Treated Δ and Control Δ: Show with +/- sign, colored green/red
- DiD Impact: Bold, largest font in the row, colored green (positive) / red (negative)
- p-value: 3 decimal places, or "—" if null
- Sig: ✓ (green) or ✗ (gray)

**Default sort**: By `didImpact` descending.

---

## 6. Integration into Impact Page

### Update `src/app/dashboard/impact/page.tsx`

Add the `StandardImpactBreakdown` below the existing scatter plot / impact table grid:

```tsx
import { useStandardImpact } from "@/hooks/useStandardImpact";
import { StandardImpactBreakdown } from "@/components/impact/StandardImpactBreakdown";

// Inside the component, add a new query:
const { data: standardImpact, isLoading: standardImpactLoading } = useStandardImpact(
  selectedAssignmentId
);

// After the existing grid (scatter plot + impact table), add:
{selectedAssignmentId && (
  <StandardImpactBreakdown
    data={standardImpact ?? null}
    isLoading={standardImpactLoading}
  />
)}
```

The full return JSX becomes:

```tsx
<div className="p-6 space-y-6">
  {/* Header — unchanged */}
  <div className="flex items-center justify-between">
    <div>
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold">Assignments</h1>
        <ImpactInfoDialog />
      </div>
      <p className="text-muted-foreground">
        Difference-in-Differences measurement of assignment effectiveness
      </p>
    </div>
    {summary?.calculatedAt && (
      <Badge variant="outline">
        Calculated at {new Date(summary.calculatedAt).toLocaleTimeString()}
      </Badge>
    )}
  </div>

  {/* Impact cards — unchanged */}
  <ImpactCards
    impacts={impacts}
    selectedId={selectedAssignmentId}
    onSelect={setSelectedAssignmentId}
  />

  {/* Scatter plot + impact table — unchanged */}
  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
    <ScatterPlot
      impact={selectedImpact ?? null}
      isLoading={detailLoading && selectedAssignmentId != null}
    />
    <ImpactTable
      impacts={impacts}
      selectedId={selectedAssignmentId}
      onSelect={setSelectedAssignmentId}
    />
  </div>

  {/* NEW: Standard-level breakdown — only when an assignment is selected */}
  {selectedAssignmentId && (
    <StandardImpactBreakdown
      data={standardImpact ?? null}
      isLoading={standardImpactLoading}
    />
  )}
</div>
```

---

## 7. Edge Cases

- **No assigned standards**: If the assignment has no linked standards, do not show the panel (the API returns `null`).
- **Single standard**: If only 1 standard is linked, still show the chart and table — the bar chart just has one bar, and the teacher can see that the overall DiD equals the single standard DiD.
- **No completed students**: If `treatedCount` is 0 for all standards, show an empty state: *"No students have completed this assignment yet."*
- **Mixed significance**: Some standards may be significant and others not — this is exactly the insight this feature surfaces.

---

## 8. Verification

After implementing:

1. Navigate to `/dashboard/impact` (the "Assignments" tab).
2. Click on an assignment card (e.g. "Fractions Foundations").
3. Below the scatter plot and impact table, a new **Standard-Level Impact** panel appears.
4. The horizontal bar chart shows one bar per linked standard, colored green/red.
5. A blue dashed overall reference line shows how the overall DiD compares.
6. The detail table shows treated Δ, control Δ, and DiD per standard with p-values.
7. Standards with negative DiD (if any) appear in red — these are the standards the teacher should re-target.
8. Click a different assignment card — the panel updates with that assignment's standard breakdown.
9. Deselect the assignment — the panel disappears cleanly.

Generate all the code. Do not use placeholder comments — write the full implementation for every file.

---

## 9. Accessibility Fix: SheetTitle in StandardDetailPanel

The `StandardDetailPanel` (`src/components/standards/StandardDetailPanel.tsx`) uses a shadcn `Sheet` (which wraps Radix `Dialog`). Radix requires a `DialogTitle` inside every `DialogContent` for accessibility. The original implementation only rendered `SheetTitle` in the data-loaded branch, causing a console error when loading or when data was null.

**Fix**: Ensure a `SheetTitle` is present in every rendering branch:

- **Loading state**: Wrap the skeleton inside a `SheetHeader` with a `SheetTitle` containing a skeleton.
- **No-data fallback**: Render a `SheetHeader` with a static `SheetTitle` ("Standard Detail").
- **Data-loaded state**: Already had `SheetTitle` — no change needed.

---

## 10. Assign to Existing Assignments

### Problem

When a teacher clicks a standard in Standards Analysis, selects struggling students, and clicks "Assign," the slide-over always opens a **Create New Assignment** form. But often an assignment for that standard already exists — the teacher just wants to add more students to it.

### Solution

Redesign `AssignmentSlideOver` with two modes:

1. **Choose mode** (default) — Shows a list of existing assignments plus a "Create New Assignment" button.
2. **Create mode** — The original new assignment form, accessible via the button, with a back arrow to return.

### Backend Changes

#### New function in `src/lib/queries.ts`: `addStudentsToAssignment`

```typescript
export function addStudentsToAssignment(
  assignmentId: number,
  studentIds: number[]
): { added: number } {
  const result = sqlite.transaction(() => {
    const check = sqlite.prepare(
      `SELECT 1 FROM assignment_students WHERE assignment_id = ? AND student_id = ?`
    );
    const insert = sqlite.prepare(
      `INSERT INTO assignment_students (assignment_id, student_id, status) VALUES (?, ?, 'not_started')`
    );
    let added = 0;
    for (const studentId of studentIds) {
      const existing = check.get(assignmentId, studentId);
      if (!existing) {
        insert.run(assignmentId, studentId);
        added++;
      }
    }
    return { added };
  })();
  return result;
}
```

Skips students already assigned (avoids primary key conflicts on `(assignment_id, student_id)`).

#### New API route: `POST /api/assignments/[id]/students`

**File**: `src/app/api/assignments/[id]/students/route.ts`

Accepts `{ studentIds: number[] }`, calls `addStudentsToAssignment`, returns `{ added: number }`.

### Frontend Changes

#### `AssignmentSlideOver` (`src/components/AssignmentSlideOver.tsx`)

- Added `mode` state: `"choose" | "create"`.
- **Choose mode** renders:
  - "Create New Assignment" button (switches to create mode).
  - Separator with "or add to existing" text.
  - List of existing assignments, each showing name, platform, RC, student count, standard count, and an "Add" button.
- **Create mode** renders the original form with a back arrow button to return to choose mode.
- New prop: `filterStandardCode?: string | null` — when set, only shows existing assignments aligned to that standard code.
- Uses `useAssignments` hook to fetch existing assignments and `useQueryClient` to invalidate caches after adding.

### Type Changes

#### `AssignmentListItem` in `src/types/index.ts`

Added `createdAfterTestId: number` field.

#### `getAssignments` query in `src/lib/queries.ts`

Added `a.created_after_test_id as createdAfterTestId` to the SELECT and return mapping.

---

## 11. Filter Existing Assignments by Standard and Test Window

### Problem

When the teacher clicks standard `3.NF.A.1` in Standards Analysis while viewing PM1, the "add to existing" list should only show assignments that (a) target that standard and (b) belong to the same test window (created after PM1).

### Changes

#### Standard code passthrough

Updated the callback chain to pass the clicked standard code from `StandardDetailPanel` → `StandardStudentList` → `StandardsPage` → `AssignmentSlideOver`:

- `StandardDetailPanel.onSelectStudents` signature changed: `(studentIds: number[], standardCode: string) => void`
- `StandardDetailPanel` passes `data.standard.code` when calling the callback.
- `StandardsPage` captures `filterStandardCode` state and passes it to `AssignmentSlideOver`.
- `StandardsPage.handleAssignmentSuccess` resets `filterStandardCode` to null.

#### Dual filtering in `AssignmentSlideOver`

```typescript
const existingAssignments = useMemo(() => {
  let filtered = assignments ?? [];
  if (filterStandardCode) {
    filtered = filtered.filter((a) => a.standards.includes(filterStandardCode));
  }
  if (selectedTestId) {
    filtered = filtered.filter((a) => a.createdAfterTestId === selectedTestId);
  }
  return filtered;
}, [assignments, filterStandardCode, selectedTestId]);
```

When `filterStandardCode` is set, the slide-over description also shows: *"Showing assignments aligned to `3.NF.A.1`."*

The Overview tab's usage of `AssignmentSlideOver` is unaffected — it doesn't pass `filterStandardCode`, so all assignments show.
