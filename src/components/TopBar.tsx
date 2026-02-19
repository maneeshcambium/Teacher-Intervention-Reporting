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
import { CambiumLogo } from "@/components/CambiumLogo";

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
    <header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-[#00264a] bg-[#003057] px-6 shadow-md">
      <div className="flex items-center gap-3">
        <CambiumLogo className="h-8 w-auto" />
        <div className="h-6 w-px bg-white/25" />
        <span className="text-base font-semibold tracking-tight text-white">
          TeachImpact
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* Roster selector */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-blue-200">Roster</label>
          <Select
            value={selectedRosterId ? String(selectedRosterId) : undefined}
            onValueChange={(val) => setSelectedRosterId(parseInt(val, 10))}
          >
            <SelectTrigger className="w-[200px] border-white/30 bg-white/10 text-white hover:bg-white/15 focus:ring-white/30">
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

        <div className="h-6 w-px bg-white/25" />

        {/* Test Group selector */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-blue-200">Test Group</label>
          <Select
            value={selectedTestGroupId ? String(selectedTestGroupId) : undefined}
            onValueChange={(val) => setSelectedTestGroupId(parseInt(val, 10))}
          >
            <SelectTrigger className="w-[200px] border-white/30 bg-white/10 text-white hover:bg-white/15 focus:ring-white/30">
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

        <div className="h-6 w-px bg-white/25" />

        {/* Test selector */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-blue-200">Test</label>
          <Select
            value={selectedTestId ? String(selectedTestId) : undefined}
            onValueChange={(val) => setSelectedTestId(parseInt(val, 10))}
          >
            <SelectTrigger className="w-[160px] border-white/30 bg-white/10 text-white hover:bg-white/15 focus:ring-white/30">
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
