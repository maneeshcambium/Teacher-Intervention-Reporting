"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowLeft, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import type { StudentDetail } from "@/types";

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

interface StudentHeaderProps {
  student: StudentDetail;
}

export function StudentHeader({ student }: StudentHeaderProps) {
  const latestScore = student.scores[student.scores.length - 1];
  const earliestScore = student.scores[0];
  const currentLevel = latestScore?.level ?? 0;
  const levelColor = LEVEL_COLORS[currentLevel] || "#6B7280";
  const levelName = LEVEL_NAMES[currentLevel] || `Level ${currentLevel}`;

  // Trend: compare earliest to latest level
  let trendLabel = "Stable";
  let trendColor = "text-gray-500";
  let TrendIcon = ArrowRight;
  let trendTooltip = "Performance level unchanged between first and latest test";
  if (student.scores.length > 1 && earliestScore && latestScore) {
    if (latestScore.level > earliestScore.level) {
      trendLabel = "Improved";
      trendColor = "text-green-600";
      TrendIcon = TrendingUp;
      trendTooltip = "Performance level improved from first to latest test";
    } else if (latestScore.level < earliestScore.level) {
      trendLabel = "Declined";
      trendColor = "text-red-600";
      TrendIcon = TrendingDown;
      trendTooltip = "Performance level dropped from first to latest test";
    }
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard" className="hover:text-foreground transition-colors">
          Dashboard
        </Link>
        <span>/</span>
        <span>{student.rosterName}</span>
        <span>/</span>
        <span className="text-foreground">{student.name}</span>
      </nav>

      {/* Back + Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold">{student.name}</h1>
          <p className="text-muted-foreground">{student.rosterName}</p>
        </div>

        <div className="flex items-center gap-3">
          {student.scores.length > 1 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={`flex items-center gap-1.5 cursor-help ${trendColor}`}>
                  <TrendIcon className="h-5 w-5" />
                  <span className="text-sm font-medium">{trendLabel}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[240px]">
                <p>{trendTooltip}</p>
              </TooltipContent>
            </Tooltip>
          )}
          <Badge
            className="text-base px-4 py-1.5"
            style={{
              borderColor: levelColor,
              color: levelColor,
              backgroundColor: `${levelColor}15`,
            }}
            variant="outline"
          >
            {levelName}
          </Badge>
        </div>
      </div>
    </div>
  );
}
