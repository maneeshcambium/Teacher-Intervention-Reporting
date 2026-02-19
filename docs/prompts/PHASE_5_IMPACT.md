# Phase 5 Prompt: Impact Analysis (DiD Engine + Visualization)

> **Feed this entire file to GitHub Copilot Chat or Replit Agent.**
> **Prerequisites**: Phases 1–4 complete. Assignments exist with completed/control students.
> **Stack**: Next.js 14 App Router, TypeScript, Recharts, simple-statistics, Drizzle ORM.

---

## Task

Build the statistical impact analysis engine and visualization page showing Difference-in-Differences (DiD) results per assignment.

## Core Concept: Difference-in-Differences (DiD)

The DiD method isolates the **causal effect** of an assignment by comparing:
- **Treated group**: Students who **completed** the assignment
- **Control group**: Students who were **NOT assigned** (but were at the same performance level at baseline)

**Formula:**
```
DiD Impact = (Avg_Treated_Post - Avg_Treated_Pre) - (Avg_Control_Post - Avg_Control_Pre)
```

Where Pre = the test before the assignment window and Post = the impacted test:
- Window 1 assignments: Pre = PM1, Post = PM2
- Window 2 assignments: Pre = PM3, Post = PM4
- Window 3 assignments: Pre = PM4, Post = PM5

This removes natural growth (which both groups experience) and isolates the assignment's effect.

**Important**: The scores used should be the **average of standard-level scores that align with the assignment**, not the overall score. This makes the impact measurement precise. Scores are scale scores (range ~5100–5800).

## File: `src/lib/impact.ts`

### Function: `calculateAssignmentImpact(assignmentId: number)`

```typescript
interface ImpactResult {
  assignmentId: number;
  assignmentName: string;
  platform: string;
  standards: string[];           // Standard codes
  rcName: string;
  
  // Window info — which PM tests are being compared
  preTestName: string;           // e.g. "PM1"
  postTestName: string;          // e.g. "PM2"
  
  // Treated group stats
  treatedCount: number;
  treatedPreAvg: number;         // Avg aligned-standard scale score on Pre test
  treatedPostAvg: number;        // Avg aligned-standard scale score on Post test
  treatedDelta: number;          // treatedPostAvg - treatedPreAvg (scale score points)
  
  // Control group stats
  controlCount: number;
  controlPreAvg: number;
  controlPostAvg: number;
  controlDelta: number;
  
  // DiD result
  didImpact: number;             // treatedDelta - controlDelta (scale score points)
  didImpactPercent: number;      // didImpact as percentage of pre score
  
  // Optional: statistical significance
  pValue: number | null;         // from two-sample t-test (use simple-statistics)
  isSignificant: boolean;        // p < 0.05
  
  // Raw data for scatter plot (only included in single-assignment detail endpoint)
  treatedPoints?: Array<{ studentId: number; pre: number; post: number }>;
  controlPoints?: Array<{ studentId: number; pre: number; post: number }>;
}
```

**Implementation steps:**

1. **Get assignment metadata**: Load assignment + linked standards + `createdAfterTestId` (Pre test) and `impactedTestId` (Post test). Also fetch the test names (e.g. "PM1", "PM2") to populate `preTestName` and `postTestName`.

2. **Get treated students**: Query `assignment_students` WHERE status = 'completed' for this assignment.

3. **Calculate treated scores**: For each treated student:
   - Get their Pre test `std_scores` (JSON), extract only the standard IDs linked to this assignment
   - Average those standard scores → `pre` score (scale score, ~5100–5800)
   - Do the same for Post test → `post` score
   - Parse JSON: `JSON.parse(score.stdScores)` then pick keys matching assignment's standard IDs

4. **Get control students**: Students who are:
   - In the same roster as any treated student
   - NOT in `assignment_students` for this assignment
   - Had a similar Pre test level as treated students (within the same level range)
   
   For simplicity in POC: control = all students in same roster NOT assigned to this assignment.

5. **Calculate control scores**: Same process as treated — average only the aligned standard scores on Pre and Post tests.

6. **Compute DiD**:
   ```
   treatedDelta = mean(treated.post) - mean(treated.pre)
   controlDelta = mean(control.post) - mean(control.pre)
   didImpact = treatedDelta - controlDelta
   ```

7. **Statistical test** (optional but impressive for demo):
   - Use `simple-statistics.tTestTwoSample()` 
   - Compare treated gains vs control gains
   - Treated gains array: `treated.map(s => s.post - s.pre)`
   - Control gains array: `control.map(s => s.post - s.pre)`
   - Return p-value

### Function: `calculateAllImpacts(groupId: number)`

Calls `calculateAssignmentImpact` for every assignment in the test group.
Returns `ImpactResult[]` sorted by `didImpact` descending.

## API Routes

### `GET /api/assignments/:id/impact`

Returns `ImpactResult` for a single assignment.

Important: This is a computationally expensive query. Cache the result using appropriate headers or TanStack Query stale times.

### `GET /api/impact/summary?groupId=X`

Returns `ImpactResult[]` for all assignments in the group.

