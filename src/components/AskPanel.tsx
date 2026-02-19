"use client";

import { useRef, useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAppContext } from "@/hooks/useAppContext";
import { useAsk, type AskMode, type QueryType } from "@/hooks/useAsk";
import {
  MessageSquare,
  TrendingDown,
  TrendingUp,
  ArrowUpDown,
  UserX,
  ClipboardList,
  BarChart3,
  Target,
  Award,
  Loader2,
  Trash2,
  Sparkles,
  Send,
  Bot,
  Zap,
} from "lucide-react";

// ─── Query card definitions ────────────────────────────────────────────────

interface QueryCard {
  id: QueryType;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  needsTestId2: boolean;
}

const QUERY_CARDS: QueryCard[] = [
  {
    id: "worst_despite_completing",
    label: "Worst Despite Completing",
    description: "Students who completed assignments but still score lowest",
    icon: <UserX className="h-4 w-4" />,
    color: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100",
    needsTestId2: false,
  },
  {
    id: "unassigned_struggling",
    label: "Struggling Without Help",
    description: "Low-performing students (Level 1–2) with no assignments",
    icon: <Target className="h-4 w-4" />,
    color: "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100",
    needsTestId2: false,
  },
  {
    id: "biggest_score_drops",
    label: "Biggest Score Drops",
    description: "Students whose scores decreased between two tests",
    icon: <TrendingDown className="h-4 w-4" />,
    color: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100",
    needsTestId2: true,
  },
  {
    id: "biggest_score_gains",
    label: "Biggest Score Gains",
    description: "Students whose scores increased the most",
    icon: <TrendingUp className="h-4 w-4" />,
    color: "bg-green-50 text-green-700 border-green-200 hover:bg-green-100",
    needsTestId2: true,
  },
  {
    id: "level_changes",
    label: "Level Changes",
    description: "Students who changed performance levels between tests",
    icon: <ArrowUpDown className="h-4 w-4" />,
    color: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
    needsTestId2: true,
  },
  {
    id: "assignment_completion_rates",
    label: "Completion Rates",
    description: "Assignment completion rates ranked by least complete",
    icon: <ClipboardList className="h-4 w-4" />,
    color: "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100",
    needsTestId2: false,
  },
  {
    id: "performance_distribution",
    label: "Performance Breakdown",
    description: "How many students at each performance level",
    icon: <BarChart3 className="h-4 w-4" />,
    color: "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100",
    needsTestId2: false,
  },
  {
    id: "weakest_standards",
    label: "Weakest Standards",
    description: "Standards with highest % below proficiency",
    icon: <Target className="h-4 w-4" />,
    color: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
    needsTestId2: false,
  },
  {
    id: "best_assignment_impact",
    label: "Best Assignment Impact",
    description: "Which assignments had the biggest positive DiD effect",
    icon: <Award className="h-4 w-4" />,
    color: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
    needsTestId2: false,
  },
];

// ─── Markdown-lite renderer ────────────────────────────────────────────────

function renderMarkdownLite(text: string) {
  // Split by lines and render basic markdown
  const lines = text.split("\n");
  return lines.map((line, i) => {
    // Bold
    const rendered = line.replace(
      /\*\*(.+?)\*\*/g,
      '<strong class="font-semibold">$1</strong>'
    );

    // Bullet points
    if (line.startsWith("• ") || line.startsWith("- ")) {
      return (
        <div
          key={i}
          className="pl-2 py-0.5 text-sm"
          dangerouslySetInnerHTML={{ __html: rendered }}
        />
      );
    }

    // Numbered items
    if (/^\d+\.\s/.test(line)) {
      return (
        <div
          key={i}
          className="pl-2 py-0.5 text-sm"
          dangerouslySetInnerHTML={{ __html: rendered }}
        />
      );
    }

    // Italic hint lines
    if (line.startsWith("_") && line.endsWith("_")) {
      return (
        <p key={i} className="text-xs text-muted-foreground italic mt-1">
          {line.slice(1, -1)}
        </p>
      );
    }

    // Emoji headers (⬇️, ⬆️)
    if (line.match(/^[⬇️⬆️✓❌✅🎉📋]/)) {
      return (
        <div
          key={i}
          className="mt-2 text-sm font-medium"
          dangerouslySetInnerHTML={{ __html: rendered }}
        />
      );
    }

    // Empty lines
    if (line.trim() === "") {
      return <div key={i} className="h-1" />;
    }

    // Regular text
    return (
      <div
        key={i}
        className="text-sm"
        dangerouslySetInnerHTML={{ __html: rendered }}
      />
    );
  });
}

// ─── Suggested questions for AI mode ───────────────────────────────────────

const SUGGESTED_QUESTIONS = [
  "Who's struggling the most without any help?",
  "Which students dropped the most between tests?",
  "What assignment had the biggest impact?",
  "Show me the weakest standards",
  "How is my class distributed across performance levels?",
  "Which students completed all assignments but still score low?",
];

// ─── Component ─────────────────────────────────────────────────────────────

interface AskPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AskPanel({ open, onOpenChange }: AskPanelProps) {
  const { selectedRosterId, selectedTestId, tests, rosters } = useAppContext();
  const { messages, askCanned, askAi, clearMessages, isLoading, aiAvailable } = useAsk();
  const [compareTestId, setCompareTestId] = useState<number | null>(null);
  const [mode, setMode] = useState<AskMode>("canned");
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Pre-select second test if there are multiple
  useEffect(() => {
    if (tests.length >= 2 && !compareTestId) {
      const other = tests.find((t) => t.id !== selectedTestId);
      if (other) setCompareTestId(other.id);
    }
  }, [tests, selectedTestId, compareTestId]);

