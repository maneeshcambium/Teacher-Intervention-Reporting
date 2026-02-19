# Phase 12 Prompt: Student × Standard True Heatmap

> **Feed this entire file to GitHub Copilot Chat or Replit Agent.**
> **Prerequisites**: Phases 1–8 complete.
> **Stack**: Next.js 14 App Router, TypeScript, shadcn/ui, Tailwind CSS, Recharts, TanStack Query.

---

## Problem Statement

The current "Standards Heatmap" on the Standards Analysis tab is really a **table** — it shows average scores per standard grouped by performance level (L1–L4). While the data is color-coded, it only shows **aggregated averages**, not individual student performance. This means:

1. **Teachers can't spot individual outliers** — a student proficient overall but struggling on one specific standard is invisible in the averages.
2. **Clusters of struggling students are hidden** — the averages smooth out the picture. A standard might show "Approaching" average but actually have a bimodal split of students who deeply understand it and students who don't at all.
3. **It's not a heatmap** — it's a colored table. A true heatmap is a 2D grid where color intensity encodes a single continuous variable across two categorical or ordinal axes.

### What a True Heatmap Looks Like

Think of a **risk matrix** (Impact × Likelihood → color-coded risk score). We want the same concept applied to student performance:

| | 3.NF.A.1 | 3.NF.A.2 | 3.OA.A.1 | 3.OA.B.5 | ... |
|---|---|---|---|---|---|
| **Student A** | 🟢 5520 | 🟢 5490 | 🔴 5310 | 🟡 5440 | ... |
| **Student B** | 🔴 5280 | 🔴 5350 | 🔴 5300 | 🔴 5320 | ... |
| **Student C** | 🟢 5510 | 🟡 5450 | 🟢 5500 | 🟢 5530 | ... |

- **Y-axis**: Students (rows), sorted by overall score from lowest (top) to highest (bottom) — like a risk matrix, the "hottest" rows are at the top
- **X-axis**: Standards (columns), grouped by Reporting Category
- **Cell color**: Continuous color scale from red (far below proficiency) → yellow (approaching) → green (proficient) → blue (advanced)

This creates the classic heatmap gradient: the top-left region is dominated by red/orange (lowest-scoring students on hardest standards), transitioning to green/blue in the bottom-right (highest-scoring students on easiest standards). Anomalies — like a green cell in a red row, or a red cell in a green row — instantly stand out as outliers.

---

## Design Rationale

### Why Student × Standard (not the other way around)?

While the user considered both orientations, **Students on Y-axis × Standards on X-axis** is the right choice because:

1. **Horizontal scrolling is more natural** — There are ~20 standards but only ~30 students. Standards as columns lets the teacher scroll horizontally through standards while keeping student names pinned on the left, which is a familiar spreadsheet pattern.
2. **Students are the action target** — Teachers scan vertically to find struggling students, then look right to see *which* standards they're weak on. The mental model is: "Who needs help?" → "With what?"
3. **Sorting by score creates a natural gradient** — Sorting students from lowest to highest overall score (like the risk matrix reference image) creates the classic heatmap pattern where the top rows glow red and the bottom rows glow green/blue. This immediately shows whether a standard is problematic across all levels or just for lower-performing students.
4. **Column grouping by RC** — Standards naturally group into 4 Reporting Categories, which become column group headers. This matches how teachers think about curriculum areas.

### Class Size Constraint

This project targets class sizes of ≤ 50 students with ~20 standards. That's a maximum of **1,000 cells** — very manageable for a CSS grid/table with colored cells. No virtualization is needed.

---

## 2. Data Model

### New API Endpoint

#### `GET /api/rosters/:rosterId/student-standard-matrix?testId=X`

Returns every student's score on every standard for the given roster + test.

**Response shape:**

```json
{
  "students": [
    {
      "id": 1,
      "name": "Alice Johnson",
      "overallScore": 5480,
      "level": 3,
      "standardScores": {
        "1": 5520,
        "3": 5310,
        "5": 5440,
        "...": "..."
      }
    }
  ],
  "standards": [
    {
      "id": 1,
      "code": "3.NF.A.1",
      "description": "Understand a fraction 1/b...",
      "rcId": 1,
      "rcName": "Number and Operations"
    }
  ],
  "summary": {
    "proficiencyThreshold": 5470,
    "classAvgByStandard": {
      "1": 5385,
      "3": 5420
    },
    "belowProfByStandard": {
      "1": 18,
      "3": 12
    }
  }
}
```

