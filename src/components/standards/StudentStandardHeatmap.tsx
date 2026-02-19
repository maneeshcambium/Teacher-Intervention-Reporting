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
import { Grid3X3 } from "lucide-react";
import type { StudentStandardScores } from "@/types";

/** 7-band color scale matching performance level colors */
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
    case 1:
      return "Beginning";
    case 2:
      return "Approaching";
    case 3:
      return "Understands";
    case 4:
      return "Advanced";
    default:
      return `L${level}`;
  }
}

function scoreLevelNum(score: number): number {
  if (score >= 5530) return 4;
  if (score >= 5470) return 3;
  if (score >= 5410) return 2;
  return 1;
}

type SortOption = "score" | "name" | "gaps";

interface Props {
  selectedRC: number | null;
  onStandardSelect: (standardId: number) => void;
}

export function StudentStandardHeatmap({
  selectedRC,
  onStandardSelect,
}: Props) {
  const router = useRouter();
  const { selectedRosterId, selectedTestId } = useAppContext();
  const { data, isLoading } = useStudentStandardMatrix(
    selectedRosterId,
    selectedTestId
  );
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
    const groups: {
      rcId: number;
      rcName: string;
      count: number;
    }[] = [];
    const seen = new Set<number>();
    for (const std of filteredStandards) {
      if (!seen.has(std.rcId)) {
        seen.add(std.rcId);
        groups.push({
          rcId: std.rcId,
          rcName: std.rcName,
          count: filteredStandards.filter((s) => s.rcId === std.rcId).length,
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

  // Calculate per-student gap count
  const getGapCount = (student: StudentStandardScores) => {
    if (!data) return 0;
    return filteredStandards.filter(
      (s) =>
        (student.standardScores[String(s.id)] ?? 0) <
        data.summary.proficiencyThreshold
    ).length;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Student × Standard Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[500px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.students.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Student × Standard Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Grid3X3 className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No data available</h3>
            <p className="text-muted-foreground">
              Select a roster and test, or seed data first
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle>Student × Standard Heatmap</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Each cell shows a student&apos;s score on a standard. Click a column
            header to see standard detail, or click a student name to view their
            profile.
          </p>
        </div>
        <Select
          value={sortBy}
          onValueChange={(v) => setSortBy(v as SortOption)}
        >
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
                      colSpan={g.count}
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
                  <th
                    className="sticky left-0 z-30 bg-white px-2 py-1 text-left
                                 font-medium border-b min-w-[140px]"
                  >
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
                      {std.code.replace(/^\d+\./, "")}
                    </th>
                  ))}
                  <th
                    className="sticky right-0 z-30 bg-white px-1 py-1 text-center
                                 font-medium border-b min-w-[50px]"
                  >
                    Gaps
                  </th>
                </tr>
                {/* Row 3: Class average summary */}
                <tr className="bg-gray-50">
                  <td
                    className="sticky left-0 z-30 bg-gray-50 px-2 py-1
                                 text-[10px] font-semibold border-b"
                  >
                    Class Avg
                  </td>
                  {filteredStandards.map((std) => {
                    const avg =
                      data.summary.classAvgByStandard[String(std.id)] ?? 0;
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
                  const gaps = getGapCount(student);

                  return (
                    <tr key={student.id} className="hover:bg-muted/10">
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
                        const score =
                          student.standardScores[String(std.id)];
                        const classAvg =
                          data.summary.classAvgByStandard[String(std.id)] ?? 0;

                        if (score == null) {
                          return (
                            <td
                              key={std.id}
                              className="text-center text-muted-foreground
                                             border-b border-x px-1 py-1"
                            >
                              —
                            </td>
                          );
                        }

                        const delta = score - classAvg;

                        return (
                          <td
                            key={std.id}
                            className="border-b border-x p-0"
                          >
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
                              <TooltipContent
                                side="top"
                                className="text-xs"
                              >
                                <p className="font-semibold">
                                  {student.name} — {std.code}
                                </p>
                                <p>{std.description}</p>
                                <p className="mt-1">
                                  Score: {score} (
                                  {levelLabel(scoreLevelNum(score))})
                                </p>
                                <p>
                                  Class avg: {classAvg} | Δ:{" "}
                                  {delta >= 0 ? "+" : ""}
                                  {delta}
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
                          gaps >= 15
                            ? "text-red-600"
                            : gaps >= 10
                              ? "text-orange-600"
                              : "text-muted-foreground"
                        )}
                      >
                        {gaps}/{filteredStandards.length}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ─── Legend ─── */}
          <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground flex-wrap">
            <span className="font-medium">Legend:</span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-4 h-4 rounded bg-red-500" />{" "}
              Beginning (&lt;5410)
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-4 h-4 rounded bg-orange-300" />{" "}
              Approaching (5410–5469)
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-4 h-4 rounded bg-green-300" />{" "}
              Understands (5470–5529)
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-4 h-4 rounded bg-blue-400" />{" "}
              Advanced (≥5530)
            </span>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
