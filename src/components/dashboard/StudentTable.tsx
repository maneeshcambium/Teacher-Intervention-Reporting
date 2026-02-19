"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import { useAppContext } from "@/hooks/useAppContext";
import { useStudents } from "@/hooks/useStudents";
import { usePerformanceLevels } from "@/hooks/usePerformanceLevels";
import { useRCBreakdown } from "@/hooks/useRCBreakdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowUpDown, ArrowUp, ArrowDown, X, Search, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { SortField, SortOrder, StudentRow } from "@/types";

const LEVEL_COLORS: Record<number, string> = {
  1: "#EF4444",
  2: "#F97316",
  3: "#22C55E",
  4: "#3B82F6",
};

const LEVEL_NAMES: Record<number, string> = {
  1: "Beginning",
  2: "Approaching",
  3: "Understands",
  4: "Advanced",
};

interface StudentTableProps {
  selectedLevel: number | null;
  selectedRC: number | null;
  onClearLevel: () => void;
  onClearRC: () => void;
  selectedStudents: Set<number>;
  onSelectionChange: (students: Set<number>) => void;
  onCreateAssignment: () => void;
}

export function StudentTable({
  selectedLevel,
  selectedRC,
  onClearLevel,
  onClearRC,
  selectedStudents,
  onSelectionChange,
  onCreateAssignment,
}: StudentTableProps) {
  const { selectedRosterId, selectedTestId } = useAppContext();
  const { data: perfLevels } = usePerformanceLevels();
  const { data: rcData } = useRCBreakdown(selectedRosterId, selectedTestId);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sort, setSort] = useState<SortField>("name");
  const [order, setOrder] = useState<SortOrder>("asc");

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading } = useStudents(selectedRosterId, selectedTestId, {
    level: selectedLevel,
    rc: selectedRC,
    search: debouncedSearch || undefined,
    sort,
    order,
  });

  // Get RC names for column headers
  const rcColumns = useMemo(() => {
    if (!rcData?.categories) return [];
    return rcData.categories.map((c) => ({
      id: c.rcId,
      name: c.rcName,
    }));
  }, [rcData]);

  const handleSort = useCallback(
    (field: SortField) => {
      if (sort === field) {
        setOrder(order === "asc" ? "desc" : "asc");
      } else {
        setSort(field);
        setOrder("asc");
      }
    },
    [sort, order]
  );

  const toggleStudent = useCallback((studentId: number) => {
    const next = new Set(selectedStudents);
    if (next.has(studentId)) {
      next.delete(studentId);
    } else {
      next.add(studentId);
    }
    onSelectionChange(next);
  }, [selectedStudents, onSelectionChange]);

  const toggleAll = useCallback(() => {
    if (!data?.students) return;
    if (selectedStudents.size === data.students.length) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(data.students.map((s) => s.id)));
    }
  }, [data, selectedStudents.size, onSelectionChange]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sort !== field)
      return <ArrowUpDown className="ml-1 inline h-3 w-3 text-gray-400" />;
    return order === "asc" ? (
      <ArrowUp className="ml-1 inline h-3 w-3" />
    ) : (
      <ArrowDown className="ml-1 inline h-3 w-3" />
    );
  };

  const hasFilters = selectedLevel != null || selectedRC != null;
  const levelName =
    selectedLevel != null
      ? perfLevels?.find((l) => l.level === selectedLevel)?.name ||
        LEVEL_NAMES[selectedLevel]
      : null;
  const rcName =
    selectedRC != null
      ? rcColumns.find((r) => r.id === selectedRC)?.name || `RC ${selectedRC}`
      : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Students</CardTitle>
          {data && (
            <span className="text-sm text-muted-foreground">
              {data.total} student{data.total !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Search and filters */}
        <div className="flex flex-col gap-2">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search students..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {hasFilters && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Filters:</span>
              {levelName && (
                <Badge
                  variant="secondary"
                  className="flex items-center gap-1 cursor-pointer"
                  onClick={onClearLevel}
                >
                  {levelName}
                  <X className="h-3 w-3" />
                </Badge>
              )}
              {rcName && (
                <Badge
                  variant="secondary"
                  className="flex items-center gap-1 cursor-pointer"
                  onClick={onClearRC}
                >
                  RC: {rcName}
                  <X className="h-3 w-3" />
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={
                      data?.students &&
                      data.students.length > 0 &&
                      selectedStudents.size === data.students.length
                    }
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSort("name")}
                >
                  Student Name <SortIcon field="name" />
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSort("level")}
                >
                  Level <SortIcon field="level" />
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none text-right"
                  onClick={() => handleSort("overallScore")}
                >
                  Overall Score <SortIcon field="overallScore" />
                </TableHead>
                {rcColumns.map((rc) => (
                  <TableHead
                    key={rc.id}
                    className="cursor-pointer select-none text-right"
                    onClick={() => handleSort(`rc_${rc.id}`)}
                  >
                    {rc.name} <SortIcon field={`rc_${rc.id}`} />
                  </TableHead>
                ))}
                <TableHead className="text-center">Assignments</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-4" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-12" />
                    </TableCell>
                    {rcColumns.map((rc) => (
                      <TableCell key={rc.id}>
                        <Skeleton className="h-4 w-12" />
                      </TableCell>
                    ))}
                    <TableCell>
                      <Skeleton className="h-5 w-6 mx-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : data?.students && data.students.length > 0 ? (
                data.students.map((student) => (
                  <StudentRowComponent
                    key={student.id}
                    student={student}
                    rcColumns={rcColumns}
                    isSelected={selectedStudents.has(student.id)}
                    onToggle={() => toggleStudent(student.id)}
                  />
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={4 + rcColumns.length + 1}
                    className="py-12"
                  >
                    <div className="text-center">
                      <Search className="mx-auto h-12 w-12 text-muted-foreground" />
                      <h3 className="mt-4 text-lg font-semibold">No students found</h3>
                      <p className="text-muted-foreground">Try adjusting your filters or search query</p>
                      {hasFilters && (
                        <Button
                          variant="outline"
                          className="mt-4"
                          onClick={() => {
                            onClearLevel();
                            onClearRC();
                            setSearch("");
                          }}
                        >
                          Clear Filters
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Bulk action bar */}
      {selectedStudents.size > 0 && (
        <div className="sticky bottom-0 border-t bg-white px-6 py-3 flex items-center justify-between rounded-b-lg">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="text-sm">
              {selectedStudents.size} student{selectedStudents.size !== 1 ? "s" : ""} selected
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSelectionChange(new Set())}
            >
              Clear Selection
            </Button>
          </div>
          <Button onClick={onCreateAssignment} size="sm">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Assignment
          </Button>
        </div>
      )}
    </Card>
  );
}

function StudentRowComponent({
  student,
  rcColumns,
  isSelected,
  onToggle,
}: {
  student: StudentRow;
  rcColumns: { id: number; name: string }[];
  isSelected: boolean;
  onToggle: () => void;
}) {
  const levelColor = LEVEL_COLORS[student.level] || "#6B7280";
  const levelName = LEVEL_NAMES[student.level] || `Level ${student.level}`;

  return (
    <TableRow className={cn(isSelected && "bg-muted/50")}>
      <TableCell>
        <Checkbox checked={isSelected} onCheckedChange={onToggle} />
      </TableCell>
      <TableCell>
        <Link
          href={`/student/${student.id}`}
          className="font-medium text-blue-600 hover:underline"
        >
          {student.name}
        </Link>
      </TableCell>
      <TableCell>
        <Badge
          variant="outline"
          style={{
            borderColor: levelColor,
            color: levelColor,
            backgroundColor: `${levelColor}10`,
          }}
        >
          {levelName}
        </Badge>
      </TableCell>
      <TableCell className="text-right font-mono">
        {student.overallScore}
      </TableCell>
      {rcColumns.map((rc) => (
        <TableCell key={rc.id} className="text-right font-mono">
          {student.rcScores[String(rc.id)] ?? "—"}
        </TableCell>
      ))}
      <TableCell className="text-center">
        <Badge variant="secondary">{student.assignmentCount}</Badge>
      </TableCell>
    </TableRow>
  );
}