### New TypeScript Types

```typescript
// src/types/index.ts

export interface StudentStandardScores {
  id: number;
  name: string;
  overallScore: number;
  level: number;
  standardScores: Record<string, number>; // keyed by standard ID
}

export interface HeatmapStandard {
  id: number;
  code: string;
  description: string;
  rcId: number;
  rcName: string;
}

export interface HeatmapSummary {
  proficiencyThreshold: number;
  classAvgByStandard: Record<string, number>;
  belowProfByStandard: Record<string, number>;
}

export interface StudentStandardMatrixResponse {
  students: StudentStandardScores[];
  standards: HeatmapStandard[];
  summary: HeatmapSummary;
}
```

---

## 3. Query Implementation

### `lib/queries.ts` — `getStudentStandardMatrix()`

```typescript
export function getStudentStandardMatrix(
  rosterId: number,
  testId: number
): StudentStandardMatrixResponse {
  const PROFICIENCY_THRESHOLD = 5470;

  // 1. Get all standards with their RC info
  const allStandards = db
    .select({
      id: standards.id,
      code: standards.code,
      description: standards.description,
      rcId: standards.rcId,
    })
    .from(standards)
    .orderBy(asc(standards.rcId), asc(standards.id))
    .all();

  const rcs = db.select().from(reportingCategories).all();
  const rcMap = Object.fromEntries(rcs.map(r => [r.id, r.name]));

  const heatmapStandards: HeatmapStandard[] = allStandards.map(s => ({
    ...s,
    rcName: rcMap[s.rcId] ?? "Unknown",
  }));

  // 2. Get all student scores for this roster + test
  const scoreRows = db
    .select({
      studentId: students.id,
      studentName: students.name,
      overallScore: scores.overallScore,
      level: scores.level,
      stdScores: scores.stdScores,
    })
    .from(scores)
    .innerJoin(students, eq(students.id, scores.studentId))
    .where(and(eq(students.rosterId, rosterId), eq(scores.testId, testId)))
    .orderBy(asc(scores.level), asc(students.name))
    .all();

  // 3. Build student rows
  const studentRows: StudentStandardScores[] = scoreRows.map(row => ({
    id: row.studentId,
    name: row.studentName,
    overallScore: row.overallScore,
    level: row.level,
    standardScores: JSON.parse(row.stdScores) as Record<string, number>,
  }));

  // 4. Compute summary stats per standard
  const classAvgByStandard: Record<string, number> = {};
  const belowProfByStandard: Record<string, number> = {};

  for (const std of allStandards) {
    let sum = 0, count = 0, belowCount = 0;
    for (const student of studentRows) {
      const score = student.standardScores[String(std.id)];
      if (score != null) {
        sum += score;
        count++;
        if (score < PROFICIENCY_THRESHOLD) belowCount++;
      }
    }
    classAvgByStandard[String(std.id)] = count > 0 ? Math.round(sum / count) : 0;
    belowProfByStandard[String(std.id)] = belowCount;
  }

  return {
    students: studentRows,
    standards: heatmapStandards,
    summary: {
      proficiencyThreshold: PROFICIENCY_THRESHOLD,
      classAvgByStandard,
      belowProfByStandard,
    },
  };
}
```

---

## 4. API Route

### `src/app/api/rosters/[rosterId]/student-standard-matrix/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getStudentStandardMatrix } from "@/lib/queries";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ rosterId: string }> }
) {
  try {
    const { rosterId } = await params;
    const testId = request.nextUrl.searchParams.get("testId");

    if (!testId) {
      return NextResponse.json({ error: "testId is required" }, { status: 400 });
    }

    const data = getStudentStandardMatrix(Number(rosterId), Number(testId));
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to fetch student-standard matrix:", error);
    return NextResponse.json(
      { error: "Failed to fetch student-standard matrix" },
      { status: 500 }
    );
  }
}
```

---

## 5. React Hook

### `src/hooks/useStudentStandardMatrix.ts`

```typescript
import { useQuery } from "@tanstack/react-query";
import type { StudentStandardMatrixResponse } from "@/types";

