"use client";

import { useAppContext } from "@/hooks/useAppContext";
import { useRCBreakdown } from "@/hooks/useRCBreakdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

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

interface RCBreakdownProps {
  selectedRC: number | null;
  onRCSelect: (rcId: number | null) => void;
}

export function RCBreakdown({ selectedRC, onRCSelect }: RCBreakdownProps) {
  const { selectedRosterId, selectedTestId } = useAppContext();
  const { data, isLoading } = useRCBreakdown(selectedRosterId, selectedTestId);

  const handleBarClick = (rcId: number) => {
    if (selectedRC === rcId) {
      onRCSelect(null);
    } else {
      onRCSelect(rcId);
    }
  };

  // Transform data for Recharts grouped bar chart
  const chartData = data?.categories.map((cat) => {
    const entry: Record<string, string | number> = {
      name: cat.rcName,
      rcId: cat.rcId,
    };
    for (const bl of cat.byLevel) {
      entry[`L${bl.level}`] = bl.avgScore;
    }
    return entry;
  }) ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reporting Category Breakdown</CardTitle>
        <p className="text-sm text-muted-foreground">
          Average scale scores by performance level
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={chartData}
              onClick={(e: Record<string, unknown> | null) => {
                const payload = (e as { activePayload?: Array<{ payload?: { rcId?: number } }> })?.activePayload;
                if (payload?.[0]?.payload?.rcId) {
                  handleBarClick(payload[0].payload.rcId);
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
                interval={0}
                angle={-15}
                textAnchor="end"
                height={60}
              />
              <YAxis
                domain={[5100, 5800]}
                tick={{ fontSize: 11 }}
                label={{
                  value: "Scale Score",
                  angle: -90,
                  position: "insideLeft",
                  style: { fontSize: 12 },
                }}
              />
              <Tooltip
                formatter={(value: unknown, name?: string) => {
                  const levelNum = parseInt((name ?? "").replace("L", ""));
                  return [String(value), LEVEL_NAMES[levelNum] || name || ""];
                }}
              />
              <Legend
                formatter={(value: string) => {
                  const levelNum = parseInt(value.replace("L", ""));
                  return LEVEL_NAMES[levelNum] || value;
                }}
              />
              {[1, 2, 3, 4].map((level) => (
                <Bar
                  key={level}
                  dataKey={`L${level}`}
                  fill={LEVEL_COLORS[level]}
                  cursor="pointer"
                  opacity={selectedRC != null ? 0.6 : 1}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-muted-foreground">
            No reporting category data available.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
