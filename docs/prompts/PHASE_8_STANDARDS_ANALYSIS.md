# Phase 8 Prompt: Standards Analysis Dashboard Tab

> **Feed this entire file to GitHub Copilot Chat or Replit Agent.**
> **Prerequisites**: Phases 1–7 complete.
> **Stack**: Next.js 14 App Router, TypeScript, shadcn/ui, Tailwind CSS, Recharts, TanStack Query.

---

## Task

Add a dedicated **Standards Analysis** tab to the dashboard that surfaces per-standard performance data. Currently the dashboard only shows Reporting Category (RC) averages — teachers have no way to identify which *specific standards* students are struggling with until they drill into an individual student page. This phase adds a class-wide standards view so teachers can spot skill gaps, identify at-risk students per standard, and jump straight into assignment creation.

## Why a Separate Tab (Design Rationale)

Standards are too granular to embed in the Overview tab:
- There are **20 standards** across 4 Reporting Categories — adding them to the existing RC Breakdown chart (already 4 categories × 4 levels = 16 bars) would create visual overload.
- Standards are hierarchical (RC → Domain → Sub-domain → Standard) and need room for that structure.
- The use-case is different: the Overview answers *"How is my class doing?"*; Standards Analysis answers *"What specific skills need intervention?"*
- A dedicated tab gives space for a heatmap, drill-down detail, and a direct path to assignment creation.

The tab sits between Overview and Impact Analysis in the navigation since it represents the *investigation step* teachers take between seeing a problem (Overview) and measuring outcomes (Impact).

---

## 1. Dashboard Layout Update

### `src/app/dashboard/layout.tsx`

Add the Standards Analysis tab to the existing tab navigation:

```tsx
const tabs = [
  { label: "Overview", href: "/dashboard" },
  { label: "Standards Analysis", href: "/dashboard/standards" },
  { label: "Impact Analysis", href: "/dashboard/impact" },
];
```

---

## 2. API Routes

### `GET /api/rosters/:rosterId/standards-breakdown?testId=X`

Returns average standard scores broken down by performance level, grouped by reporting category. This is the standards-level equivalent of the existing RC Breakdown endpoint.

**Response shape:**

```json
{
  "categories": [
    {
      "rcId": 1,
      "rcName": "Number and Operations",
      "standards": [
        {
          "standardId": 1,
          "code": "3.NF.A.1",
          "description": "Understand a fraction 1/b as the quantity formed by 1 part...",
          "domain": "Number and Operations – Fractions",
          "overallAvg": 5385,
          "belowProficiencyCount": 18,
          "totalCount": 35,
          "belowProficiencyPct": 51.4,
          "byLevel": [
            { "level": 1, "avgScore": 5280, "count": 13 },
            { "level": 2, "avgScore": 5425, "count": 9 },
            { "level": 3, "avgScore": 5510, "count": 7 },
            { "level": 4, "avgScore": 5620, "count": 6 }
          ]
        }
      ]
    }
  ]
}
```

**Implementation in `lib/queries.ts`:**