export function useStudentStandardMatrix(
  rosterId: number | null,
  testId: number | null
) {
  return useQuery<StudentStandardMatrixResponse>({
    queryKey: ["student-standard-matrix", rosterId, testId],
    queryFn: async () => {
      const res = await fetch(
        `/api/rosters/${rosterId}/student-standard-matrix?testId=${testId}`
      );
      if (!res.ok) throw new Error("Failed to fetch student-standard matrix");
      return res.json();
    },
    enabled: !!rosterId && !!testId,
  });
}
```

---

## 6. Component Architecture

### Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Standards Analysis                                                     │
│  Identify specific skill gaps and target interventions                  │
├─────────────────────────────────────────────────────────────────────────┤
│  [Filter by RC:] [All] [Number & Ops] [Algebraic] [Geo & Meas] [Data] │
│  [View:] [📊 Summary Table] [🟥 Student Heatmap]                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─ Summary Row ──────────────────────────────────────────────────────┐ │
│  │  % Below Prof: │ 70% │ 67% │ 70% │ 67% │ 63% │ 70% │ ...        │ │
│  │  Class Avg:    │5334 │5330 │5332 │5335 │5339 │5337 │ ...        │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌─ Heatmap Grid ────────────────────────────────────────────────────┐ │
│  │               │ Number & Operations │  Algebraic  │ Geo & M │    │ │
│  │               │ NF.1│NF.2│NF.3│OA.1│ B.5│B.6│C.7│ MD.1│   │    │ │
│  │  ── L1 ────── │     │    │    │    │    │   │   │     │   │    │ │
│  │  StudentA     │ ██  │ ██ │ ██ │ ██ │ ██ │██ │██ │  ██ │   │    │ │
│  │  StudentB     │ ██  │ ██ │ ██ │ ██ │ ██ │██ │██ │  ██ │   │    │ │
│  │  ── L2 ────── │     │    │    │    │    │   │   │     │   │    │ │
│  │  StudentC     │ ██  │ ██ │ ██ │ ██ │ ██ │██ │██ │  ██ │   │    │ │
│  │  StudentD     │ ██  │ ██ │ ██ │ ██ │ ██ │██ │██ │  ██ │   │    │ │
│  │  ── L3 ────── │     │    │    │    │    │   │   │     │   │    │ │
│  │  StudentE     │ ██  │ ██ │ ██ │ ██ │ ██ │██ │██ │  ██ │   │    │ │
│  │  ...          │     │    │    │    │    │   │   │     │   │    │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  Legend: [🔴 Beginning <5410] [🟠 Approaching 5410-5469]               │
│          [🟢 Understands 5470-5529] [🔵 Advanced ≥5530]                │
└─────────────────────────────────────────────────────────────────────────┘
```

### View Toggle

Add a **view toggle** to the Standards Analysis page so teachers can switch between:

1. **Summary Table** (existing) — The current aggregated table showing averages per level. Good for a quick overview of which standards are most concerning.
2. **Student Heatmap** (new) — The true 2D grid showing every student × every standard. Good for identifying individual students to target and spotting patterns.

Both views share the same RC filter.

---

## 7. Heatmap Component

### `src/components/standards/StudentStandardHeatmap.tsx`

This is the core new component. Key design decisions:

#### Color Scale

Use the same 4-band color scheme already used project-wide, with intermediate gradations:

```typescript
function scoreToHeatColor(score: number): string {
  // Deep red → light red → orange → yellow → light green → green → light blue → blue
  if (score < 5350) return "bg-red-500 text-white";        // Deep below
  if (score < 5410) return "bg-red-300 text-red-900";      // Beginning
  if (score < 5440) return "bg-orange-300 text-orange-900"; // Low Approaching
  if (score < 5470) return "bg-yellow-300 text-yellow-900"; // High Approaching
  if (score < 5500) return "bg-green-300 text-green-900";   // Low Proficient
  if (score < 5530) return "bg-green-400 text-green-950";   // High Proficient
  return "bg-blue-400 text-white";                          // Advanced
}
```

#### Compact Cells

Each cell shows only the score (4 digits). On hover, a tooltip shows:
- Student name
- Standard code + description
- Score value
- Level label (Beginning / Approaching / Understands / Advanced)
- Delta from class average for that standard

