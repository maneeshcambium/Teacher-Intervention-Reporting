"use client";

import { useAppContext } from "@/hooks/useAppContext";
import { useRCBreakdown } from "@/hooks/useRCBreakdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
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

const RADIAN = Math.PI / 180;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderCustomLabel(props: any) {
  const cx = props.cx as number;
  const cy = props.cy as number;
  const midAngle = props.midAngle as number;
  const innerRadius = props.innerRadius as number;
  const outerRadius = props.outerRadius as number;
  const percent = props.percent as number;
  const value = props.value as number;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent < 0.08) return null;

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={10}
      fontWeight={600}
    >
      {value}
    </text>
  );
}

export function RCBreakdown({ selectedRC, onRCSelect }: RCBreakdownProps) {
  const { selectedRosterId, selectedTestId } = useAppContext();
  const { data, isLoading } = useRCBreakdown(selectedRosterId, selectedTestId);

  const handleCardClick = (rcId: number) => {
    if (selectedRC === rcId) {
      onRCSelect(null);
    } else {
      onRCSelect(rcId);
    }
  };

  const categories = data?.categories ?? [];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Reporting Category Breakdown</CardTitle>
            <p className="text-sm text-muted-foreground">
              Average scale scores by performance level
            </p>
          </div>
          {/* Shared legend */}
          <div className="flex items-center gap-3 flex-wrap">
            {[1, 2, 3, 4].map((level) => (
              <div key={level} className="flex items-center gap-1">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: LEVEL_COLORS[level] }}
                />
                <span className="text-xs text-muted-foreground">
                  {LEVEL_NAMES[level]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-3">
      {isLoading ? (
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[140px] w-full rounded-lg" />
          ))}
        </div>
      ) : categories.length > 0 ? (
        <div className="grid grid-cols-4 gap-3">
          {categories.map((cat) => {
            const pieData = cat.byLevel.map((bl) => ({
              name: LEVEL_NAMES[bl.level],
              value: bl.avgScore,
              level: bl.level,
            }));

            const total = pieData.reduce((s, d) => s + d.value, 0);

            const isSelected = selectedRC === cat.rcId;

            return (
              <div
                key={cat.rcId}
                className={`cursor-pointer rounded-lg border p-2 transition-all hover:shadow-md ${
                  isSelected
                    ? "ring-2 ring-primary shadow-md"
                    : selectedRC != null
                    ? "opacity-60"
                    : ""
                }`}
                onClick={() => handleCardClick(cat.rcId)}
              >
                <p className="text-xs font-medium text-center leading-tight truncate" title={cat.rcName}>
                  {cat.rcName}
                </p>
                <ResponsiveContainer width="100%" height={110}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={22}
                      outerRadius={45}
                      dataKey="value"
                      labelLine={false}
                      label={renderCustomLabel}
                      strokeWidth={1.5}
                      stroke="#fff"
                    >
                        {pieData.map((entry) => (
                          <Cell
                            key={entry.level}
                            fill={LEVEL_COLORS[entry.level]}
                          />
                        ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: unknown, name?: string) => {
                        const pct = total > 0 ? ((Number(value) / total) * 100).toFixed(1) : "0";
                        return [`${pct}%`, name ?? ""];
                      }}
                      contentStyle={{
                        fontSize: 11,
                        borderRadius: 6,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No reporting category data available.
        </p>
      )}
      </CardContent>
    </Card>
  );
}
