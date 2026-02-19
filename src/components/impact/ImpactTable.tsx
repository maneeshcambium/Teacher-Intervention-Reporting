"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpDown } from "lucide-react";
import { useState, useMemo } from "react";
import type { ImpactResult } from "@/types";

const platformLabels: Record<string, string> = {
  ixl: "IXL",
  khan_academy: "Khan Academy",
  lexiacore5: "Lexia Core5",
  reflex: "Reflex",
};

type SortKey =
  | "assignmentName"
  | "platform"
  | "treatedCount"
  | "controlCount"
  | "treatedDelta"
  | "controlDelta"
  | "didImpact"
  | "pValue";

interface ImpactTableProps {
  impacts: ImpactResult[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

export function ImpactTable({ impacts, selectedId, onSelect }: ImpactTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("didImpact");
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = useMemo(() => {
    const copy = [...impacts];
    copy.sort((a, b) => {
      let aVal: number | string = 0;
      let bVal: number | string = 0;

      switch (sortKey) {
        case "assignmentName":
          aVal = a.assignmentName;
          bVal = b.assignmentName;
          break;
        case "platform":
          aVal = a.platform;
          bVal = b.platform;
          break;
        case "treatedCount":
          aVal = a.treatedCount;
          bVal = b.treatedCount;
          break;
        case "controlCount":
          aVal = a.controlCount;
          bVal = b.controlCount;
          break;
        case "treatedDelta":
          aVal = a.treatedDelta;
          bVal = b.treatedDelta;
          break;
        case "controlDelta":
          aVal = a.controlDelta;
          bVal = b.controlDelta;
          break;
        case "didImpact":
          aVal = a.didImpact;
          bVal = b.didImpact;
          break;
        case "pValue":
          aVal = a.pValue ?? 999;
          bVal = b.pValue ?? 999;
          break;
      }

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortAsc ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
    return copy;
  }, [impacts, sortKey, sortAsc]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === "assignmentName" || key === "platform");
    }
  }

  function SortableHead({ label, sortKeyVal }: { label: string; sortKeyVal: SortKey }) {
    return (
      <TableHead
        className="cursor-pointer select-none hover:bg-muted/50"
        onClick={() => toggleSort(sortKeyVal)}
      >
        <div className="flex items-center gap-1">
          {label}
          <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
        </div>
      </TableHead>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Impact Summary Table</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead label="Assignment" sortKeyVal="assignmentName" />
              <TableHead>Window</TableHead>
              <SortableHead label="Platform" sortKeyVal="platform" />
              <SortableHead label="N (Treated)" sortKeyVal="treatedCount" />
              <SortableHead label="N (Control)" sortKeyVal="controlCount" />
              <SortableHead label="Treated Δ" sortKeyVal="treatedDelta" />
              <SortableHead label="Control Δ" sortKeyVal="controlDelta" />
              <SortableHead label="DiD Impact" sortKeyVal="didImpact" />
              <SortableHead label="p-value" sortKeyVal="pValue" />
              <TableHead>Sig?</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((impact) => (
              <TableRow
                key={impact.assignmentId}
                className={`cursor-pointer hover:bg-muted/50 ${
                  selectedId === impact.assignmentId ? "bg-blue-50" : ""
                }`}
                onClick={() => onSelect(impact.assignmentId)}
              >
                <TableCell className="font-medium max-w-[200px] truncate">
                  {impact.assignmentName}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {impact.preTestName} → {impact.postTestName}
                </TableCell>
                <TableCell>
                  {platformLabels[impact.platform] || impact.platform}
                </TableCell>
                <TableCell>{impact.treatedCount}</TableCell>
                <TableCell>{impact.controlCount}</TableCell>
                <TableCell>
                  <span
                    className={
                      impact.treatedDelta >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }
                  >
                    {impact.treatedDelta >= 0 ? "+" : ""}
                    {impact.treatedDelta.toFixed(0)}
                  </span>
                </TableCell>
                <TableCell>
                  <span
                    className={
                      impact.controlDelta >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }
                  >
                    {impact.controlDelta >= 0 ? "+" : ""}
                    {impact.controlDelta.toFixed(0)}
                  </span>
                </TableCell>
                <TableCell>
                  <span
                    className={`font-bold ${
                      impact.didImpact >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {impact.didImpact >= 0 ? "+" : ""}
                    {impact.didImpact} pts
                  </span>
                </TableCell>
                <TableCell>
                  {impact.pValue != null ? impact.pValue.toFixed(3) : "—"}
                </TableCell>
                <TableCell>
                  {impact.pValue != null ? (
                    impact.isSignificant ? (
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                        ✓
                      </Badge>
                    ) : (
                      <Badge variant="secondary">✗</Badge>
                    )
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {sorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                  No assignment impacts to display
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