  // Focus input when switching to AI mode
  useEffect(() => {
    if (mode === "ai" && open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [mode, open]);

  const handleCannedQuery = (card: QueryCard) => {
    if (!selectedRosterId || !selectedTestId) return;

    const params = {
      query: card.id,
      rosterId: selectedRosterId,
      testId: selectedTestId,
      ...(card.needsTestId2 && compareTestId ? { testId2: compareTestId } : {}),
    };

    askCanned(card.label, params);
  };

  const handleAiSubmit = () => {
    if (!inputValue.trim() || !selectedRosterId || !selectedTestId) return;

    // Resolve names for context
    const roster = rosters.find((r) => r.id === selectedRosterId);
    const test = tests.find((t) => t.id === selectedTestId);
    const compareTest = compareTestId
      ? tests.find((t) => t.id === compareTestId)
      : undefined;

    askAi(inputValue.trim(), {
      rosterId: selectedRosterId,
      testId: selectedTestId,
      testId2: compareTestId ?? undefined,
      rosterName: roster?.name,
      testName: test?.name,
      compareTestName: compareTest?.name,
    });

    setInputValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAiSubmit();
    }
  };

  const handleSuggestionClick = (question: string) => {
    setInputValue(question);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const canQuery = selectedRosterId && selectedTestId;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg flex flex-col p-0"
      >
        <SheetHeader className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-500" />
              <SheetTitle>Ask About Your Class</SheetTitle>
            </div>
          </div>
          <SheetDescription>
            {mode === "canned"
              ? "Run quick queries about student performance, assignments, and impact."
              : "Ask any question about your students using AI."}
          </SheetDescription>

          {/* Mode toggle */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <Zap className={`h-3.5 w-3.5 ${mode === "canned" ? "text-amber-500" : "text-muted-foreground/40"}`} />
              <Label htmlFor="ask-mode" className="text-xs text-muted-foreground cursor-pointer">
                Quick
              </Label>
              <Switch
                id="ask-mode"
                checked={mode === "ai"}
                onCheckedChange={(checked) => setMode(checked ? "ai" : "canned")}
                disabled={!aiAvailable}
              />
              <Label htmlFor="ask-mode" className="text-xs text-muted-foreground cursor-pointer">
                AI
              </Label>
              <Bot className={`h-3.5 w-3.5 ${mode === "ai" ? "text-blue-500" : "text-muted-foreground/40"}`} />
            </div>
            {!aiAvailable && (
              <span className="text-[10px] text-muted-foreground/60 italic">
                Set OPENAI_API_KEY to enable AI
              </span>
            )}
          </div>
        </SheetHeader>

        <Separator />

        {/* Compare test selector */}
        {tests.length >= 2 && (
          <div className="px-4 py-2 bg-slate-50 border-b">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Compare test:</span>
              <Select
                value={compareTestId ? String(compareTestId) : undefined}
                onValueChange={(val) => setCompareTestId(parseInt(val, 10))}
              >
                <SelectTrigger className="h-7 w-[180px] text-xs">
                  <SelectValue placeholder="Select test" />
                </SelectTrigger>
                <SelectContent>
                  {tests
                    .filter((t) => t.id !== selectedTestId)
                    .map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <span className="text-muted-foreground/60">
                (for score comparisons)
              </span>
            </div>
          </div>
        )}

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No queries yet</p>
              <p className="text-xs mt-1">
                {mode === "canned"
                  ? "Click a query below to get started"
                  : "Type a question or click a suggestion below"}
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`rounded-lg px-3 py-2 max-w-[95%] ${
                msg.role === "user"
                  ? "ml-auto bg-blue-600 text-white text-sm font-medium"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {msg.role === "user" ? (
                msg.content
              ) : (
                <div className="space-y-0.5">
                  {renderMarkdownLite(msg.content)}
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              {mode === "ai" ? "Thinking..." : "Analyzing..."}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <Separator />

        {/* ── Bottom section: mode-dependent ─────────────────────────────── */}
        {mode === "canned" ? (
          /* Canned query cards */
          <div className="px-4 py-3 bg-white border-t space-y-2 max-h-[45%] overflow-y-auto">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Quick Queries
              </p>
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearMessages}
                  className="h-6 text-xs text-muted-foreground"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {QUERY_CARDS.map((card) => {
                const disabled = !canQuery || isLoading || (card.needsTestId2 && !compareTestId);
                return (
                  <button
                    key={card.id}
                    onClick={() => handleCannedQuery(card)}
                    disabled={disabled}
                    className={`flex items-start gap-2 rounded-md border px-2.5 py-2 text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${card.color}`}
                  >
                    <span className="mt-0.5 shrink-0">{card.icon}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium leading-tight">
                        {card.label}
                      </p>
                      <p className="text-[10px] leading-tight opacity-70 mt-0.5 line-clamp-2">
                        {card.description}
                      </p>
                    </div>
                    {card.needsTestId2 && (
                      <Badge
                        variant="outline"
                        className="shrink-0 text-[9px] px-1 py-0 h-4 mt-0.5"
                      >
                        2 tests
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* AI mode: text input + suggestions */
          <div className="px-4 py-3 bg-white border-t space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Ask Anything
              </p>
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearMessages}
                  className="h-6 text-xs text-muted-foreground"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>

            {/* Text input */}
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question about your class..."
                disabled={!canQuery || isLoading}
                rows={2}
                className="flex-1 resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
              <Button
                onClick={handleAiSubmit}
                disabled={!canQuery || isLoading || !inputValue.trim()}
                size="sm"
                className="h-auto px-3"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>

            {/* Suggested questions */}
            {messages.length === 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSuggestionClick(q)}
                    disabled={!canQuery || isLoading}
                    className="text-[11px] px-2 py-1 rounded-full border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
