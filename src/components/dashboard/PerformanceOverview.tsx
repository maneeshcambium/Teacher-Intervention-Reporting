"use client";

import { useAppContext } from "@/hooks/useAppContext";
import { usePerformance } from "@/hooks/usePerformance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { PerformanceLevelInfo } from "@/types";

interface PerformanceOverviewProps {
  selectedLevel: number | null;
  onLevelSelect: (level: number | null) => void;
}

export function PerformanceOverview({
  selectedLevel,
  onLevelSelect,
}: PerformanceOverviewProps) {
  const { selectedRosterId, selectedTestId } = useAppContext();
  const { data, isLoading } = usePerformance(selectedRosterId, selectedTestId);

  const handleCardClick = (level: number) => {
    if (selectedLevel === level) {
      onLevelSelect(null);
    } else {
      onLevelSelect(level);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Class Overall Performance</CardTitle>
        {data && (
          <p className="text-sm text-muted-foreground">
            {data.total} students total
          </p>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : data ? (
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            {data.levels.map((level) => (
              <LevelCard
                key={level.level}
                level={level}
                isActive={selectedLevel === level.level}
                onClick={() => handleCardClick(level.level)}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Select a roster and test to view performance data.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function LevelCard({
  level,
  isActive,
  onClick,
}: {
  level: PerformanceLevelInfo;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex flex-col overflow-hidden rounded-lg border text-left transition-all hover:shadow-md",
        isActive
          ? "ring-2 ring-offset-2 shadow-md"
          : "hover:border-gray-300"
      )}
      style={{
        ...(isActive ? { ringColor: level.color } as React.CSSProperties : {}),
      }}
    >
      {/* Colored top bar */}
      <div className="h-2 w-full" style={{ backgroundColor: level.color }} />

      <div className="flex flex-1 flex-col gap-1 p-3">
        <span className="text-xs font-medium text-muted-foreground">
          Level {level.level}
        </span>
        <span className="text-sm font-semibold leading-tight min-h-[2.5rem]">{level.name}</span>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-2xl font-bold" style={{ color: level.color }}>
            {level.count}
          </span>
          <span className="text-sm text-muted-foreground">
            ({level.percentage}%)
          </span>
        </div>
      </div>
    </button>
  );
}
