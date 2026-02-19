"use client";

import { useReportingCategories } from "@/hooks/useReportingCategories";
import { Button } from "@/components/ui/button";

interface StandardsFiltersProps {
  selectedRC: number | null;
  onRCSelect: (rcId: number | null) => void;
}

export function StandardsFilters({
  selectedRC,
  onRCSelect,
}: StandardsFiltersProps) {
  const { data: categories } = useReportingCategories();

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm font-medium text-muted-foreground mr-1">
        Filter by RC:
      </span>
      <Button
        variant={selectedRC === null ? "default" : "outline"}
        size="sm"
        onClick={() => onRCSelect(null)}
      >
        All
      </Button>
      {categories?.map((cat) => (
        <Button
          key={cat.id}
          variant={selectedRC === cat.id ? "default" : "outline"}
          size="sm"
          onClick={() => onRCSelect(selectedRC === cat.id ? null : cat.id)}
        >
          {cat.name}
        </Button>
      ))}
    </div>
  );
}