```typescript
export function getStandardsBreakdown(
  rosterId: number,
  testId: number
): StandardsBreakdownResponse {
  // 1. Get all RCs
  const rcs = db.select().from(reportingCategories).orderBy(asc(reportingCategories.id)).all();

  // 2. Get all standards
  const allStandards = db.select().from(standards).orderBy(asc(standards.id)).all();

  // 3. Get all scores for this roster + test (with std_scores JSON)
  const scoreRows = db
    .select({
      level: scores.level,
      stdScores: scores.stdScores,
    })
    .from(scores)
    .innerJoin(students, eq(students.id, scores.studentId))
    .where(and(eq(students.rosterId, rosterId), eq(scores.testId, testId)))
    .all();

  const PROFICIENCY_THRESHOLD = 5470; // Level 3+ is proficient

  return {
    categories: rcs.map((rc) => {
      const rcStandards = allStandards.filter((s) => s.rcId === rc.id);

      return {
        rcId: rc.id,
        rcName: rc.name,
        standards: rcStandards.map((std) => {
          const levelMap: Record<number, { sum: number; count: number }> = {};
          let belowCount = 0;
          let totalWithScore = 0;
          let totalSum = 0;

          for (const row of scoreRows) {
            const parsed = JSON.parse(row.stdScores) as Record<string, number>;
            const stdScore = parsed[String(std.id)];
            if (stdScore == null) continue;

            totalWithScore++;
            totalSum += stdScore;
            if (stdScore < PROFICIENCY_THRESHOLD) belowCount++;

            if (!levelMap[row.level]) levelMap[row.level] = { sum: 0, count: 0 };
            levelMap[row.level].sum += stdScore;
            levelMap[row.level].count += 1;
          }

          return {
            standardId: std.id,
            code: std.code,
            description: std.description,
            domain: std.domain,
            overallAvg: totalWithScore > 0 ? Math.round(totalSum / totalWithScore) : 0,
            belowProficiencyCount: belowCount,
            totalCount: totalWithScore,
            belowProficiencyPct:
              totalWithScore > 0
                ? Math.round((belowCount / totalWithScore) * 1000) / 10
                : 0,
            byLevel: [1, 2, 3, 4]
              .filter((l) => levelMap[l])
              .map((l) => ({
                level: l,
                avgScore: Math.round(levelMap[l].sum / levelMap[l].count),
                count: levelMap[l].count,
              })),
          };
        }),
      };
    }),
  };
}
```

**Route file: `src/app/api/rosters/[rosterId]/standards-breakdown/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getStandardsBreakdown } from "@/lib/queries";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ rosterId: string }> }
) {
  const { rosterId } = await params;
  const testId = request.nextUrl.searchParams.get("testId");

  if (!testId) {
    return NextResponse.json({ error: "testId is required" }, { status: 400 });
  }

  const data = getStandardsBreakdown(Number(rosterId), Number(testId));
  return NextResponse.json(data);
}
```

### `GET /api/rosters/:rosterId/standard-students?testId=X&standardId=Y`

Returns the list of students with their score for a specific standard, sorted by score ascending (worst-performing first). This powers the drill-down detail when a teacher clicks on a standard.

**Response shape:**

```json
{
  "standard": {
    "id": 1,
    "code": "3.NF.A.1",
    "description": "Understand a fraction 1/b...",
    "rcId": 1,
    "rcName": "Number and Operations"
  },
  "students": [
    {
      "id": 42,
      "name": "Liam Rodriguez",
      "overallScore": 5310,
      "overallLevel": 1,
      "standardScore": 5180,
      "isProficient": false,
      "hasAssignment": true
    }
  ]
}
```

**Implementation in `lib/queries.ts`:**

```typescript
export function getStudentsByStandard(
  rosterId: number,
  testId: number,
  standardId: number
): StandardStudentsResponse {
  const PROFICIENCY_THRESHOLD = 5470;

  // Get the standard info
  const std = db
    .select()
    .from(standards)
    .where(eq(standards.id, standardId))
    .get();

  if (!std) throw new Error("Standard not found");

  const rc = db
    .select()
    .from(reportingCategories)
    .where(eq(reportingCategories.id, std.rcId))
    .get();

  // Get all scores with student info
  const rows = sqlite
    .prepare(
      `
      SELECT
        s.id,
        s.name,
        sc.overall_score as overallScore,
        sc.level as overallLevel,
        sc.std_scores as stdScores,
        CASE WHEN EXISTS (
          SELECT 1 FROM assignment_students asn
          JOIN assignment_standards ast ON ast.assignment_id = asn.assignment_id
          WHERE asn.student_id = s.id AND ast.standard_id = ?
        ) THEN 1 ELSE 0 END as hasAssignment
      FROM students s
      JOIN scores sc ON sc.student_id = s.id AND sc.test_id = ?
      WHERE s.roster_id = ?
      ORDER BY CAST(JSON_EXTRACT(sc.std_scores, '$."${standardId}"') AS INTEGER) ASC
    `
    )
    .all(standardId, testId, rosterId) as Array<{
    id: number;
    name: string;
    overallScore: number;
    overallLevel: number;
    stdScores: string;
    hasAssignment: number;
  }>;

  const studentRows = rows.map((r) => {
    const parsed = JSON.parse(r.stdScores) as Record<string, number>;
    const stdScore = parsed[String(standardId)] ?? 0;
    return {
      id: r.id,
      name: r.name,
      overallScore: r.overallScore,
      overallLevel: r.overallLevel,
      standardScore: stdScore,
      isProficient: stdScore >= PROFICIENCY_THRESHOLD,
      hasAssignment: r.hasAssignment === 1,
    };
  });

  return {
    standard: {
      id: std.id,
      code: std.code,
      description: std.description,
      rcId: std.rcId,
      rcName: rc?.name ?? "Unknown",
    },
    students: studentRows,
  };
}
```

