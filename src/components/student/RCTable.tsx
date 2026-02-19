"use client";

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { StudentTestScore } from "@/types";

const LEVEL_COLORS: Record<number, string> = {
  1: "#EF4444",
  2: "#F97316",
  3: "#22C55E",
  4: "#3B82F6",
};

const LEVEL_NAMES: Record<number, string> = {
  1: "Beginning",
  2: "Approaching",
  3: "Understands",
  4: "Advanced",
};

function getLevel(score: number): number {
  if (score >= 5530) return 4;
  if (score >= 5470) return 3;
  if (score >= 5410) return 2;
  return 1;
}

function ChangeCell({ change }: { change: number }) {
  const absChange = Math.abs(change);
  let color = "text-gray-500";
  let arrow = "→";

  if (change >= 30) {
    color = "text-green-600";
    arrow = "↑";
  } else if (change <= -30) {
    color = "text-red-600";
    arrow = "↓";
  }

  return (
    <span className={`font-medium ${color}`}>
      {change > 0 ? "+" : ""}
      {change} {arrow}
    </span>
  );
}

interface RCTableProps {
  scores: StudentTestScore[];
}

export function RCTable({ scores }: RCTableProps) {
  if (scores.length === 0) return null;

  // Collect all RC ids across all tests
  const rcIdSet = new Set<string>();
  for (const score of scores) {
    for (const rcId of Object.keys(score.rcScores)) {
      rcIdSet.add(rcId);
    }
  }
  const rcIds = Array.from(rcIdSet).sort(
    (a, b) => Number(a) - Number(b)
  );

  // Build rows: one per RC
  const rows = rcIds.map((rcId) => {
    const name = scores.find((s) => s.rcScores[rcId])?.rcScores[rcId]?.name || `RC ${rcId}`;
    const testScores = scores.map((s) => s.rcScores[rcId]?.score ?? null);
    const firstScore = testScores.find((s) => s !== null);
    const lastScore = [...testScores].reverse().find((s) => s !== null);
    const change =
      firstScore != null && lastScore != null ? lastScore - firstScore : 0;

    return { rcId, name, testScores, change };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reporting Category Scores</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">
                  Reporting Category
                </TableHead>
                {scores.map((s) => (
                  <TableHead
                    key={s.testId}
                    className="text-center"
                    colSpan={2}
                  >
                    {s.testName}
                  </TableHead>
                ))}
                <TableHead className="text-center">Change</TableHead>
              </TableRow>
              <TableRow>
                <TableHead />
                {scores.map((s) => (
                  <React.Fragment key={`sub-${s.testId}`}>
                    <TableHead className="text-right text-xs">Score</TableHead>
                    <TableHead className="text-center text-xs">Level</TableHead>
                  </React.Fragment>
                ))}
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const highlight = Math.abs(row.change) >= 50;
                return (
                  <TableRow
                    key={row.rcId}
                    className={cn(highlight && "bg-green-50")}
                  >
                    <TableCell className="font-medium">{row.name}</TableCell>
                    {row.testScores.map((score, idx) => {
                      if (score === null) {
                        return (
                          <React.Fragment key={`${row.rcId}-${idx}`}>
                            <TableCell className="text-right text-muted-foreground">
                              —
                            </TableCell>
                            <TableCell className="text-center">—</TableCell>
                          </React.Fragment>
                        );
                      }
                      const level = getLevel(score);
                      const levelColor = LEVEL_COLORS[level];
                      const levelName = LEVEL_NAMES[level];
                      return (
                        <React.Fragment key={`${row.rcId}-${idx}`}>
                          <TableCell className="text-right font-mono">
                            {score}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className="text-xs"
                              style={{
                                borderColor: levelColor,
                                color: levelColor,
                                backgroundColor: `${levelColor}10`,
                              }}
                            >
                              {levelName}
                            </Badge>
                          </TableCell>
                        </React.Fragment>
                      );
                    })}
                    <TableCell className="text-center">
                      <ChangeCell change={row.change} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