```tsx
<TooltipContent>
  <p className="font-semibold">Alice Johnson — 3.NF.A.1</p>
  <p>Score: 5310 (Beginning)</p>
  <p>Class avg: 5385 | Δ: −75</p>
</TooltipContent>
```

#### Sticky Headers & Row Labels

- **Column headers** (standard codes): sticky at top so they remain visible while scrolling vertically
- **Row labels** (student names): sticky at left so they remain visible while scrolling horizontally
- **Level group headers**: span the full width as separator rows (e.g., "── Level 1: Beginning ──")

#### Summary Row

A fixed row at the top (below headers) showing per-standard:
- **Class average** score (colored)
- **% below proficiency** count

This gives teachers a quick "which columns are reddest" signal.

#### Summary Column  

A fixed column at the right showing per-student:
- **# standards below proficiency** — a quick count of how many standards each student is struggling with
- This helps spot students who are broadly struggling vs. those with isolated gaps

#### Interactions

1. **Hover**: Tooltip with detail (student name, standard, score, delta from class avg)
2. **Click a cell**: Opens the existing `StandardDetailPanel` for that standard (slide-over panel)
3. **Click a student name**: Navigate to `/student/[id]` student detail page
4. **Shift-click cells**: Select multiple cells to batch-assign intervention (future enhancement)

#### Sorting Options

Provide a sort control above the grid:

```
Sort students by: [Overall Score ▼] [Name] [# Standards Below Prof.]
```

- **Overall Score** (default): Lowest overall score at top → highest at bottom. This produces the true heatmap gradient (red at top, green/blue at bottom) matching the risk-matrix visual pattern. No level separator rows in this mode — the gradient speaks for itself.
- **Name**: Alphabetical A-Z
- **# Standards Below Prof.**: Most struggling students first (most gaps at top)

---

## 8. Standards Page Update

### `src/app/dashboard/standards/page.tsx`

Add a view toggle and conditionally render either the existing Summary Table or the new Student Heatmap:

```tsx
"use client";

import { useState, useCallback } from "react";
import { StandardsHeatmap } from "@/components/standards/StandardsHeatmap";
import { StudentStandardHeatmap } from "@/components/standards/StudentStandardHeatmap";
import { StandardsFilters } from "@/components/standards/StandardsFilters";
import { StandardDetailPanel } from "@/components/standards/StandardDetailPanel";
import { AssignmentSlideOver } from "@/components/AssignmentSlideOver";
import { Button } from "@/components/ui/button";
import { TableProperties, Grid3X3 } from "lucide-react";

type ViewMode = "summary" | "heatmap";

export default function StandardsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("summary");
  const [selectedRC, setSelectedRC] = useState<number | null>(null);
  const [selectedStandardId, setSelectedStandardId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [slideOverOpen, setSlideOverOpen] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [filterStandardCode, setFilterStandardCode] = useState<string | null>(null);

  const handleStandardSelect = useCallback((standardId: number) => {
    setSelectedStandardId(standardId);
    setDetailOpen(true);
  }, []);

  const handleSelectStudents = useCallback(
    (studentIds: number[], standardCode: string) => {
      setSelectedStudentIds(studentIds);
      setFilterStandardCode(standardCode);
      setDetailOpen(false);
      setSlideOverOpen(true);
    },
    []
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Standards Analysis</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Identify specific skill gaps and target interventions at the standard level
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <Button
            variant={viewMode === "summary" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("summary")}
            className="gap-2"
          >
            <TableProperties className="h-4 w-4" />
            Summary Table
          </Button>
          <Button
            variant={viewMode === "heatmap" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("heatmap")}
            className="gap-2"
          >
            <Grid3X3 className="h-4 w-4" />
            Student Heatmap
          </Button>
        </div>
      </div>

      <StandardsFilters selectedRC={selectedRC} onRCSelect={setSelectedRC} />

      {viewMode === "summary" ? (
        <StandardsHeatmap
          selectedRC={selectedRC}
          onStandardSelect={handleStandardSelect}
          selectedStandardId={selectedStandardId}
        />
      ) : (
        <StudentStandardHeatmap
          selectedRC={selectedRC}
          onStandardSelect={handleStandardSelect}
        />
      )}

      {/* Existing panels remain unchanged */}
      <StandardDetailPanel ... />
      <AssignmentSlideOver ... />
    </div>
  );
}
```