**Route file: `src/app/api/rosters/[rosterId]/standard-students/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getStudentsByStandard } from "@/lib/queries";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ rosterId: string }> }
) {
  const { rosterId } = await params;
  const testId = request.nextUrl.searchParams.get("testId");
  const standardId = request.nextUrl.searchParams.get("standardId");

  if (!testId || !standardId) {
    return NextResponse.json(
      { error: "testId and standardId are required" },
      { status: 400 }
    );
  }

  const data = getStudentsByStandard(
    Number(rosterId),
    Number(testId),
    Number(standardId)
  );
  return NextResponse.json(data);
}
```

---

## 3. TypeScript Types

Add to `src/types/index.ts`:

```typescript
// ─── Standards Analysis Types ───────────────────────────────────────────────

export interface StandardLevelBreakdown {
  level: number;
  avgScore: number;
  count: number;
}

export interface StandardBreakdownItem {
  standardId: number;
  code: string;
  description: string;
  domain: string;
  overallAvg: number;
  belowProficiencyCount: number;
  totalCount: number;
  belowProficiencyPct: number;
  byLevel: StandardLevelBreakdown[];
}

export interface StandardsBreakdownCategory {
  rcId: number;
  rcName: string;
  standards: StandardBreakdownItem[];
}

export interface StandardsBreakdownResponse {
  categories: StandardsBreakdownCategory[];
}

export interface StandardStudentRow {
  id: number;
  name: string;
  overallScore: number;
  overallLevel: number;
  standardScore: number;
  isProficient: boolean;
  hasAssignment: boolean;
}

export interface StandardStudentsResponse {
  standard: {
    id: number;
    code: string;
    description: string;
    rcId: number;
    rcName: string;
  };
  students: StandardStudentRow[];
}
```

---

## 4. TanStack Query Hooks

### `src/hooks/useStandardsBreakdown.ts`

```typescript
import { useQuery } from "@tanstack/react-query";
import type { StandardsBreakdownResponse } from "@/types";

export function useStandardsBreakdown(
  rosterId: number | null,
  testId: number | null
) {
  return useQuery<StandardsBreakdownResponse>({
    queryKey: ["standards-breakdown", rosterId, testId],
    queryFn: async () => {
      const res = await fetch(
        `/api/rosters/${rosterId}/standards-breakdown?testId=${testId}`
      );
      if (!res.ok) throw new Error("Failed to fetch standards breakdown");
      return res.json();
    },
    enabled: !!rosterId && !!testId,
  });
}
```

### `src/hooks/useStandardStudents.ts`

```typescript
import { useQuery } from "@tanstack/react-query";
import type { StandardStudentsResponse } from "@/types";

export function useStandardStudents(
  rosterId: number | null,
  testId: number | null,
  standardId: number | null
) {
  return useQuery<StandardStudentsResponse>({
    queryKey: ["standard-students", rosterId, testId, standardId],
    queryFn: async () => {
      const res = await fetch(
        `/api/rosters/${rosterId}/standard-students?testId=${testId}&standardId=${standardId}`
      );
      if (!res.ok) throw new Error("Failed to fetch standard students");
      return res.json();
    },
    enabled: !!rosterId && !!testId && !!standardId,
  });
}
```

