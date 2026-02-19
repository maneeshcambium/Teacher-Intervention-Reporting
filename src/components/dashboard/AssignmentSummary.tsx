"use client";

import { useState } from "react";
import { useAppContext } from "@/hooks/useAppContext";
import { useAssignments } from "@/hooks/useAssignments";
import { useDeleteAssignment } from "@/hooks/useDeleteAssignment";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Trash2, Loader2, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import type { AssignmentListItem } from "@/types";

const PLATFORM_COLORS: Record<string, string> = {
  ixl: "bg-purple-100 text-purple-800 border-purple-200",
  khan_academy: "bg-green-100 text-green-800 border-green-200",
  reflex: "bg-blue-100 text-blue-800 border-blue-200",
  lexiacore5: "bg-orange-100 text-orange-800 border-orange-200",
};

const PLATFORM_LABELS: Record<string, string> = {
  ixl: "IXL",
  khan_academy: "Khan Academy",
  reflex: "Reflex",
  lexiacore5: "LexiaCore5",
};

export function AssignmentSummary() {
  const { selectedTestGroupId } = useAppContext();
  const { data: assignments, isLoading } = useAssignments(selectedTestGroupId);
  const deleteMutation = useDeleteAssignment();
  const [deleteTarget, setDeleteTarget] = useState<AssignmentListItem | null>(null);

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success(`Assignment "${deleteTarget.name}" deleted`);
        setDeleteTarget(null);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete assignment");
      },
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <CardTitle>Active Assignments</CardTitle>
            {assignments && assignments.length > 0 && (
              <Badge variant="secondary">{assignments.length}</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !assignments || assignments.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No assignments yet</h3>
              <p className="text-muted-foreground">Select students from the table above and create an assignment</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Assignment Name</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Standards</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead className="text-center">Not Started</TableHead>
                    <TableHead className="text-center">Started</TableHead>
                    <TableHead className="text-center">Completed</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((assignment) => (
                    <AssignmentRow
                      key={assignment.id}
                      assignment={assignment}
                      onDelete={() => setDeleteTarget(assignment)}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Assignment</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.name}&quot;? This will remove all
              student assignments and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function StatusCell({
  count,
  total,
  color,
}: {
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <TableCell className="text-center">
      <div className="relative">
        <div className="absolute inset-0 rounded" style={{ opacity: 0.1, backgroundColor: color }} />
        <div
          className="absolute left-0 top-0 bottom-0 rounded transition-all duration-700 ease-in-out"
          style={{
            width: `${pct}%`,
            opacity: 0.2,
            backgroundColor: color,
          }}
        />
        <span className="relative text-sm font-medium transition-all duration-500">{count}</span>
      </div>
    </TableCell>
  );
}

function AssignmentRow({
  assignment,
  onDelete,
}: {
  assignment: AssignmentListItem;
  onDelete: () => void;
}) {
  const platformClass = PLATFORM_COLORS[assignment.platform] || "bg-gray-100 text-gray-800";
  const platformLabel = PLATFORM_LABELS[assignment.platform] || assignment.platform;

  const displayStandards = assignment.standards.slice(0, 3);
  const extraCount = assignment.standards.length - 3;

  return (
    <TableRow>
      <TableCell className="font-medium">{assignment.name}</TableCell>
      <TableCell>
        <Badge variant="outline" className={platformClass}>
          {platformLabel}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1 flex-wrap">
          {displayStandards.map((code) => (
            <Badge key={code} variant="secondary" className="text-xs font-mono">
              {code}
            </Badge>
          ))}
          {extraCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary" className="text-xs cursor-help">
                  +{extraCount} more
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1">
                  {assignment.standards.slice(3).map((code) => (
                    <div key={code} className="font-mono text-xs">
                      {code}
                    </div>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </TableCell>
      <TableCell className="text-center font-medium">
        {assignment.totalStudents}
      </TableCell>
      <StatusCell count={assignment.notStarted} total={assignment.totalStudents} color="#6B7280" />
      <StatusCell count={assignment.started} total={assignment.totalStudents} color="#EAB308" />
      <StatusCell count={assignment.completed} total={assignment.totalStudents} color="#22C55E" />
      <TableCell>
        <Button variant="ghost" size="icon" onClick={onDelete} className="h-8 w-8 text-muted-foreground hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
