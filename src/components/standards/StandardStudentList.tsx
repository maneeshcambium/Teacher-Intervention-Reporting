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
import { ClipboardList, CheckCircle2 } from "lucide-react";
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
  const unassignedBelow = belowProficiency.filter((s) => !s.hasAssignment);

  const toggleStudent = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllBelow = () => {
    setSelected(new Set(unassignedBelow.map((s) => s.id)));
  };

  if (belowProficiency.length === 0) {
    return (
      <div className="text-center py-8">
        <CheckCircle2 className="mx-auto h-10 w-10 text-green-500" />
        <p className="mt-2 text-sm text-muted-foreground">
          All students are proficient on this standard!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          Students ({belowProficiency.length} below proficiency)
        </p>
        <div className="flex gap-2">
          {unassignedBelow.length > 0 && (
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