---

## 5. Components

### Component Architecture

```
src/components/standards/
├── StandardsHeatmap.tsx      # Main heatmap visualization
├── StandardDetailPanel.tsx   # Slide-out detail for a selected standard
├── StandardStudentList.tsx   # Student list within the detail panel
└── StandardsFilters.tsx      # RC filter pills
```

### 5.1 `StandardsHeatmap.tsx` — Main Visualization

This is the centerpiece. It renders a **matrix/heatmap** with:
- **Rows** = Standards (grouped by RC, with RC header rows)
- **Columns** = Performance levels (L1 through L4) + an "Overall" column + a "% Below Proficiency" column
- **Cell color** = Diverging color scale from red (low scores, ~5100) through yellow (~5400) to green (high scores, ~5700+)
- **Cell text** = Average scale score for that standard × level combination

This gives teachers an instant visual scan: *red cells = skill gaps that need intervention*.

```tsx
"use client";

import { useAppContext } from "@/hooks/useAppContext";
import { useStandardsBreakdown } from "@/hooks/useStandardsBreakdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { StandardBreakdownItem, StandardsBreakdownCategory } from "@/types";

const LEVEL_NAMES: Record<number, string> = {
  1: "L1",
  2: "L2",
  3: "L3",
  4: "L4",
};

/**
 * Maps a scale score to a background color using a diverging scale.
 * Red (below 5410) → Orange (5410-5469) → Green (5470-5529) → Blue (5530+)
 * Matches the performance level color scheme.
 */
function scoreToColor(score: number): string {
  if (score < 5350) return "bg-red-200 text-red-900";
  if (score < 5410) return "bg-red-100 text-red-800";
  if (score < 5470) return "bg-orange-100 text-orange-800";
  if (score < 5530) return "bg-green-100 text-green-800";
  return "bg-blue-100 text-blue-800";
}

/**
 * Maps a "% below proficiency" value to a severity color.
 */
function pctToColor(pct: number): string {
  if (pct >= 60) return "bg-red-200 text-red-900 font-semibold";
  if (pct >= 40) return "bg-orange-100 text-orange-800";
  if (pct >= 20) return "bg-yellow-50 text-yellow-800";
  return "bg-green-50 text-green-800";
}

interface StandardsHeatmapProps {
  selectedRC: number | null;
  onStandardSelect: (standardId: number) => void;
  selectedStandardId: number | null;
}

export function StandardsHeatmap({
  selectedRC,
  onStandardSelect,
  selectedStandardId,
}: StandardsHeatmapProps) {
  const { selectedRosterId, selectedTestId } = useAppContext();
  const { data, isLoading } = useStandardsBreakdown(
    selectedRosterId,
    selectedTestId
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Standards Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const categories = selectedRC
    ? data?.categories.filter((c) => c.rcId === selectedRC) ?? []
    : data?.categories ?? [];

  if (categories.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Standards Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-12">
            No standards data available. Seed data first.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Standards Heatmap</CardTitle>
        <p className="text-sm text-muted-foreground">
          Average scale scores per standard by performance level. Click a row to
          see student-level detail.
        </p>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <TooltipProvider>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[100px] sticky left-0 bg-white z-10">
                    Standard
                  </TableHead>
                  <TableHead className="min-w-[200px]">Description</TableHead>
                  {[1, 2, 3, 4].map((l) => (
                    <TableHead key={l} className="text-center min-w-[80px]">
                      {LEVEL_NAMES[l]}
                    </TableHead>
                  ))}
                  <TableHead className="text-center min-w-[80px]">
                    Overall
                  </TableHead>
                  <TableHead className="text-center min-w-[90px]">
                    % Below Prof.
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((cat) => (
                  <React.Fragment key={cat.rcId}>
                    {/* RC group header row */}
                    <TableRow className="bg-muted/50">
                      <TableCell
                        colSpan={8}
                        className="font-semibold text-sm py-2"
                      >
                        {cat.rcName}
                      </TableCell>
                    </TableRow>

                    {/* Standard rows */}
                    {cat.standards.map((std) => (
                      <TableRow
                        key={std.standardId}
                        className={cn(
                          "cursor-pointer hover:bg-muted/30 transition-colors",
                          selectedStandardId === std.standardId &&
                            "ring-2 ring-inset ring-blue-500 bg-blue-50/50"
                        )}
                        onClick={() => onStandardSelect(std.standardId)}
                      >
                        <TableCell className="font-mono text-sm font-medium sticky left-0 bg-white z-10">
                          {std.code}
                        </TableCell>
                        <TableCell className="text-sm max-w-[250px]">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="line-clamp-2">{std.description}</span>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-sm">
                              <p>{std.description}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        {[1, 2, 3, 4].map((l) => {
                          const levelData = std.byLevel.find(
                            (b) => b.level === l
                          );
                          return (
                            <TableCell
                              key={l}
                              className={cn(
                                "text-center text-sm tabular-nums",
                                levelData
                                  ? scoreToColor(levelData.avgScore)
                                  : "text-muted-foreground"
                              )}
                            >
                              {levelData ? levelData.avgScore : "—"}
                            </TableCell>
                          );
                        })}
                        <TableCell
                          className={cn(
                            "text-center text-sm font-medium tabular-nums",
                            std.overallAvg > 0
                              ? scoreToColor(std.overallAvg)
                              : ""
                          )}
                        >
                          {std.overallAvg > 0 ? std.overallAvg : "—"}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-center text-sm tabular-nums",
                            pctToColor(std.belowProficiencyPct)
                          )}
                        >
                          {std.belowProficiencyPct}%
                          <span className="text-xs ml-1 opacity-70">
                            ({std.belowProficiencyCount}/{std.totalCount})
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
}
```

