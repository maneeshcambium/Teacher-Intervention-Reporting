"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  Cell,
  LabelList,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import type { StandardImpactResult, StandardDiDResult } from "@/types";

// ──────────────────────────────────────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────────────────────────────────────

interface StandardImpactBreakdownProps {
  data: StandardImpactResult | null;
  isLoading: boolean;
}

export function StandardImpactBreakdown({
  data,
  isLoading,
}: StandardImpactBreakdownProps) {
  if (isLoading) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <Skeleton className="h-6 w-72" />
          <Skeleton className="h-4 w-96 mt-1" />
        </CardHeader>
        <CardContent className="space-y-6">
          <Skeleton className="h-[250px] w-full" />
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  // Edge case: all standards have 0 treated count
  const allEmpty = data.standards.every((s) => s.treatedCount === 0);

  const overallColor = data.overallDidImpact >= 0 ? "text-green-600" : "text-red-600";
  const overallSign = data.overallDidImpact >= 0 ? "+" : "";

  return (
    <Card className="col-span-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">
              Standard-Level Impact: {data.assignmentName}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              DiD impact broken down by each targeted standard &bull; Overall:{" "}
              <span className={`font-semibold ${overallColor}`}>
                {overallSign}{data.overallDidImpact} pts
              </span>
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {allEmpty ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No students have completed this assignment yet.
          </p>
        ) : (
          <>
            <StandardImpactChart
              standards={data.standards}
              overallDidImpact={data.overallDidImpact}
            />
            <StandardImpactTable
              standards={data.standards}
              preTestName={data.preTestName}
              postTestName={data.postTestName}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Chart
// ──────────────────────────────────────────────────────────────────────────────

interface StandardImpactChartProps {
  standards: StandardDiDResult[];
  overallDidImpact: number;
}

const formatDidLabel = (val: string | number | boolean | null | undefined) => {
  const n = Number(val);
  return `${n >= 0 ? "+" : ""}${n}`;
};

function StandardImpactChart({ standards, overallDidImpact }: StandardImpactChartProps) {
  const chartData = standards.map((s) => ({
    code: s.code,
    didImpact: s.didImpact,
    description: s.description,
    treatedPreAvg: s.treatedPreAvg,
    treatedPostAvg: s.treatedPostAvg,
    treatedDelta: s.treatedDelta,
    controlPreAvg: s.controlPreAvg,
    controlPostAvg: s.controlPostAvg,
    controlDelta: s.controlDelta,
    pValue: s.pValue,
    isSignificant: s.isSignificant,
  }));

  const chartHeight = Math.max(200, standards.length * 50);

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 80, right: 40 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis
          type="number"
          label={{ value: "DiD Impact (pts)", position: "bottom", offset: 0 }}
        />
        <YAxis
          type="category"
          dataKey="code"
          width={75}
          tick={{ fontSize: 12 }}
        />
        <ReferenceLine x={0} stroke="#6b7280" strokeDasharray="3 3" />
        <ReferenceLine
          x={overallDidImpact}
          stroke="#3b82f6"
          strokeDasharray="5 5"
          label={{
            value: `Overall: ${overallDidImpact >= 0 ? "+" : ""}${overallDidImpact}`,
            position: "top",
            fill: "#3b82f6",
            fontSize: 11,
          }}
        />
        <Bar dataKey="didImpact" radius={[0, 4, 4, 0]}>
          {chartData.map((entry, index) => (
            <Cell
              key={index}
              fill={entry.didImpact >= 0 ? "#16a34a" : "#dc2626"}
            />
          ))}
          <LabelList
            dataKey="didImpact"
            position="right"
            fontSize={11}
            formatter={formatDidLabel}
          />
        </Bar>
        <Tooltip content={<StandardImpactTooltip />} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Custom Tooltip for Chart
// ──────────────────────────────────────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
function StandardImpactTooltip({ active, payload }: any) {
  if (!active || !payload || payload.length === 0) return null;

  const d = payload[0].payload;

  return (
    <div className="rounded-md border bg-background p-3 shadow-md text-sm max-w-xs">
      <p className="font-semibold">
        {d.code} — {d.description}
      </p>
      <hr className="my-1.5 border-border" />
      <p>
        Treated: {d.treatedPreAvg} → {d.treatedPostAvg}{" "}
        <span className={d.treatedDelta >= 0 ? "text-green-600" : "text-red-600"}>
          ({d.treatedDelta >= 0 ? "+" : ""}
          {d.treatedDelta})
        </span>
      </p>
      <p>
        Control: {d.controlPreAvg} → {d.controlPostAvg}{" "}
        <span className={d.controlDelta >= 0 ? "text-green-600" : "text-red-600"}>
          ({d.controlDelta >= 0 ? "+" : ""}
          {d.controlDelta})
        </span>
      </p>
      <p className="font-semibold mt-1">
        DiD Impact:{" "}
        <span className={d.didImpact >= 0 ? "text-green-600" : "text-red-600"}>
          {d.didImpact >= 0 ? "+" : ""}
          {d.didImpact} pts
        </span>
      </p>
      <p className="text-muted-foreground">
        p = {d.pValue != null ? d.pValue.toFixed(3) : "—"}{" "}
        {d.isSignificant ? "✓" : ""}
      </p>
    </div>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ──────────────────────────────────────────────────────────────────────────────
// Table
// ──────────────────────────────────────────────────────────────────────────────

interface StandardImpactTableProps {
  standards: StandardDiDResult[];
  preTestName: string;
  postTestName: string;
}

function StandardImpactTable({
  standards,
  preTestName,
  postTestName,
}: StandardImpactTableProps) {
  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">
        Detail: {preTestName} → {postTestName}
      </h3>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Standard</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Treated Δ</TableHead>
              <TableHead className="text-right">Control Δ</TableHead>
              <TableHead className="text-right font-bold">DiD Impact</TableHead>
              <TableHead className="text-right">p-value</TableHead>
              <TableHead className="text-center w-[50px]">Sig?</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {standards.map((s) => (
              <TableRow key={s.standardId}>
                <TableCell className="font-mono text-xs font-medium">
                  {s.code}
                </TableCell>
                <TableCell className="max-w-[240px]">
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <span className="text-sm truncate block cursor-default">
                        {s.description}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-sm">
                      {s.description}
                    </TooltipContent>
                  </UITooltip>
                </TableCell>
                <TableCell className="text-right">
                  <span
                    className={
                      s.treatedDelta >= 0 ? "text-green-600" : "text-red-600"
                    }
                  >
                    {s.treatedDelta >= 0 ? "+" : ""}
                    {s.treatedDelta}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <span
                    className={
                      s.controlDelta >= 0 ? "text-green-600" : "text-red-600"
                    }
                  >
                    {s.controlDelta >= 0 ? "+" : ""}
                    {s.controlDelta}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <span
                    className={`font-bold text-base ${
                      s.didImpact >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {s.didImpact >= 0 ? "+" : ""}
                    {s.didImpact}
                  </span>
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums">
                  {s.pValue != null ? s.pValue.toFixed(3) : "—"}
                </TableCell>
                <TableCell className="text-center">
                  {s.isSignificant ? (
                    <span className="text-green-600 font-semibold">✓</span>
                  ) : (
                    <span className="text-muted-foreground">✗</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
