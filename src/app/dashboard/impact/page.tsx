"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAppContext } from "@/hooks/useAppContext";
import { useImpactSummary, useAssignmentImpact } from "@/hooks/useImpact";
import { useStandardImpact } from "@/hooks/useStandardImpact";
import { ImpactCards } from "@/components/impact/ImpactCard";
import { ScatterPlot } from "@/components/impact/ScatterPlot";
import { ImpactTable } from "@/components/impact/ImpactTable";
import { ImpactInfoDialog } from "@/components/impact/ImpactInfoDialog";
import { StandardImpactBreakdown } from "@/components/impact/StandardImpactBreakdown";

export default function ImpactPage() {
  const { selectedTestGroupId, selectedRosterId, selectedTestId, rosters, tests } = useAppContext();
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | null>(null);
  const [filterByTest, setFilterByTest] = useState(false);
  const [filterByRoster, setFilterByRoster] = useState(false);

  const { data: summary, isLoading: summaryLoading } = useImpactSummary(
    selectedTestGroupId
  );

  const { data: selectedImpact, isLoading: detailLoading } = useAssignmentImpact(
    selectedAssignmentId
  );

  const { data: standardImpact, isLoading: standardImpactLoading } = useStandardImpact(
    selectedAssignmentId
  );

  const allImpacts = summary?.impacts ?? [];

  const selectedRosterName = rosters.find((r) => r.id === selectedRosterId)?.name ?? "Selected Roster";
  const selectedTestName = tests.find((t) => t.id === selectedTestId)?.name ?? "Selected Test";

  const impacts = useMemo(() => {
    let filtered = allImpacts;
    if (filterByTest && selectedTestId) {
      filtered = filtered.filter((i) => i.createdAfterTestId === selectedTestId);
    }
    if (filterByRoster && selectedRosterId) {
      filtered = filtered.filter((i) => i.rosterIds?.includes(selectedRosterId));
    }
    return filtered;
  }, [allImpacts, filterByTest, filterByRoster, selectedTestId, selectedRosterId]);

  if (summaryLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Impact Analysis</h1>
            <ImpactInfoDialog />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Skeleton className="h-[460px] w-full" />
          <Skeleton className="h-[460px] w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Impact Analysis</h1>
            <ImpactInfoDialog />
            {filterByRoster && (
              <Badge variant="outline" className="text-xs">
                {selectedRosterName}
              </Badge>
            )}
            {filterByTest && (
              <Badge variant="outline" className="text-xs">
                {selectedTestName}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            Difference-in-Differences measurement of assignment effectiveness
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="impact-test-filter" className="text-sm text-muted-foreground cursor-pointer">
              Filter by test
            </Label>
            <Switch
              id="impact-test-filter"
              checked={filterByTest}
              onCheckedChange={setFilterByTest}
            />
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="impact-roster-filter" className="text-sm text-muted-foreground cursor-pointer">
              Filter by roster
            </Label>
            <Switch
              id="impact-roster-filter"
              checked={filterByRoster}
              onCheckedChange={setFilterByRoster}
            />
          </div>
          {summary?.calculatedAt && (
            <Badge variant="outline">
              Calculated at{" "}
              {new Date(summary.calculatedAt).toLocaleTimeString()}
            </Badge>
          )}
        </div>
      </div>

      <ImpactCards
        impacts={impacts}
        selectedId={selectedAssignmentId}
        onSelect={setSelectedAssignmentId}
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ScatterPlot
          impact={selectedImpact ?? null}
          isLoading={detailLoading && selectedAssignmentId != null}
        />
        <ImpactTable
          impacts={impacts}
          selectedId={selectedAssignmentId}
          onSelect={setSelectedAssignmentId}
        />
      </div>

      {selectedAssignmentId && (
        <StandardImpactBreakdown
          data={standardImpact ?? null}
          isLoading={standardImpactLoading}
        />
      )}
    </div>
  );
}
