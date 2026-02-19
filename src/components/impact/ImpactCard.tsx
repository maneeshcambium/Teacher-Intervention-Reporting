"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  ResponsiveContainer,
} from "recharts";
import { ArrowUp, ArrowDown, BarChart3 } from "lucide-react";
import type { ImpactResult } from "@/types";

const platformColors: Record<string, string> = {
  ixl: "bg-blue-100 text-blue-800",
  khan_academy: "bg-green-100 text-green-800",
  lexiacore5: "bg-purple-100 text-purple-800",
  reflex: "bg-orange-100 text-orange-800",
};

const platformLabels: Record<string, string> = {
  ixl: "IXL",
  khan_academy: "Khan Academy",
  lexiacore5: "Lexia Core5",
  reflex: "Reflex",
};

interface ImpactCardsProps {
  impacts: ImpactResult[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

export function ImpactCards({ impacts, selectedId, onSelect }: ImpactCardsProps) {
  if (impacts.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No impact data available</h3>
            <p className="text-muted-foreground">Impact analysis requires completed assignments with post-test scores</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {impacts.map((impact) => (
        <ImpactCard
          key={impact.assignmentId}
          impact={impact}
          isSelected={selectedId === impact.assignmentId}
          onClick={() => onSelect(impact.assignmentId)}
        />
      ))}
    </div>
  );
}

function ImpactCard({
  impact,
  isSelected,
  onClick,
}: {
  impact: ImpactResult;
  isSelected: boolean;
  onClick: () => void;
}) {
  const isPositive = impact.didImpact >= 0;
  const sparkData = [
    {
      treated: impact.treatedPreAvg,
      control: impact.controlPreAvg,
    },
    {
      treated: impact.treatedPostAvg,
      control: impact.controlPostAvg,
    },
  ];

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        isSelected ? "ring-2 ring-blue-500 shadow-md" : ""
      }`}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium truncate">
            {impact.assignmentName}
          </CardTitle>
          <Badge
            variant="secondary"
            className={platformColors[impact.platform] || ""}
          >
            {platformLabels[impact.platform] || impact.platform}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {impact.preTestName} → {impact.postTestName}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Hero number */}
        <div className="flex items-center gap-2">
          <span
            className={`text-4xl font-bold ${
              isPositive ? "text-green-600" : "text-red-600"
            }`}
          >
            {isPositive ? (
              <ArrowUp className="inline h-6 w-6" />
            ) : (
              <ArrowDown className="inline h-6 w-6" />
            )}
            {isPositive ? "+" : ""}
            {impact.didImpact} pts
          </span>
        </div>

        {/* Significance badge */}
        <div>
          {impact.pValue != null ? (
            impact.isSignificant ? (
              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                p = {impact.pValue.toFixed(3)} ✓
              </Badge>
            ) : (
              <Badge variant="secondary">Not Significant (p = {impact.pValue.toFixed(3)})</Badge>
            )
          ) : (
            <Badge variant="secondary">Not enough data</Badge>
          )}
        </div>

        {/* Per-standard DiD mini-table */}
        {impact.standardImpacts && impact.standardImpacts.length > 0 ? (
          <div className="rounded border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-2 py-1 font-medium">Standard</th>
                  <th className="text-right px-2 py-1 font-medium">Treated Δ</th>
                  <th className="text-right px-2 py-1 font-medium">Ctrl Δ</th>
                  <th className="text-right px-2 py-1 font-medium">DiD</th>
                </tr>
              </thead>
              <tbody>
                {impact.standardImpacts.map((si) => (
                  <tr key={si.code} className="border-b last:border-0">
                    <td className="px-2 py-1 font-mono">{si.code}</td>
                    <td className={`px-2 py-1 text-right ${si.treatedDelta >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {si.treatedDelta >= 0 ? "+" : ""}{si.treatedDelta}
                    </td>
                    <td className={`px-2 py-1 text-right ${si.controlDelta >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {si.controlDelta >= 0 ? "+" : ""}{si.controlDelta}
                    </td>
                    <td className={`px-2 py-1 text-right font-bold ${si.didImpact >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {si.didImpact >= 0 ? "+" : ""}{si.didImpact}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-wrap gap-1">
            {impact.standards.map((std) => (
              <Badge key={std} variant="outline" className="text-xs">
                {std}
              </Badge>
            ))}
          </div>
        )}

        {/* Mini comparison */}
        <div className="text-xs text-muted-foreground space-y-0.5">
          <div className="flex justify-between">
            <span className="text-green-700 font-medium">Treated:</span>
            <span>
              {impact.treatedPreAvg} → {impact.treatedPostAvg}{" "}
              <span className={impact.treatedDelta >= 0 ? "text-green-600" : "text-red-600"}>
                ({impact.treatedDelta >= 0 ? "+" : ""}{impact.treatedDelta})
              </span>
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 font-medium">Control:</span>
            <span>
              {impact.controlPreAvg} → {impact.controlPostAvg}{" "}
              <span className={impact.controlDelta >= 0 ? "text-green-600" : "text-red-600"}>
                ({impact.controlDelta >= 0 ? "+" : ""}{impact.controlDelta})
              </span>
            </span>
          </div>
        </div>

        {/* Sparkline */}
        <div className="h-12">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparkData}>
              <Line
                type="linear"
                dataKey="treated"
                stroke="#16a34a"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="linear"
                dataKey="control"
                stroke="#9ca3af"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Sample sizes */}
        <div className="text-xs text-muted-foreground flex justify-between">
          <span>n(treated) = {impact.treatedCount}</span>
          <span>n(control) = {impact.controlCount}</span>
        </div>
      </CardContent>
    </Card>
  );
}
