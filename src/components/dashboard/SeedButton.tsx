"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Database, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function SeedButton() {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleSeed = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Seed failed");
      }
      const data = await res.json();
      toast.success(`Database seeded successfully in ${data.elapsed}`);

      // Invalidate all queries to refresh the UI
      await queryClient.invalidateQueries();
      // Reload the page to re-init context (rosters, test groups)
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Seed failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleSeed} disabled={isLoading}>
      {isLoading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Database className="mr-2 h-4 w-4" />
      )}
      {isLoading ? "Seeding..." : "Seed Data"}
    </Button>
  );
}