Response structure:
```json
{
  "impacts": [
    {
      "assignmentId": 1,
      "assignmentName": "Fractions Foundations",
      "platform": "ixl",
      "standards": ["3.NF.A.1", "3.NF.A.2", "3.NF.A.3"],
      "rcName": "Number and Operations",
      "preTestName": "PM1",
      "postTestName": "PM2",
      "treatedCount": 1093,
      "treatedPreAvg": 5383,
      "treatedPostAvg": 5448,
      "treatedDelta": 65,
      "controlCount": 1060,
      "controlPreAvg": 5536,
      "controlPostAvg": 5548,
      "controlDelta": 12,
      "didImpact": 53,
      "didImpactPercent": 1,
      "pValue": 0.001,
      "isSignificant": true
    }
  ],
  "calculatedAt": "2026-02-18T10:00:00Z"
}
```

Note: Omit `treatedPoints` and `controlPoints` from the summary endpoint — only include them in the single-assignment detail endpoint to keep response sizes small.

## UI Components

### `src/app/dashboard/impact/page.tsx`

Layout:
```tsx
<div className="p-6 space-y-6">
  <div className="flex items-center justify-between">
    <div>
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold">Impact Analysis</h1>
        <ImpactInfoDialog />  {/* ℹ️ icon that opens an explainer popup */}
      </div>
      <p className="text-muted-foreground">Difference-in-Differences measurement of assignment effectiveness</p>
    </div>
    <Badge variant="outline">Calculated at {time}</Badge>
  </div>
  
  <ImpactCards impacts={impacts} />
  <div className="grid grid-cols-2 gap-6">
    <ScatterPlot selectedAssignment={selected} />
    <ImpactTable impacts={impacts} />
  </div>
</div>
```

### `src/components/impact/ImpactCard.tsx`

One card per assignment. Grid layout (2-3 per row).

**Card contents:**
- **Header**: Assignment name + platform badge (colored)
- **Hero number**: DiD Impact in scale score points (large, ~48px font)
  - Green (`text-green-600`) if positive
  - Red (`text-red-600`) if negative
  - Show "↑" or "↓" arrow
  - Show the value as "+50 pts" format
- **Significance badge**: "p < 0.05 ✓" (green) or "Not Significant" (gray)
- **Standard chips**: shadcn `Badge` for each standard code
- **Mini comparison**:
  ```
  Treated:  5285 → 5340  (+55)
  Control:  5465 → 5470  (+5)
  ```
  Use small text with arrow icons
- **Sparkline**: Tiny Recharts `LineChart` (no axes, just the lines):
  - Green line: Treated (Pre → Post)
  - Gray line: Control (Pre → Post)
  - The gap between endpoints = DiD

**Click behavior**: Clicking a card selects it, populating the scatter plot below with that assignment's data.

### `src/components/impact/ScatterPlot.tsx`

Recharts `ScatterChart`:
- **X-axis**: "Pre-Intervention Score" — range 5100–5800
- **Y-axis**: "Post-Intervention Score" — range 5100–5800
- **Diagonal reference line**: y = x (no change line, dashed gray)
- **Treated points**: Green dots (from `treatedPoints`)
- **Control points**: Gray dots with 0.3 opacity (from `controlPoints`)
- **Legend**: "Completed Assignment" (green) / "Control" (gray)
- **Tooltip**: Student ID, Pre score, Post score, Gain
- **Responsive**: Width = 100% of container

The scatter plot should show that treated (green) points are **above** the diagonal line (they improved), while control (gray) points are **near** the diagonal line (little/no change).

When no assignment is selected, show a placeholder: "Click an impact card to view the scatter plot".

### `src/components/impact/ImpactTable.tsx`

shadcn `Table` with all assignments:

**Columns:**
| Assignment | Platform | N (Treated) | N (Control) | Treated Δ | Control Δ | **DiD Impact** | p-value | Sig? |
|-----------|----------|-------------|-------------|-----------|-----------|---------------|---------|------|

**Formatting:**
- Treated Δ and Control Δ: Show with +/- sign, 1 decimal
- DiD Impact: Bold, colored (green/red), show as "+50 pts" format  
- p-value: 3 decimal places, or "—" if not calculated
- Sig?: ✓ (green) or ✗ (gray)

**Sorting**: Default sort by DiD Impact descending. Clickable headers for re-sort.

**Row click**: Same as card click — selects assignment for scatter plot.

## Navigation

Add "Impact" link to the dashboard navigation:
- If using tabs: Add "Impact" tab alongside "Overview" and "Assignments"
- If using sidebar: Add navigation item
- The recommended approach: Use shadcn `Tabs` in the dashboard layout:
  - Tab 1: "Overview" → `/dashboard`
  - Tab 2: "Assignments" → `/dashboard/assignments`
  - Tab 3: "Impact Analysis" → `/dashboard/impact`

## Hooks

### `src/hooks/useImpact.ts`
```typescript
// useImpactSummary(groupId) - fetches all impacts
// useAssignmentImpact(assignmentId) - fetches single impact with scatter data
// Stale time: 5 minutes (these are expensive calculations)
```

## Verification

After implementing:
1. Navigate to `/dashboard/impact`
2. See 8 impact cards (from 8 seeded assignments across 3 intervention windows)
3. Each card shows positive DiD (~35–65 scale score points) — because seed data has growth bias for completed students
4. "Fractions Foundations" should show high impact (it has the most aligned standards)
5. Clicking a card shows the scatter plot — green dots clearly above the diagonal line
6. Impact table shows all 8 assignments with correct statistics
7. p-values should be < 0.05 (statistically significant) due to intentional seed data bias
8. If no assignments are completed yet, impact shows 0 pts with a note

Generate all the code. Do not use placeholder comments — write the full implementation for every file.
