"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface SimulateSyncResult {
  success: boolean;
  assignments: Array<{
    assignmentId: number;
    assignmentName: string;
    changed: {
      completed: number;
      started: number;
      unchanged: number;
    };
  }>;
  totalUpdated: number;
}

export function SimulateSyncButton() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleSync = async () => {
    setConfirmOpen(false);
    setIsLoading(true);

    try {
      const res = await fetch("/api/simulate-sync", {
        method: "POST",
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Sync failed");
      }

      const data: SimulateSyncResult = await res.json();

      toast.success(
        `Updated ${data.totalUpdated} students across ${data.assignments.length} assignments`
      );

      // Invalidate relevant queries so the UI refreshes
      await queryClient.invalidateQueries({ queryKey: ["assignments"] });
      await queryClient.invalidateQueries({ queryKey: ["students"] });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Simulate sync failed"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setConfirmOpen(true)}
        disabled={isLoading}
      >
        <RefreshCw
          className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
        />
        {isLoading ? "Syncing..." : "Simulate External Sync"}
      </Button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Simulate External Sync</DialogTitle>
            <DialogDescription>
              This will simulate external platform callbacks, randomly completing
              and starting assignments. Continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSync}>Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