### 5.2 `StandardsFilters.tsx` — RC Filter Pills

A row of pill-style filter buttons to narrow the heatmap to a single Reporting Category.

```tsx
"use client";

import { useReportingCategories } from "@/hooks/useReportingCategories";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StandardsFiltersProps {
  selectedRC: number | null;
  onRCSelect: (rcId: number | null) => void;
}

export function StandardsFilters({ selectedRC, onRCSelect }: StandardsFiltersProps) {
  const { data: categories } = useReportingCategories();

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm font-medium text-muted-foreground mr-1">
        Filter by RC:
      </span>
      <Button
        variant={selectedRC === null ? "default" : "outline"}
        size="sm"
        onClick={() => onRCSelect(null)}
      >
        All
      </Button>
      {categories?.map((cat) => (
        <Button
          key={cat.id}
          variant={selectedRC === cat.id ? "default" : "outline"}
          size="sm"
          onClick={() => onRCSelect(selectedRC === cat.id ? null : cat.id)}
        >
          {cat.name}
        </Button>
      ))}
    </div>
  );
}
```

### 5.3 `StandardDetailPanel.tsx` — Drill-Down Panel

When a teacher clicks a standard row in the heatmap, this panel opens on the right side (or below on narrower screens) showing:
1. Standard metadata (code, description, domain, RC)
2. A mini score distribution bar (visual of how many students are at each level for this standard)
3. The `StandardStudentList` with all students and their scores

Use a Sheet (slide-over from the right) for a clean UX that doesn't navigate away from the heatmap.