---

## 9. Heatmap Component Implementation

### `src/components/standards/StudentStandardHeatmap.tsx`

```tsx
"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppContext } from "@/hooks/useAppContext";
import { useStudentStandardMatrix } from "@/hooks/useStudentStandardMatrix";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// 7-band color scale matching performance level colors
function scoreToHeatColor(score: number): string {
  if (score < 5350) return "bg-red-500 text-white";
  if (score < 5410) return "bg-red-300 text-red-900";
  if (score < 5440) return "bg-orange-300 text-orange-900";
  if (score < 5470) return "bg-yellow-200 text-yellow-900";
  if (score < 5500) return "bg-green-200 text-green-900";
  if (score < 5530) return "bg-green-400 text-white";
  return "bg-blue-400 text-white";
}

function levelLabel(level: number): string {
  switch (level) {
    case 1: return "Beginning";
    case 2: return "Approaching";
    case 3: return "Understands";
    case 4: return "Advanced";
    default: return `L${level}`;
  }
}

type SortOption = "score" | "name" | "gaps";

interface Props {
  selectedRC: number | null;
  onStandardSelect: (standardId: number) => void;
}

export function StudentStandardHeatmap({ selectedRC, onStandardSelect }: Props) {
  const router = useRouter();
  const { selectedRosterId, selectedTestId } = useAppContext();
  const { data, isLoading } = useStudentStandardMatrix(selectedRosterId, selectedTestId);
  const [sortBy, setSortBy] = useState<SortOption>("score");

  // Filter standards by selected RC
  const filteredStandards = useMemo(() => {
    if (!data) return [];
    return selectedRC
      ? data.standards.filter((s) => s.rcId === selectedRC)
      : data.standards;
  }, [data, selectedRC]);

  // Group standards by RC for column headers
  const rcGroups = useMemo(() => {
    const groups: { rcId: number; rcName: string; standards: typeof filteredStandards }[] = [];
    const seen = new Set<number>();
    for (const std of filteredStandards) {
      if (!seen.has(std.rcId)) {
        seen.add(std.rcId);
        groups.push({
          rcId: std.rcId,
          rcName: std.rcName,
          standards: filteredStandards.filter((s) => s.rcId === std.rcId),
        });
      }
    }
    return groups;
  }, [filteredStandards]);

  // Sort students
  const sortedStudents = useMemo(() => {
    if (!data) return [];
    const threshold = data.summary.proficiencyThreshold;

    return [...data.students].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "gaps") {
        // Count standards below proficiency for each student
        const aGaps = filteredStandards.filter(
          (s) => (a.standardScores[String(s.id)] ?? 0) < threshold
        ).length;
        const bGaps = filteredStandards.filter(
          (s) => (b.standardScores[String(s.id)] ?? 0) < threshold
        ).length;
        return bGaps - aGaps; // Most gaps first
      }
      // Default: by overall score, lowest first (true heatmap gradient)
      return a.overallScore - b.overallScore;
    });
  }, [data, sortBy, filteredStandards]);

  // Calculate per-student gap count for the summary column
  const gapCount = (student: StudentStandardScores) => {
    if (!data) return 0;
    return filteredStandards.filter(
      (s) => (student.standardScores[String(s.id)] ?? 0) < data.summary.proficiencyThreshold
    ).length;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Student × Standard Heatmap</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-[500px] w-full" /></CardContent>
      </Card>
    );
  }

  if (!data || data.students.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>Student × Standard Heatmap</CardTitle></CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-12">No data available</p>
        </CardContent>
      </Card>
    );
  }

  // Determine level group boundaries for separator rows
  let prevLevel = -1;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Student × Standard Heatmap</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Each cell shows a student's score on a standard. Click a column header to see
            standard detail, or click a student name to view their profile.
          </p>
        </div>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Sort students by..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="score">Overall Score (Low → High)</SelectItem>
            <SelectItem value="name">Student Name</SelectItem>
            <SelectItem value="gaps"># Standards Below Prof.</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <TooltipProvider delayDuration={100}>
          <div className="overflow-auto max-h-[75vh] rounded-md border">
            <table className="border-collapse text-xs">
              {/* ─── Column Headers ─── */}
              <thead className="sticky top-0 z-20 bg-white">
                {/* Row 1: RC group headers */}
                <tr>
                  <th className="sticky left-0 z-30 bg-white p-1 min-w-[140px]" />
                  {rcGroups.map((g) => (
                    <th
                      key={g.rcId}
                      colSpan={g.standards.length}
                      className="text-center text-[10px] font-semibold text-muted-foreground
                                 border-b border-x px-1 py-1 bg-muted/30"
                    >
                      {g.rcName}
                    </th>
                  ))}
                  <th className="sticky right-0 z-30 bg-white p-1 min-w-[50px]" />
                </tr>
                {/* Row 2: Standard codes */}
                <tr>
                  <th className="sticky left-0 z-30 bg-white px-2 py-1 text-left
                                 font-medium border-b min-w-[140px]">
                    Student
                  </th>
                  {filteredStandards.map((std) => (
                    <th
                      key={std.id}
                      className="border-b border-x px-1 py-1 text-center font-mono
                                 whitespace-nowrap cursor-pointer hover:bg-muted/50
                                 min-w-[52px]"
                      onClick={() => onStandardSelect(std.id)}
                      title={std.description}
                    >
                      {/* Show short code: e.g. "NF.1" from "3.NF.A.1" */}
                      {std.code.replace(/^\d+\./, "")}
                    </th>
                  ))}
                  <th className="sticky right-0 z-30 bg-white px-1 py-1 text-center
                                 font-medium border-b min-w-[50px]">
                    Gaps
                  </th>
                </tr>
                {/* Row 3: Class average summary */}
                <tr className="bg-gray-50">
                  <td className="sticky left-0 z-30 bg-gray-50 px-2 py-1
                                 text-[10px] font-semibold border-b">
                    Class Avg
                  </td>
                  {filteredStandards.map((std) => {
                    const avg = data.summary.classAvgByStandard[String(std.id)] ?? 0;
                    return (
                      <td
                        key={std.id}
                        className={cn(
                          "text-center tabular-nums px-1 py-1 border-b border-x",
                          scoreToHeatColor(avg)
                        )}
                      >
                        {avg}
                      </td>
                    );
                  })}
                  <td className="sticky right-0 z-30 bg-gray-50 border-b" />
                </tr>
              </thead>

              {/* ─── Student Rows ─── */}
              <tbody>
                {sortedStudents.map((student) => {
                  // No separator rows in score-sort mode for a clean gradient
                  const showSeparator = false;
                  prevLevel = student.level;

                  return (
                    <React.Fragment key={student.id}>
                      {showSeparator && (
                        <tr className="bg-muted/40">
                          <td
                            colSpan={filteredStandards.length + 2}
                            className="px-2 py-1 text-[10px] font-bold uppercase
                                       tracking-wider text-muted-foreground"
                          >
                            Level {student.level}: {levelLabel(student.level)}
                          </td>
                        </tr>
                      )}
                      <tr className="hover:bg-muted/10">
                        {/* Student name — sticky left, clickable */}
                        <td
                          className="sticky left-0 z-10 bg-white px-2 py-1
                                     font-medium whitespace-nowrap cursor-pointer
                                     hover:text-blue-600 hover:underline border-b"
                          onClick={() => router.push(`/student/${student.id}`)}
                        >
                          {student.name}
                        </td>

                        {/* Score cells */}
                        {filteredStandards.map((std) => {
                          const score = student.standardScores[String(std.id)];
                          const classAvg =
                            data.summary.classAvgByStandard[String(std.id)] ?? 0;

                          if (score == null) {
                            return (
                              <td key={std.id}
                                  className="text-center text-muted-foreground
                                             border-b border-x px-1 py-1">
                                —
                              </td>
                            );
                          }

                          return (
                            <td key={std.id} className="border-b border-x p-0">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    className={cn(
                                      "w-full px-1 py-1 text-center tabular-nums",
                                      "transition-opacity hover:opacity-80",
                                      scoreToHeatColor(score)
                                    )}
                                    onClick={() => onStandardSelect(std.id)}
                                  >
                                    {score}
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">
                                  <p className="font-semibold">
                                    {student.name} — {std.code}
                                  </p>
                                  <p>{std.description}</p>
                                  <p className="mt-1">
                                    Score: {score} ({levelLabel(
                                      score >= 5530 ? 4
                                      : score >= 5470 ? 3
                                      : score >= 5410 ? 2
                                      : 1
                                    )})
                                  </p>
                                  <p>
                                    Class avg: {classAvg} | Δ:{" "}
                                    {score - classAvg >= 0 ? "+" : ""}
                                    {score - classAvg}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </td>
                          );
                        })}

                        {/* Gap count — sticky right */}
                        <td
                          className={cn(
                            "sticky right-0 z-10 bg-white text-center tabular-nums",
                            "border-b px-1 py-1 font-medium",
                            gapCount(student) >= 15
                              ? "text-red-600"
                              : gapCount(student) >= 10
                                ? "text-orange-600"
                                : "text-muted-foreground"
                          )}
                        >
                          {gapCount(student)}/{filteredStandards.length}
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ─── Legend ─── */}
          <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
            <span className="font-medium">Legend:</span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-4 h-4 rounded bg-red-500" /> Beginning (&lt;5410)
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-4 h-4 rounded bg-orange-300" /> Approaching (5410–5469)
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-4 h-4 rounded bg-green-300" /> Understands (5470–5529)
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-4 h-4 rounded bg-blue-400" /> Advanced (≥5530)
            </span>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
```

