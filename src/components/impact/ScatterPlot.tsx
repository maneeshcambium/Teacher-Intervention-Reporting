"use client";

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ImpactResult } from "@/types";

interface ScatterPlotProps {
  impact: ImpactResult | null | undefined;
  isLoading: boolean;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: { studentId: number; pre: number; post: number };
    name: string;
    color: string;
  }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0].payload;
  const gain = data.post - data.pre;
  return (
    <div className="rounded-lg border bg-white px-3 py-2 shadow-md text-xs">
      <p className="font-medium">Student #{data.studentId}</p>
      <p>Pre: {data.pre}</p>
      <p>Post: {data.post}</p>
      <p className={gain >= 0 ? "text-green-600" : "text-red-600"}>
        Gain: {gain >= 0 ? "+" : ""}
        {gain}
      </p>
    </div>
  );
}

export function ScatterPlot({ impact, isLoading }: ScatterPlotProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pre vs Post Scores</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!impact || !impact.treatedPoints || !impact.controlPoints) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pre vs Post Scores</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[400px]">
          <p className="text-muted-foreground">
            Click an impact card to view the scatter plot
          </p>
        </CardContent>
      </Card>
    );
  }

  // Compute axis range from data
  const allPoints = [...impact.treatedPoints, ...impact.controlPoints];
  const allScores = allPoints.flatMap((p) => [p.pre, p.post]);
  const minScore = Math.min(...allScores) - 20;
  const maxScore = Math.max(...allScores) + 20;
  // Round to nearest 50
  const axisMin = Math.floor(minScore / 50) * 50;
  const axisMax = Math.ceil(maxScore / 50) * 50;

  // Reference line data (y = x)
  const refSegment: [{ x: number; y: number }, { x: number; y: number }] = [
    { x: axisMin, y: axisMin },
    { x: axisMax, y: axisMax },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Pre vs Post Scores — {impact.assignmentName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <ScatterChart margin={{ top: 10, right: 30, bottom: 20, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="pre"
              name="Pre Score"
              domain={[axisMin, axisMax]}
              label={{ value: "Pre-Intervention Score", position: "bottom", offset: 5 }}
            />
            <YAxis
              type="number"
              dataKey="post"
              name="Post Score"
              domain={[axisMin, axisMax]}
              label={{
                value: "Post-Intervention Score",
                angle: -90,
                position: "insideLeft",
                offset: 0,
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" />
            {/* Diagonal reference line (y = x) */}
            <ReferenceLine
              segment={refSegment}
              stroke="#9ca3af"
              strokeDasharray="6 4"
              label={{ value: "No Change", position: "end", fill: "#9ca3af", fontSize: 11 }}
            />
            <Scatter
              name="Control"
              data={impact.controlPoints}
              fill="#9ca3af"
              fillOpacity={0.3}
              shape="circle"
            />
            <Scatter
              name="Completed Assignment"
              data={impact.treatedPoints}
              fill="#16a34a"
              fillOpacity={0.7}
              shape="circle"
            />
          </ScatterChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
