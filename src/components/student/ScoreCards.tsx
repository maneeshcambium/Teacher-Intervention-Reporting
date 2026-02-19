"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { StudentTestScore } from "@/types";

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

const SCORE_MIN = 5100;
const SCORE_MAX = 5800;

interface ScoreCardsProps {
  scores: StudentTestScore[];
}

export function ScoreCards({ scores }: ScoreCardsProps) {
  // Determine grid columns based on number of tests
  const colsClass =
    scores.length <= 3
      ? "grid-cols-3"
      : scores.length <= 4
        ? "grid-cols-4"
        : scores.length <= 5
          ? "grid-cols-5"
          : "grid-cols-6";

  return (
    <div className={`grid ${colsClass} gap-4`}>
      {scores.map((score, idx) => {
        const levelColor = LEVEL_COLORS[score.level] || "#6B7280";
        const levelName = LEVEL_NAMES[score.level] || `Level ${score.level}`;
        const barPercent =
          ((score.overallScore - SCORE_MIN) / (SCORE_MAX - SCORE_MIN)) * 100;

        // Delta from previous test
        const prevScore = idx > 0 ? scores[idx - 1] : null;
        const delta = prevScore
          ? score.overallScore - prevScore.overallScore
          : null;

        return (
          <Card key={score.testId}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">
                  {score.testName}
                </CardTitle>
                {score.administeredAt && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(score.administeredAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Hero score */}
              <div className="text-4xl font-bold tabular-nums">
                {score.overallScore}
              </div>

              {/* Level badge */}
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

              {/* Mini bar */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="h-2 w-full rounded-full bg-gray-200 cursor-help">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: `${Math.min(Math.max(barPercent, 0), 100)}%`,
                        backgroundColor: levelColor,
                      }}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>{score.overallScore} on a {SCORE_MIN}–{SCORE_MAX} scale ({Math.round(barPercent)}%)</p>
                </TooltipContent>
              </Tooltip>

              {/* Delta */}
              {delta !== null && (
                <div
                  className={`text-sm font-medium ${
                    delta > 0
                      ? "text-green-600"
                      : delta < 0
                        ? "text-red-600"
                        : "text-gray-500"
                  }`}
                >
                  {delta > 0 ? "+" : ""}
                  {delta} pts from {prevScore!.testName}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