---

## 10. What This Enables That the Current Table Doesn't

| Insight | Current Table | New Heatmap |
|---------|:---:|:---:|
| Which standards have the lowest class-wide averages? | ✅ | ✅ |
| Which performance levels struggle on a standard? | ✅ (by L1-L4 columns) | ✅ (by row grouping) |
| Which **specific students** are below proficiency on a standard? | ❌ (must click into standard detail) | ✅ (visible in the grid) |
| Are student struggles **isolated** (1 standard) or **broad** (many)? | ❌ | ✅ (Gaps column) |
| Is there a **cluster** of students struggling on the same set of standards? | ❌ | ✅ (visual pattern in the grid) |
| Can I compare a student's performance **across** all standards at once? | ❌ (must go to student page) | ✅ (read the row) |
| Can I see outliers — strong students with one weak spot? | ❌ | ✅ (green row with one red cell) |

---

## 11. Files to Create / Modify

| File | Action |
|------|--------|
| `src/types/index.ts` | Add `StudentStandardScores`, `HeatmapStandard`, `HeatmapSummary`, `StudentStandardMatrixResponse` types |
| `src/lib/queries.ts` | Add `getStudentStandardMatrix()` function |
| `src/app/api/rosters/[rosterId]/student-standard-matrix/route.ts` | New API route |
| `src/hooks/useStudentStandardMatrix.ts` | New TanStack Query hook |
| `src/components/standards/StudentStandardHeatmap.tsx` | New heatmap component |
| `src/app/dashboard/standards/page.tsx` | Add view toggle between Summary Table and Student Heatmap |