```tsx
"use client";

import { useAppContext } from "@/hooks/useAppContext";
import { useStandardStudents } from "@/hooks/useStandardStudents";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { StandardStudentList } from "./StandardStudentList";

const LEVEL_COLORS: Record<number, string> = {
  1: "#EF4444",
  2: "#F97316",
  3: "#22C55E",
  4: "#3B82F6",
};

interface StandardDetailPanelProps {
  standardId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectStudents: (studentIds: number[]) => void;
}

export function StandardDetailPanel({
  standardId,
  open,
  onOpenChange,
  onSelectStudents,
}: StandardDetailPanelProps) {
  const { selectedRosterId, selectedTestId } = useAppContext();
  const { data, isLoading } = useStandardStudents(
    selectedRosterId,
    selectedTestId,
    standardId
  );

  // Calculate level distribution from student scores
  const levelCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  if (data?.students) {
    for (const s of data.students) {
      const l = s.standardScore >= 5530 ? 4
              : s.standardScore >= 5470 ? 3
              : s.standardScore >= 5410 ? 2
              : 1;
      levelCounts[l]++;
    }
  }
  const total = data?.students.length ?? 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        {isLoading ? (
          <div className="space-y-4 pt-6">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : data ? (
          <>
            <SheetHeader>
              <SheetTitle className="font-mono text-lg">
                {data.standard.code}
              </SheetTitle>
              <SheetDescription>{data.standard.description}</SheetDescription>
            </SheetHeader>

            <div className="mt-4 space-y-4">
              {/* Metadata badges */}
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline">{data.standard.rcName}</Badge>
              </div>

              {/* Score distribution bar */}
              <div>
                <p className="text-sm font-medium mb-2">
                  Score Distribution ({total} students)
                </p>
                <div className="flex h-6 rounded-md overflow-hidden border">
                  {[1, 2, 3, 4].map((l) => {
                    const pct = total > 0 ? (levelCounts[l] / total) * 100 : 0;
                    if (pct === 0) return null;
                    return (
                      <div
                        key={l}
                        style={{
                          width: `${pct}%`,
                          backgroundColor: LEVEL_COLORS[l],
                        }}
                        className="flex items-center justify-center text-white text-xs font-medium"
                        title={`Level ${l}: ${levelCounts[l]} students (${Math.round(pct)}%)`}
                      >
                        {pct >= 12 ? levelCounts[l] : ""}
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                  <span>Beginning</span>
                  <span>Advanced</span>
                </div>
              </div>

              <Separator />

              {/* Student list */}
              <StandardStudentList
                students={data.students}
                onSelectStudents={onSelectStudents}
              />
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
```

### 5.4 `StandardStudentList.tsx` — Student List in Detail Panel

Shows the list of students with their standard score, overall score, proficiency status, and whether they already have an assignment targeting this standard. Supports multi-select for quick assignment creation.

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ClipboardList, ExternalLink } from "lucide-react";
import type { StandardStudentRow } from "@/types";

const LEVEL_COLORS: Record<number, { bg: string; text: string }> = {
  1: { bg: "bg-red-100", text: "text-red-700" },
  2: { bg: "bg-orange-100", text: "text-orange-700" },
  3: { bg: "bg-green-100", text: "text-green-700" },
  4: { bg: "bg-blue-100", text: "text-blue-700" },
};

function scoreLevel(score: number): number {
  if (score >= 5530) return 4;
  if (score >= 5470) return 3;
  if (score >= 5410) return 2;
  return 1;
}

interface StandardStudentListProps {
  students: StandardStudentRow[];
  onSelectStudents: (studentIds: number[]) => void;
}

