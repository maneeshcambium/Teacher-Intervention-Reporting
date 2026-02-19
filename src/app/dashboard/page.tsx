"use client";

import { useState, useCallback } from "react";
import { PerformanceOverview } from "@/components/dashboard/PerformanceOverview";
import { RCBreakdown } from "@/components/dashboard/RCBreakdown";
import { StudentTable } from "@/components/dashboard/StudentTable";
import { AssignmentSummary } from "@/components/dashboard/AssignmentSummary";
import { AssignmentSlideOver } from "@/components/AssignmentSlideOver";
import { SimulateSyncButton } from "@/components/dashboard/SimulateSyncButton";
import { SeedButton } from "@/components/dashboard/SeedButton";

export default function DashboardPage() {
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [selectedRC, setSelectedRC] = useState<number | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<Set<number>>(new Set());
  const [slideOverOpen, setSlideOverOpen] = useState(false);

  const handleCreateAssignment = useCallback(() => {
    setSlideOverOpen(true);
  }, []);

  const handleAssignmentSuccess = useCallback(() => {
    setSelectedStudents(new Set());
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <div className="flex items-center gap-2">
          <SeedButton />
          <SimulateSyncButton />
        </div>
      </div>
      <PerformanceOverview
        selectedLevel={selectedLevel}
        onLevelSelect={setSelectedLevel}
      />
      <RCBreakdown selectedRC={selectedRC} onRCSelect={setSelectedRC} />
      <StudentTable
        selectedLevel={selectedLevel}
        selectedRC={selectedRC}
        onClearLevel={() => setSelectedLevel(null)}
        onClearRC={() => setSelectedRC(null)}
        selectedStudents={selectedStudents}
        onSelectionChange={setSelectedStudents}
        onCreateAssignment={handleCreateAssignment}
      />
      <AssignmentSummary />
      <AssignmentSlideOver
        open={slideOverOpen}
        onOpenChange={setSlideOverOpen}
        selectedStudentIds={Array.from(selectedStudents)}
        onSuccess={handleAssignmentSuccess}
      />
    </div>
  );
}
