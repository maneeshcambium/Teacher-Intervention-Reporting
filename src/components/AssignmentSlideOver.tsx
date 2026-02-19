"use client";

import { useState, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAppContext } from "@/hooks/useAppContext";
import { useReportingCategories } from "@/hooks/useReportingCategories";
import { useCreateAssignment } from "@/hooks/useCreateAssignment";
import { useAssignments } from "@/hooks/useAssignments";
import { useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Plus,
  ArrowLeft,
  Users,
} from "lucide-react";
import type { StandardInfo, AssignmentListItem } from "@/types";

const PLATFORMS = [
  { value: "ixl", label: "📘 IXL" },
  { value: "lexiacore5", label: "📙 LexiaCore5" },
  { value: "reflex", label: "📗 Reflex" },
  { value: "khan_academy", label: "📕 Khan Academy" },
];

const PLATFORM_LABELS: Record<string, string> = {
  ixl: "📘 IXL",
  lexiacore5: "📙 LexiaCore5",
  reflex: "📗 Reflex",
  khan_academy: "📕 Khan Academy",
};

interface AssignmentSlideOverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedStudentIds: number[];
  onSuccess: () => void;
  /** When set, only show existing assignments that include this standard code */
  filterStandardCode?: string | null;
}

type Mode = "choose" | "create";