export function StandardStudentList({
  students,
  onSelectStudents,
}: StandardStudentListProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const belowProficiency = students.filter((s) => !s.isProficient);
  const toggleStudent = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllBelow = () => {
    setSelected(new Set(belowProficiency.filter((s) => !s.hasAssignment).map((s) => s.id)));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          Students ({belowProficiency.length} below proficiency)
        </p>
        <div className="flex gap-2">
          {belowProficiency.filter((s) => !s.hasAssignment).length > 0 && (
            <Button variant="outline" size="sm" onClick={selectAllBelow}>
              Select unassigned
            </Button>
          )}
          {selected.size > 0 && (
            <Button
              size="sm"
              onClick={() => onSelectStudents(Array.from(selected))}
            >
              <ClipboardList className="mr-2 h-4 w-4" />
              Assign {selected.size} students
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-md border max-h-[400px] overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Student</TableHead>
              <TableHead className="text-center">Std Score</TableHead>
              <TableHead className="text-center">Overall</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((s) => {
              const stdLevel = scoreLevel(s.standardScore);
              const colors = LEVEL_COLORS[stdLevel];
              return (
                <TableRow
                  key={s.id}
                  className={cn(!s.isProficient && "bg-red-50/30")}
                >
                  <TableCell>
                    <Checkbox
                      checked={selected.has(s.id)}
                      onCheckedChange={() => toggleStudent(s.id)}
                      disabled={s.hasAssignment}
                    />
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/student/${s.id}`}
                      className="text-sm font-medium hover:underline text-blue-600"
                    >
                      {s.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant="outline"
                      className={cn(colors.bg, colors.text, "tabular-nums")}
                    >
                      {s.standardScore}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center text-sm tabular-nums">
                    {s.overallScore}
                  </TableCell>
                  <TableCell className="text-center">
                    {s.hasAssignment ? (
                      <Badge variant="secondary" className="text-xs">
                        Assigned
                      </Badge>
                    ) : !s.isProficient ? (
                      <Badge
                        variant="outline"
                        className="text-xs bg-red-50 text-red-600 border-red-200"
                      >
                        Needs help
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-xs bg-green-50 text-green-600 border-green-200"
                      >
                        Proficient
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
```

---

## 6. Page Component

### `src/app/dashboard/standards/page.tsx`

```tsx
"use client";

import { useState, useCallback } from "react";
import { StandardsHeatmap } from "@/components/standards/StandardsHeatmap";
import { StandardsFilters } from "@/components/standards/StandardsFilters";
import { StandardDetailPanel } from "@/components/standards/StandardDetailPanel";
import { AssignmentSlideOver } from "@/components/AssignmentSlideOver";

export default function StandardsPage() {
  const [selectedRC, setSelectedRC] = useState<number | null>(null);
  const [selectedStandardId, setSelectedStandardId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [slideOverOpen, setSlideOverOpen] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);

  const handleStandardSelect = useCallback((standardId: number) => {
    setSelectedStandardId(standardId);
    setDetailOpen(true);
  }, []);

  const handleSelectStudents = useCallback((studentIds: number[]) => {
    setSelectedStudentIds(studentIds);
    setDetailOpen(false);
    setSlideOverOpen(true);
  }, []);

  const handleAssignmentSuccess = useCallback(() => {
    setSelectedStudentIds([]);
    setSlideOverOpen(false);
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Standards Analysis</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Identify specific skill gaps and target interventions at the standard level
          </p>
        </div>
      </div>

      <StandardsFilters selectedRC={selectedRC} onRCSelect={setSelectedRC} />

      <StandardsHeatmap
        selectedRC={selectedRC}
        onStandardSelect={handleStandardSelect}
        selectedStandardId={selectedStandardId}
      />

      <StandardDetailPanel
        standardId={selectedStandardId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onSelectStudents={handleSelectStudents}
      />

      <AssignmentSlideOver
        open={slideOverOpen}
        onOpenChange={setSlideOverOpen}
        selectedStudentIds={selectedStudentIds}
        onSuccess={handleAssignmentSuccess}
      />
    </div>
  );
}
```

---

## 7. Interaction Flow

The Standards Analysis tab supports a streamlined teacher workflow:

```
1. Teacher opens "Standards Analysis" tab
   → Sees heatmap of all 20 standards × 4 levels with color-coded scores
   → Red cells immediately draw attention to weak areas

2. Teacher clicks RC filter pill (e.g., "Number and Operations")
   → Heatmap filters to show only standards in that RC
   → Easier to focus on one domain

3. Teacher clicks a red-highlighted standard row (e.g., 3.NF.A.1)
   → Detail panel slides open from the right
   → Shows score distribution bar for that standard
   → Lists all students sorted by score (worst first)
   → Badges show "Needs help" vs "Proficient" vs "Assigned"

4. Teacher clicks "Select unassigned" button
   → All below-proficiency students without existing assignments are selected

5. Teacher clicks "Assign N students"
   → Standard detail panel closes
   → Assignment slide-over opens (reuses existing component)
   → RC and standards are pre-populated based on the selected standard

6. Teacher creates the assignment
   → Returns to heatmap
   → Next time they click that standard, students show "Assigned" badge
```

---

## 8. Visual Design Specifications

### Heatmap Color Scale

The heatmap uses the same 4-level color system as the rest of the app, applied to cell backgrounds:

| Score Range | Color | CSS Class | Meaning |
|------------|-------|-----------|---------|
| < 5350 | Deep Red | `bg-red-200 text-red-900` | Far below proficiency |
| 5350–5409 | Light Red | `bg-red-100 text-red-800` | Below proficiency |
| 5410–5469 | Orange | `bg-orange-100 text-orange-800` | Approaching proficiency |
| 5470–5529 | Green | `bg-green-100 text-green-800` | Proficient |
| ≥ 5530 | Blue | `bg-blue-100 text-blue-800` | Advanced |

### "% Below Proficiency" Column

Color intensity based on urgency:

| % Range | Color | Meaning |
|---------|-------|---------|
| ≥ 60% | Deep Red | Critical — most students struggling |
| 40–59% | Orange | Warning — significant gap |
| 20–39% | Yellow | Monitor — some students struggling |
| < 20% | Green | Healthy — most students proficient |

### Standard Detail Panel

- Width: `max-w-lg` (32rem)
- Slides from right (Sheet component)
- Score distribution bar uses the 4 level colors as horizontal segments
- Student list alternates white/red-50 background for below-proficiency students

---

## 9. Loading & Empty States

### Heatmap Loading
Show a `Skeleton` placeholder sized `h-[400px]` matching the expected table height.

### Heatmap Empty
If no data:
```tsx
<div className="text-center py-12">
  <TableProperties className="mx-auto h-12 w-12 text-muted-foreground" />
  <h3 className="mt-4 text-lg font-semibold">No standards data available</h3>
  <p className="text-muted-foreground">Select a roster and test, or seed data first</p>
</div>
```

### Detail Panel Loading
Show 3 skeleton lines in the sheet content area.

### No Students Below Proficiency
```tsx
<div className="text-center py-8">
  <CheckCircle2 className="mx-auto h-10 w-10 text-green-500" />
  <p className="mt-2 text-sm text-muted-foreground">
    All students are proficient on this standard!
  </p>
</div>
```

---

## 10. Reporting Categories Hook

The `StandardsFilters` component needs a simple hook to fetch the list of reporting categories. If not already available as a standalone hook, create:

### `src/hooks/useReportingCategories.ts`

Check if this hook already exists. It should fetch from `GET /api/reporting-categories` and return:

```typescript
import { useQuery } from "@tanstack/react-query";

interface ReportingCategory {
  id: number;
  name: string;
  description: string | null;
}

export function useReportingCategories() {
  return useQuery<ReportingCategory[]>({
    queryKey: ["reporting-categories"],
    queryFn: async () => {
      const res = await fetch("/api/reporting-categories");
      if (!res.ok) throw new Error("Failed to fetch reporting categories");
      return res.json();
    },
  });
}
```

---

## Verification

After implementing all files:

1. **Tab navigation**: Click "Standards Analysis" tab → page loads correctly between Overview and Impact
2. **Heatmap renders**: Shows 20 rows (grouped by 4 RCs) with L1–L4 columns, color-coded cells
3. **RC filter**: Click "Number and Operations" → heatmap shows only 5 standards in that RC
4. **Click "All"** → full heatmap returns
5. **Click a standard row** → detail panel slides open from right
6. **Detail panel**: Shows standard code, description, distribution bar, student list
7. **Student list**: Below-proficiency students highlighted, "Assigned" badges shown where applicable
8. **Select students**: Click "Select unassigned" → checkboxes populate → "Assign N students" button appears
9. **Create assignment**: Click "Assign" → detail panel closes → assignment slide-over opens → create assignment → toast confirms
10. **Reopen standard**: Click same standard again → previously assigned students now show "Assigned" badge
11. **Loading states**: Skeletons show during data fetch
12. **Empty states**: Display when no data available

Generate all the code. Do not use placeholder comments — write the full implementation for every file.
