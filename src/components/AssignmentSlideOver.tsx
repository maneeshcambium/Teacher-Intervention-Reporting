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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAppContext } from "@/hooks/useAppContext";
import { useReportingCategories } from "@/hooks/useReportingCategories";
import { useCreateAssignment } from "@/hooks/useCreateAssignment";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import type { StandardInfo } from "@/types";

const PLATFORMS = [
  { value: "ixl", label: "📘 IXL" },
  { value: "lexiacore5", label: "📙 LexiaCore5" },
  { value: "reflex", label: "📗 Reflex" },
  { value: "khan_academy", label: "📕 Khan Academy" },
];

interface AssignmentSlideOverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedStudentIds: number[];
  onSuccess: () => void;
}

export function AssignmentSlideOver({
  open,
  onOpenChange,
  selectedStudentIds,
  onSuccess,
}: AssignmentSlideOverProps) {
  const { selectedTestGroupId, selectedTestId, tests } = useAppContext();
  const { data: reportingCategories } = useReportingCategories();
  const createMutation = useCreateAssignment();

  const [name, setName] = useState("");
  const [platform, setPlatform] = useState("");
  const [selectedRCId, setSelectedRCId] = useState<string>("");
  const [selectedDomain, setSelectedDomain] = useState<string>("");
  const [selectedSubDomain, setSelectedSubDomain] = useState<string>("");
  const [selectedStandardIds, setSelectedStandardIds] = useState<Set<number>>(new Set());
  const [showStudents, setShowStudents] = useState(false);

  // Determine test context
  const currentTest = tests.find((t) => t.id === selectedTestId);
  const nextTest = tests.find((t) => t.sequence === (currentTest?.sequence ?? 0) + 1);

  // Get domains filtered by selected RC
  const selectedRC = useMemo(() => {
    if (!selectedRCId || !reportingCategories) return null;
    return reportingCategories.find((rc) => rc.id === Number(selectedRCId));
  }, [selectedRCId, reportingCategories]);

  const domains = useMemo(() => {
    return selectedRC?.domains ?? [];
  }, [selectedRC]);

  // Get sub-domains filtered by selected domain
  const selectedDomainObj = useMemo(() => {
    return domains.find((d) => d.name === selectedDomain);
  }, [domains, selectedDomain]);

  const subDomains = useMemo(() => {
    return selectedDomainObj?.subDomains ?? [];
  }, [selectedDomainObj]);

  // Get standards filtered by RC + domain + sub-domain
  const filteredStandards = useMemo(() => {
    if (!selectedDomainObj) return [];

    if (selectedSubDomain) {
      const sub = subDomains.find((s) => s.name === selectedSubDomain);
      return sub?.standards ?? [];
    }

    // All standards across all sub-domains of this domain
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
      if (next.has(stdId)) {
        next.delete(stdId);
      } else {
        next.add(stdId);
      }
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
  };

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
          toast.success(`Assignment '${name.trim()}' created with ${selectedStudentIds.length} students`);
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[500px] sm:max-w-[500px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>New Assignment</SheetTitle>
          <SheetDescription>
            Create an assignment for {selectedStudentIds.length} selected student
            {selectedStudentIds.length !== 1 ? "s" : ""}.
          </SheetDescription>
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
              <Select value={selectedDomain} onValueChange={handleDomainChange}>
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
              <Select value={selectedSubDomain} onValueChange={handleSubDomainChange}>
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
                      <span className="font-mono font-medium">{std.code}</span>
                      <span className="text-muted-foreground ml-1">
                        — {std.description.length > 80
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
              <p>Created after: <span className="font-medium text-foreground">{currentTest?.name ?? "—"}</span></p>
              <p>Expected impact: <span className="font-medium text-foreground">{nextTest?.name ?? currentTest?.name ?? "—"}</span></p>
            </div>
          </div>
        </div>

        <SheetFooter className="px-1">
          <div className="flex gap-3 w-full">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
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
      </SheetContent>
    </Sheet>
  );
}
