"use client";

import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";

type QueryType =
  | "worst_despite_completing"
  | "biggest_score_drops"
  | "biggest_score_gains"
  | "level_changes"
  | "unassigned_struggling"
  | "assignment_completion_rates"
  | "performance_distribution"
  | "weakest_standards"
  | "best_assignment_impact"
  | "students_by_standard";

interface AskParams {
  query: QueryType;
  rosterId: number;
  testId: number;
  testId2?: number;
  standardId?: number;
  limit?: number;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

async function postAsk(params: AskParams): Promise<string> {
  const res = await fetch("/api/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    throw new Error("Failed to run query");
  }
  const data = await res.json();
  return data.answer;
}

export function useAsk() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const mutation = useMutation({
    mutationFn: postAsk,
    onSuccess: (answer) => {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: answer,
          timestamp: new Date(),
        },
      ]);
    },
    onError: (error) => {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Error: ${error.message}`,
          timestamp: new Date(),
        },
      ]);
    },
  });

  const ask = useCallback(
    (label: string, params: AskParams) => {
      // Add user message
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "user",
          content: label,
          timestamp: new Date(),
        },
      ]);
      mutation.mutate(params);
    },
    [mutation]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    ask,
    clearMessages,
    isLoading: mutation.isPending,
  };
}

export type { QueryType, AskParams, ChatMessage };