---

## 12. Acceptance Criteria

- [ ] New `/api/rosters/:id/student-standard-matrix?testId=X` endpoint returns every student's per-standard scores
- [ ] "Student Heatmap" view toggle appears on Standards Analysis page
- [ ] Heatmap renders a grid with standards as columns and students as rows
- [ ] Cell colors follow the 4-level performance color scale (red/orange/green/blue)
- [ ] Students default-sorted by overall score (lowest at top → highest at bottom) for a true heatmap gradient
- [ ] RC group headers span columns belonging to the same Reporting Category
- [ ] Standard code column headers are clickable → opens StandardDetailPanel
- [ ] Student name row labels are clickable → navigates to `/student/[id]`
- [ ] Tooltip on each cell shows student, standard, score, level, and delta from class avg
- [ ] Class Average summary row pinned at top
- [ ] "Gaps" summary column pinned at right shows # standards below proficiency per student
- [ ] Sort dropdown allows sorting by Overall Score / Name / # Gaps
- [ ] RC filter toggles which standards (columns) are visible
- [ ] Existing Summary Table view continues to work unchanged
- [ ] Page compiles and renders without errors

---

## 13. Out of Scope (Future Enhancements)

- **Multi-select cells** for batch assignment creation (shift-click to select region)
- **Column sorting** by standard (click a column header to sort students by that standard's score)
- **Difference view** comparing two test administrations side-by-side
- **Highlight mode** that dims proficient cells and highlights only below-proficiency cells
- **Export** heatmap as image or CSV
