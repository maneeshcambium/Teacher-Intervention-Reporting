"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateAssignmentInput, CreateAssignmentResponse } from "@/types";

export function useCreateAssignment() {
  const queryClient = useQueryClient();

  return useMutation<CreateAssignmentResponse, Error, CreateAssignmentInput>({
    mutationFn: async (input) => {
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create assignment");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
  });
}
