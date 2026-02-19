"use client";

import { useState, useCallback } from "react";
import { StandardsHeatmap } from "@/components/standards/StandardsHeatmap";
import { StudentStandardHeatmap } from "@/components/standards/StudentStandardHeatmap";
import { StandardsFilters } from "@/components/standards/StandardsFilters";
import { StandardDetailPanel } from "@/components/standards/StandardDetailPanel";
import { AssignmentSlideOver } from "@/components/AssignmentSlideOver";
import { Button } from "@/components/ui/button";
import { TableProperties, Grid3X3 } from "lucide-react";

type ViewMode = "summary" | "heatmap";

export default function StandardsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("summary");
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

        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <Button
            variant={viewMode === "summary" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("summary")}
            className="gap-2"
          >
            <TableProperties className="h-4 w-4" />
            Summary Table
          </Button>
          <Button
            variant={viewMode === "heatmap" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("heatmap")}
            className="gap-2"
          >
            <Grid3X3 className="h-4 w-4" />
            Student Heatmap
          </Button>
        </div>
      </div>

      <StandardsFilters selectedRC={selectedRC} onRCSelect={setSelectedRC} />

      {viewMode === "summary" ? (
        <StandardsHeatmap
          selectedRC={selectedRC}
          onStandardSelect={handleStandardSelect}
          selectedStandardId={selectedStandardId}
        />
      ) : (
        <StudentStandardHeatmap
          selectedRC={selectedRC}
          onStandardSelect={handleStandardSelect}
        />
      )}

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
