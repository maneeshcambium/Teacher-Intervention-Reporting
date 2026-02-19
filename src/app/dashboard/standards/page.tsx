"use client";

import { useState, useCallback } from "react";
import { StandardsHeatmap } from "@/components/standards/StandardsHeatmap";
import { StandardsFilters } from "@/components/standards/StandardsFilters";
import { StandardDetailPanel } from "@/components/standards/StandardDetailPanel";
import { AssignmentSlideOver } from "@/components/AssignmentSlideOver";

export default function StandardsPage() {
  const [selectedRC, setSelectedRC] = useState<number | null>(null);
  const [selectedStandardId, setSelectedStandardId] = useState<number | null>(
    null
  );
  const [detailOpen, setDetailOpen] = useState(false);
  const [slideOverOpen, setSlideOverOpen] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [filterStandardCode, setFilterStandardCode] = useState<string | null>(null);

  const handleStandardSelect = useCallback((standardId: number) => {
    setSelectedStandardId(standardId);
    setDetailOpen(true);
  }, []);

  const handleSelectStudents = useCallback((studentIds: number[], standardCode: string) => {
    setSelectedStudentIds(studentIds);
    setFilterStandardCode(standardCode);
    setDetailOpen(false);
    setSlideOverOpen(true);
  }, []);

  const handleAssignmentSuccess = useCallback(() => {
    setSelectedStudentIds([]);
    setFilterStandardCode(null);
    setSlideOverOpen(false);
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Standards Analysis</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Identify specific skill gaps and target interventions at the standard
            level
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
        filterStandardCode={filterStandardCode}
      />
    </div>
  );
}
