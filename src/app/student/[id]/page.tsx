"use client";

import { use } from "react";
import { useStudent, useStudentAssignments } from "@/hooks/useStudent";
import { StudentHeader } from "@/components/student/StudentHeader";
import { ScoreCards } from "@/components/student/ScoreCards";
import { RCTable } from "@/components/student/RCTable";
import { StandardsAccordion } from "@/components/student/StandardsAccordion";
import { TaskList } from "@/components/student/TaskList";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

interface StudentPageProps {
  params: Promise<{ id: string }>;
}

export default function StudentPage({ params }: StudentPageProps) {
  const { id } = use(params);
  const studentId = Number(id);

  const { data: student, isLoading: studentLoading } = useStudent(studentId);
  const { data: assignmentsData, isLoading: assignmentsLoading } =
    useStudentAssignments(studentId);

  if (studentLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-12 w-96" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-muted-foreground">
            Student not found
          </h2>
        </div>
      </div>
    );
  }

  const assignments = assignmentsData?.assignments ?? [];

  return (
    <div className="p-6 space-y-6">
      <StudentHeader student={student} />

      {student.scores.length > 0 && (
        <ScoreCards scores={student.scores} />
      )}

      <RCTable scores={student.scores} />

      <StandardsAccordion scores={student.scores} assignments={assignments} />

      <TaskList assignments={assignments} />
    </div>
  );
}