export function AssignmentSlideOver({
  open,
  onOpenChange,
  selectedStudentIds,
  onSuccess,
  filterStandardCode,
}: AssignmentSlideOverProps) {
  const { selectedTestGroupId, selectedTestId, tests } = useAppContext();
  const { data: reportingCategories } = useReportingCategories();
  const { data: assignments } = useAssignments(selectedTestGroupId);
  const createMutation = useCreateAssignment();
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<Mode>("choose");
  const [addingToId, setAddingToId] = useState<number | null>(null);

  // Create form state
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState("");
  const [selectedRCId, setSelectedRCId] = useState<string>("");
  const [selectedDomain, setSelectedDomain] = useState<string>("");
  const [selectedSubDomain, setSelectedSubDomain] = useState<string>("");
  const [selectedStandardIds, setSelectedStandardIds] = useState<Set<number>>(
    new Set()
  );
  const [showStudents, setShowStudents] = useState(false);

  // Determine test context
  const currentTest = tests.find((t) => t.id === selectedTestId);
  const nextTest = tests.find(
    (t) => t.sequence === (currentTest?.sequence ?? 0) + 1
  );

  // Get domains filtered by selected RC
  const selectedRC = useMemo(() => {
    if (!selectedRCId || !reportingCategories) return null;
    return reportingCategories.find((rc) => rc.id === Number(selectedRCId));
  }, [selectedRCId, reportingCategories]);

  const domains = useMemo(() => {
    return selectedRC?.domains ?? [];
  }, [selectedRC]);

  const selectedDomainObj = useMemo(() => {
    return domains.find((d) => d.name === selectedDomain);
  }, [domains, selectedDomain]);

  const subDomains = useMemo(() => {
    return selectedDomainObj?.subDomains ?? [];
  }, [selectedDomainObj]);

  const filteredStandards = useMemo(() => {
    if (!selectedDomainObj) return [];
    if (selectedSubDomain) {
      const sub = subDomains.find((s) => s.name === selectedSubDomain);
      return sub?.standards ?? [];
    }
    return selectedDomainObj.subDomains.flatMap((sd) => sd.standards);
  }, [selectedDomainObj, selectedSubDomain, subDomains]);

  const handleRCChange = (value: string) => {
    setSelectedRCId(value);
    setSelectedDomain("");
    setSelectedSubDomain("");
    setSelectedStandardIds(new Set());
  };

  const handleDomainChange = (value: string) => {
    setSelectedDomain(value);
    setSelectedSubDomain("");
    setSelectedStandardIds(new Set());
  };

  const handleSubDomainChange = (value: string) => {
    setSelectedSubDomain(value);
    setSelectedStandardIds(new Set());
  };

  const toggleStandard = (stdId: number) => {
    setSelectedStandardIds((prev) => {
      const next = new Set(prev);
      if (next.has(stdId)) next.delete(stdId);
      else next.add(stdId);
      return next;
    });
  };

  const resetForm = () => {
    setName("");
    setPlatform("");
    setSelectedRCId("");
    setSelectedDomain("");
    setSelectedSubDomain("");
    setSelectedStandardIds(new Set());
    setShowStudents(false);
    setMode("choose");
    setAddingToId(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  // ── Add students to existing assignment ────────────────────────────────

  const handleAddToExisting = async (assignmentId: number) => {
    setAddingToId(assignmentId);
    try {
      const res = await fetch(`/api/assignments/${assignmentId}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentIds: selectedStudentIds }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add students");
      }

      const data = await res.json();
      toast.success(
        `Added ${data.added} student${data.added !== 1 ? "s" : ""} to assignment`
      );
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      queryClient.invalidateQueries({ queryKey: ["standard-students"] });
      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add students"
      );
    } finally {
      setAddingToId(null);
    }
  };

  // ── Create new assignment ──────────────────────────────────────────────

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error("Assignment name is required");
      return;
    }
    if (!platform) {
      toast.error("Platform is required");
      return;
    }
    if (!selectedRCId) {
      toast.error("Reporting category is required");
      return;
    }
    if (selectedStandardIds.size === 0) {
      toast.error("At least one standard must be selected");
      return;
    }
    if (!selectedTestGroupId || !selectedTestId) {
      toast.error("No test context available");
      return;
    }

    createMutation.mutate(
      {
        name: name.trim(),
        platform,
        rcId: Number(selectedRCId),
        groupId: selectedTestGroupId,
        createdAfterTestId: selectedTestId,
        impactedTestId: nextTest?.id ?? selectedTestId,
        standardIds: Array.from(selectedStandardIds),
        studentIds: selectedStudentIds,
      },
      {
        onSuccess: () => {
          toast.success(
            `Assignment '${name.trim()}' created with ${selectedStudentIds.length} students`
          );
          resetForm();
          onOpenChange(false);
          onSuccess();
        },
        onError: (error) => {
          toast.error(error.message || "Failed to create assignment");
        },
      }
    );
  };

  const isValid =
    name.trim() &&
    platform &&
    selectedRCId &&
    selectedStandardIds.size > 0 &&
    selectedStudentIds.length > 0;

  const existingAssignments = useMemo(() => {
    let filtered = assignments ?? [];
    if (filterStandardCode) {
      filtered = filtered.filter((a) => a.standards.includes(filterStandardCode));
    }
    if (selectedTestId) {
      filtered = filtered.filter((a) => a.createdAfterTestId === selectedTestId);
    }
    return filtered;
  }, [assignments, filterStandardCode, selectedTestId]);

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        side="right"
        className="w-[500px] sm:max-w-[500px] overflow-y-auto"
      >
        {mode === "choose" ? (
          <>
            <SheetHeader>
              <SheetTitle>Assign Students</SheetTitle>
              <SheetDescription>
                Add {selectedStudentIds.length} student
                {selectedStudentIds.length !== 1 ? "s" : ""} to an existing
                assignment or create a new one.
                {filterStandardCode && (
                  <>
                    {" "}Showing assignments aligned to{" "}
                    <span className="font-mono font-medium">{filterStandardCode}</span>.
                  </>
                )}
              </SheetDescription>
            </SheetHeader>

            <div className="py-6 space-y-4">
              {/* Create New button */}
              <Button
                variant="outline"
                className="w-full justify-start gap-2 h-auto py-3"
                onClick={() => setMode("create")}
              >
                <Plus className="h-5 w-5 text-primary" />
                <div className="text-left">
                  <p className="font-medium">Create New Assignment</p>
                  <p className="text-xs text-muted-foreground">
                    Set up a new assignment with platform, standards, and
                    students
                  </p>
                </div>
              </Button>

              {existingAssignments.length > 0 && (
                <>
                  <div className="flex items-center gap-2">
                    <Separator className="flex-1" />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      or add to existing
                    </span>
                    <Separator className="flex-1" />
                  </div>

                  <div className="space-y-2">
                    {existingAssignments.map((a) => (
                      <div
                        key={a.id}
                        className="border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">
                              {a.name}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-muted-foreground">
                                {PLATFORM_LABELS[a.platform] ?? a.platform}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                •
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {a.rcName}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <Users className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {a.totalStudents} student
                                {a.totalStudents !== 1 ? "s" : ""}
                              </span>
                              {a.standards.length > 0 && (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] px-1.5 py-0"
                                >
                                  {a.standards.length} std
                                  {a.standards.length !== 1 ? "s" : ""}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={addingToId === a.id}
                            onClick={() => handleAddToExisting(a.id)}
                          >
                            {addingToId === a.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Add"
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <>
            <SheetHeader>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => setMode("choose")}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <SheetTitle>New Assignment</SheetTitle>
                  <SheetDescription>
                    Create an assignment for {selectedStudentIds.length} selected
                    student{selectedStudentIds.length !== 1 ? "s" : ""}.
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <div className="space-y-5 py-6 px-1">
              {/* Assignment Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Assignment Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Fractions Practice Week 3"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              {/* Platform */}
              <div className="space-y-2">
                <Label>Platform *</Label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Reporting Category */}
              <div className="space-y-2">
                <Label>Reporting Category *</Label>
                <Select value={selectedRCId} onValueChange={handleRCChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select reporting category" />
                  </SelectTrigger>
                  <SelectContent>
                    {reportingCategories?.map((rc) => (
                      <SelectItem key={rc.id} value={String(rc.id)}>
                        {rc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Domain */}
              {selectedRCId && domains.length > 0 && (
                <div className="space-y-2">
                  <Label>Domain *</Label>
                  <Select
                    value={selectedDomain}
                    onValueChange={handleDomainChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select domain" />
                    </SelectTrigger>
                    <SelectContent>
                      {domains.map((d) => (
                        <SelectItem key={d.name} value={d.name}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Sub-Domain */}
              {selectedDomain && subDomains.length > 1 && (
                <div className="space-y-2">
                  <Label>Sub-Domain</Label>
                  <Select
                    value={selectedSubDomain}
                    onValueChange={handleSubDomainChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All sub-domains" />
                    </SelectTrigger>
                    <SelectContent>
                      {subDomains.map((sd) => (
                        <SelectItem key={sd.name} value={sd.name}>
                          {sd.name || "General"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Standards */}
              {filteredStandards.length > 0 && (
                <div className="space-y-2">
                  <Label>
                    Standards * ({selectedStandardIds.size} selected)
                  </Label>
                  <div className="max-h-48 overflow-y-auto border rounded-md p-3 space-y-2">
                    {filteredStandards.map((std) => (
                      <div key={std.id} className="flex items-start space-x-2">
                        <Checkbox
                          id={`std-${std.id}`}
                          checked={selectedStandardIds.has(std.id)}
                          onCheckedChange={() => toggleStandard(std.id)}
                          className="mt-0.5"
                        />
                        <label
                          htmlFor={`std-${std.id}`}
                          className="text-sm cursor-pointer leading-tight"
                        >
                          <span className="font-mono font-medium">
                            {std.code}
                          </span>
                          <span className="text-muted-foreground ml-1">
                            —{" "}
                            {std.description.length > 80
                              ? std.description.slice(0, 80) + "…"
                              : std.description}
                          </span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Selected Students */}
              <div className="space-y-2">
                <Label>Selected Students</Label>
                <div
                  className="border rounded-md p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setShowStudents(!showStudents)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm">
                      {selectedStudentIds.length} student
                      {selectedStudentIds.length !== 1 ? "s" : ""} selected
                    </span>
                    {showStudents ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </div>

              {/* Test Context */}
              <div className="space-y-2">
                <Label>Test Context</Label>
                <div className="border rounded-md p-3 space-y-1 text-sm text-muted-foreground">
                  <p>
                    Created after:{" "}
                    <span className="font-medium text-foreground">
                      {currentTest?.name ?? "—"}
                    </span>
                  </p>
                  <p>
                    Expected impact:{" "}
                    <span className="font-medium text-foreground">
                      {nextTest?.name ?? currentTest?.name ?? "—"}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <SheetFooter className="px-1">
              <div className="flex gap-3 w-full">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleClose}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSubmit}
                  disabled={!isValid || createMutation.isPending}
                >
                  {createMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Create Assignment
                </Button>
              </div>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
