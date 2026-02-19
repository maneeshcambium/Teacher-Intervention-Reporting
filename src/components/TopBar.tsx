"use client";

import { useAppContext } from "@/hooks/useAppContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

export function TopBar() {
  const {
    rosters,
    testGroups,
    tests,
    selectedRosterId,
    selectedTestGroupId,
    selectedTestId,
    setSelectedRosterId,
    setSelectedTestGroupId,
    setSelectedTestId,
  } = useAppContext();

  return (
    <header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b bg-white px-6">
      <h1 className="text-lg font-semibold text-gray-900">
        Teacher Intervention Dashboard
      </h1>

      <div className="flex items-center gap-4">
        {/* Roster selector */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-500">Roster</label>
          <Select
            value={selectedRosterId ? String(selectedRosterId) : undefined}
            onValueChange={(val) => setSelectedRosterId(parseInt(val, 10))}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select roster" />
            </SelectTrigger>
            <SelectContent>
              {rosters.map((r) => (
                <SelectItem key={r.id} value={String(r.id)}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator orientation="vertical" className="h-8" />

        {/* Test Group selector */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-500">Test Group</label>
          <Select
            value={selectedTestGroupId ? String(selectedTestGroupId) : undefined}
            onValueChange={(val) => setSelectedTestGroupId(parseInt(val, 10))}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select test group" />
            </SelectTrigger>
            <SelectContent>
              {testGroups.map((g) => (
                <SelectItem key={g.id} value={String(g.id)}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator orientation="vertical" className="h-8" />

        {/* Test selector */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-500">Test</label>
          <Select
            value={selectedTestId ? String(selectedTestId) : undefined}
            onValueChange={(val) => setSelectedTestId(parseInt(val, 10))}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Select test" />
            </SelectTrigger>
            <SelectContent>
              {tests.map((t) => (
                <SelectItem key={t.id} value={String(t.id)}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </header>
  );
}
