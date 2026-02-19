"use client";

import React from "react";
import { useAppContext } from "@/hooks/useAppContext";
import { useStandardsBreakdown } from "@/hooks/useStandardsBreakdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
import { TableProperties } from "lucide-react";

const LEVEL_NAMES: Record<number, string> = {
  1: "L1",
  2: "L2",
  3: "L3",
  4: "L4",
};

/**
 * Maps a scale score to a background color using a diverging scale.
 * Red (below 5410) → Orange (5410-5469) → Green (5470-5529) → Blue (5530+)
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
          <div className="text-center py-12">
            <TableProperties className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No standards data available</h3>
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
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
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
                              <span className="line-clamp-2">
                                {std.description}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent
                              side="bottom"
                              className="max-w-sm"
                            >
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
