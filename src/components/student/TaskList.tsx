"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, CircleDashed } from "lucide-react";
import type { StudentAssignmentDetail } from "@/types";

const PLATFORM_COLORS: Record<string, string> = {
  ixl: "#22C55E",
  khan_academy: "#14B8A6",
  lexiacore5: "#8B5CF6",
  reflex: "#F59E0B",
};

const PLATFORM_LABELS: Record<string, string> = {
  ixl: "IXL",
  khan_academy: "Khan Academy",
  lexiacore5: "Lexia Core5",
  reflex: "Reflex",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface TaskListProps {
  assignments: StudentAssignmentDetail[];
}

export function TaskList({ assignments }: TaskListProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <CardTitle>My Assignments</CardTitle>
          <Badge variant="secondary">{assignments.length}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {assignments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No assignments yet! 🎉
          </div>
        ) : (
          <div className="space-y-3">
            {assignments.map((assignment) => {
              const platformColor =
                PLATFORM_COLORS[assignment.platform] || "#6B7280";
              const platformLabel =
                PLATFORM_LABELS[assignment.platform] || assignment.platform;

              let StatusIcon = CircleDashed;
              let statusLabel = "Not Yet Started";
              let statusClass = "bg-gray-100 text-gray-700";
              if (assignment.status === "started") {
                StatusIcon = Clock;
                statusLabel = "Started";
                statusClass = "bg-yellow-100 text-yellow-700";
              } else if (assignment.status === "completed") {
                StatusIcon = CheckCircle2;
                statusLabel = "Completed";
                statusClass = "bg-green-100 text-green-700";
              }

              return (
                <Card key={assignment.assignmentId} className="shadow-sm">
                  <CardContent className="flex items-center gap-4 py-4">
                    {/* Platform badge */}
                    <div>
                      <Badge
                        style={{
                          backgroundColor: `${platformColor}20`,
                          color: platformColor,
                          borderColor: platformColor,
                        }}
                        variant="outline"
                        className="whitespace-nowrap"
                      >
                        {platformLabel}
                      </Badge>
                    </div>

                    {/* Middle: name, standards, dates */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold">{assignment.name}</div>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {assignment.standards.map((std) => (
                          <Badge
                            key={std.id}
                            variant="secondary"
                            className="text-xs"
                          >
                            {std.code}
                          </Badge>
                        ))}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1.5 space-x-3">
                        <span className="font-medium">
                          Window: {assignment.preTestName}
                          {assignment.postTestName ? ` → ${assignment.postTestName}` : ""}
                        </span>
                        {assignment.startedAt && (
                          <span>Started {formatDate(assignment.startedAt)}</span>
                        )}
                        {assignment.completedAt && (
                          <span>
                            Completed {formatDate(assignment.completedAt)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status badge */}
                    <div>
                      <Badge className={`${statusClass} gap-1.5`} variant="outline">
                        <StatusIcon className="h-3.5 w-3.5" />
                        {statusLabel}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
