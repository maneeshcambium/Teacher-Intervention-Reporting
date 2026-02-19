"use client";

import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAssignmentStudents } from "@/hooks/useAssignmentStudents";
import type { AssignmentListItem } from "@/types";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  not_started: { label: "Not Started", className: "bg-gray-100 text-gray-700 border-gray-200" },
  started: { label: "Started", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  completed: { label: "Completed", className: "bg-green-100 text-green-800 border-green-200" },
};

interface AssignmentStudentsPanelProps {
  assignment: AssignmentListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rosterId?: number | null;
}

export function AssignmentStudentsPanel({
  assignment,
  open,
  onOpenChange,
  rosterId,
}: AssignmentStudentsPanelProps) {
  const { data: students, isLoading } = useAssignmentStudents(
    open && assignment ? assignment.id : null,
    rosterId
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[420px] sm:w-[480px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{assignment?.name ?? "Assignment"}</SheetTitle>
          <SheetDescription>
            {students ? students.length : assignment?.totalStudents} student{(students ? students.length : assignment?.totalStudents) !== 1 ? "s" : ""}{rosterId ? " (filtered by roster)" : " assigned"}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-1">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))
          ) : !students || students.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No students assigned.
            </p>
          ) : (
            <div className="rounded-md border divide-y">
              {students.map((s) => {
                const cfg = STATUS_CONFIG[s.status] ?? STATUS_CONFIG.not_started;
                return (
                  <div
                    key={s.studentId}
                    className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors"
                  >
                    <Link
                      href={`/student/${s.studentId}`}
                      className="text-sm font-medium text-blue-600 hover:underline"
                    >
                      {s.studentName}
                    </Link>
                    <Badge variant="outline" className={cfg.className}>
                      {cfg.label}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
