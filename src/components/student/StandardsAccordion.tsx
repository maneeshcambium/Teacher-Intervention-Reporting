"use client";

import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";
import type { StudentTestScore, StudentAssignmentDetail } from "@/types";

function ChangeCell({ change }: { change: number }) {
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

interface StandardsAccordionProps {
  scores: StudentTestScore[];
  assignments: StudentAssignmentDetail[];
}

export function StandardsAccordion({ scores, assignments }: StandardsAccordionProps) {
  if (scores.length === 0) return null;

  // Collect all standard IDs that this student has via assignments
  const assignedStandardIds = new Set<number>();
  for (const a of assignments) {
    for (const s of a.standards) {
      assignedStandardIds.add(s.id);
    }
  }

  // Group standards by RC
  // First, collect all RC IDs and all standards across tests
  const rcMap = new Map<string, { rcName: string; standards: Map<string, { code: string; description: string; stdId: number }> }>();

  for (const score of scores) {
    for (const [rcId, rcInfo] of Object.entries(score.rcScores)) {
      if (!rcMap.has(rcId)) {
        rcMap.set(rcId, { rcName: rcInfo.name, standards: new Map() });
      }
    }
    for (const [stdId, stdInfo] of Object.entries(score.stdScores)) {
      const rcIdStr = String(stdInfo.rcId);
      if (!rcMap.has(rcIdStr)) {
        rcMap.set(rcIdStr, { rcName: `RC ${rcIdStr}`, standards: new Map() });
      }
      const rc = rcMap.get(rcIdStr)!;
      if (!rc.standards.has(stdId)) {
        rc.standards.set(stdId, {
          code: stdInfo.code,
          description: stdInfo.description,
          stdId: Number(stdId),
        });
      }
    }
  }

  const rcEntries = Array.from(rcMap.entries()).sort(
    (a, b) => Number(a[0]) - Number(b[0])
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Standards Detail</CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="w-full">
          {rcEntries.map(([rcId, { rcName, standards: stdMap }]) => {
            const stdEntries = Array.from(stdMap.entries()).sort(
              (a, b) => a[1].code.localeCompare(b[1].code)
            );

            if (stdEntries.length === 0) return null;

            return (
              <AccordionItem key={rcId} value={rcId}>
                <AccordionTrigger className="text-sm font-medium">
                  {rcName} ({stdEntries.length} standard{stdEntries.length !== 1 ? "s" : ""})
                </AccordionTrigger>
                <AccordionContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[250px]">Standard</TableHead>
                          <TableHead>Code</TableHead>
                          {scores.map((s) => (
                            <TableHead key={s.testId} className="text-right">
                              {s.testName}
                            </TableHead>
                          ))}
                          <TableHead className="text-center">Change</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stdEntries.map(([stdId, info]) => {
                          const testScores = scores.map(
                            (s) => s.stdScores[stdId]?.score ?? null
                          );
                          const firstScore = testScores.find((s) => s !== null);
                          const lastScore = [...testScores]
                            .reverse()
                            .find((s) => s !== null);
                          const change =
                            firstScore != null && lastScore != null
                              ? lastScore - firstScore
                              : 0;

                          const isAssigned = assignedStandardIds.has(info.stdId);

                          return (
                            <TableRow key={stdId}>
                              <TableCell className="text-sm">
                                {info.description}
                              </TableCell>
                              <TableCell className="font-mono text-sm whitespace-nowrap">
                                {isAssigned && (
                                  <ClipboardList className="inline h-3.5 w-3.5 mr-1 text-blue-500" />
                                )}
                                {info.code}
                              </TableCell>
                              {testScores.map((score, idx) => (
                                <TableCell
                                  key={idx}
                                  className="text-right font-mono"
                                >
                                  {score !== null ? score : "—"}
                                </TableCell>
                              ))}
                              <TableCell className="text-center">
                                {scores.length > 1 ? (
                                  <ChangeCell change={change} />
                                ) : (
                                  "—"
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
}
