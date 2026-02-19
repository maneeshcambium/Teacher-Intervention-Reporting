"use client";

import { useAppContext } from "@/hooks/useAppContext";
import { useStandardStudents } from "@/hooks/useStandardStudents";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { StandardStudentList } from "./StandardStudentList";

const LEVEL_COLORS: Record<number, string> = {
  1: "#EF4444",
  2: "#F97316",
  3: "#22C55E",
  4: "#3B82F6",
};

interface StandardDetailPanelProps {
  standardId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectStudents: (studentIds: number[], standardCode: string) => void;
}

export function StandardDetailPanel({
  standardId,
  open,
  onOpenChange,
  onSelectStudents,
}: StandardDetailPanelProps) {
  const { selectedRosterId, selectedTestId } = useAppContext();
  const { data, isLoading } = useStandardStudents(
    selectedRosterId,
    selectedTestId,
    open ? standardId : null
  );

  // Calculate level distribution from student scores
  const levelCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  if (data?.students) {
    for (const s of data.students) {
      const l =
        s.standardScore >= 5530
          ? 4
          : s.standardScore >= 5470
            ? 3
            : s.standardScore >= 5410
              ? 2
              : 1;
      levelCounts[l]++;
    }
  }
  const total = data?.students.length ?? 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        {isLoading ? (
          <SheetHeader>
            <SheetTitle>
              <Skeleton className="h-6 w-48" />
            </SheetTitle>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-32 w-full" />
          </SheetHeader>
        ) : data ? (
          <>
            <SheetHeader>
              <SheetTitle className="font-mono text-lg">
                {data.standard.code}
              </SheetTitle>
              <SheetDescription>{data.standard.description}</SheetDescription>
            </SheetHeader>

            <div className="mt-4 space-y-4">
              {/* Metadata badges */}
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline">{data.standard.rcName}</Badge>
              </div>

              {/* Score distribution bar */}
              <div>
                <p className="text-sm font-medium mb-2">
                  Score Distribution ({total} students)
                </p>
                <div className="flex h-6 rounded-md overflow-hidden border">
                  {[1, 2, 3, 4].map((l) => {
                    const pct =
                      total > 0 ? (levelCounts[l] / total) * 100 : 0;
                    if (pct === 0) return null;
                    return (
                      <div
                        key={l}
                        style={{
                          width: `${pct}%`,
                          backgroundColor: LEVEL_COLORS[l],
                        }}
                        className="flex items-center justify-center text-white text-xs font-medium"
                        title={`Level ${l}: ${levelCounts[l]} students (${Math.round(pct)}%)`}
                      >
                        {pct >= 12 ? levelCounts[l] : ""}
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                  <span>Beginning</span>
                  <span>Advanced</span>
                </div>
              </div>

              <Separator />

              {/* Student list */}
              <StandardStudentList
                students={data.students}
                onSelectStudents={(ids) => onSelectStudents(ids, data.standard.code)}
              />
            </div>
          </>
        ) : (
          <SheetHeader>
            <SheetTitle>Standard Detail</SheetTitle>
          </SheetHeader>
        )}
      </SheetContent>
    </Sheet>
  );
}
