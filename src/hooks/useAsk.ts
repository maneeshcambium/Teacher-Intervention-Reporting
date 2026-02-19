"use client";

import { useState, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

type AskMode = "canned" | "ai";

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

interface CannedAskParams {
  mode?: "canned";
  query: QueryType;
  rosterId: number;
  testId: number;
  testId2?: number;
  standardId?: number;
  limit?: number;
}

interface AiAskParams {
  mode: "ai";
  message: string;
  rosterId: number;
  testId: number;
  testId2?: number;
  rosterName?: string;
  testName?: string;
  compareTestName?: string;
}

type AskParams = CannedAskParams | AiAskParams;

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
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to run query");
  }
  const data = await res.json();
  return data.answer;
}

async function checkAiAvailable(): Promise<boolean> {
  try {
    const res = await fetch("/api/ask");
    if (!res.ok) return false;
    const data = await res.json();
    return data.aiAvailable === true;
  } catch {
    return false;
  }
}

export function useAsk() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Check if AI mode is available (OpenAI key configured)
  const { data: aiAvailable = false } = useQuery({
    queryKey: ["ask-ai-available"],
    queryFn: checkAiAvailable,
    staleTime: 60_000, // recheck every minute
  });

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

  /** Send a canned query (pre-defined query card) */
  const askCanned = useCallback(
    (label: string, params: CannedAskParams) => {
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

  /** Send a free-text AI query via LLM + MCP */
  const askAi = useCallback(
    (message: string, context: Omit<AiAskParams, "mode" | "message">) => {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "user",
          content: message,
          timestamp: new Date(),
        },
      ]);
      mutation.mutate({ mode: "ai", message, ...context });
    },
    [mutation]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    askCanned,
    askAi,
    clearMessages,
    isLoading: mutation.isPending,
    aiAvailable,
  };
}

export type { AskMode, QueryType, CannedAskParams, AiAskParams, AskParams, ChatMessage };
