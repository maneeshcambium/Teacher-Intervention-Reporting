# Phase 15: Inline Standard-Level DiD Impact in Impact Summary Cards

> **Prerequisites**: Phases 1–5, 9 complete.
> **Stack**: Next.js 14 App Router, TypeScript, shadcn/ui, Tailwind CSS, Recharts, TanStack Query.

---

## Problem Statement

The Impact Analysis page currently requires **two interactions and scrolling** to see per-standard DiD impact:

1. The **ImpactCards** grid shows each assignment's overall DiD number, p-value, and standard code chips (e.g. `3.NF.A.1`, `3.NF.A.3`) — but no per-standard impact values.  
2. The **StandardImpactBreakdown** panel (bar chart + detail table) only appears below the scatter plot and impact table after clicking a card, forcing the teacher to scroll past the detail row to reach it.

Teachers want to see **at a glance** which standards improved and by how much, directly on the summary card — without scrolling or clicking.

---

## Solution

Embed a **compact per-standard DiD table** directly inside each `ImpactCard`. Replace the current standard code chips (which only show codes with no impact data) with a mini table showing each standard's code and its individual DiD impact value, color-coded green/red. This gives teachers immediate visibility into standard-level effectiveness on the summary card itself.

### Design

Each ImpactCard currently shows:
```
┌─────────────────────────────────────┐
│ Assignment Name              [IXL]  │
│ PM3 → PM4                          │
│                                     │
│ ↑ +48 pts                          │
│ [p = 0.000 ✓]                      │
│ [3.NF.A.1] [3.NF.A.3]  ← chips    │
│                                     │
│ Treated:  5366 → 5431 (+65)        │
│ Control:  5493 → 5510 (+17)        │
│ ~~~~ sparkline ~~~~                 │
│ n(treated)=449     n(control)=2190  │
└─────────────────────────────────────┘
```

Replace the standard chips section with an inline standard impact mini-table:

```
┌─────────────────────────────────────┐
│ Assignment Name              [IXL]  │
│ PM3 → PM4                          │
│                                     │
│ ↑ +48 pts                          │
│ [p = 0.000 ✓]                      │
│                                     │
│  Standard    Treated Δ  Ctrl Δ  DiD│
│  ─────────── ───────── ─────── ────│
│  3.NF.A.1      +65      +23   +42 │
│  3.NF.A.3      +65      +23   +42 │
│                                     │
│ Treated:  5366 → 5431 (+65)        │
│ Control:  5493 → 5510 (+17)        │
│ ~~~~ sparkline ~~~~                 │
│ n(treated)=449     n(control)=2190  │
└─────────────────────────────────────┘
```

### Key Display Rules

- Show **all** linked standards (assignments typically have 1–4 standards; no truncation needed).
- Each row: standard code (monospace), Treated Δ, Control Δ, **DiD Impact** (bold, green/red).
- If a standard has negative DiD, show in red; positive in green.
- Keep the table compact — use `text-xs` sizing, minimal padding.
- The mini-table replaces the existing `Badge` chips for standards; remove the chip rendering.

---

## Data Flow

### Option A: Extend the Summary API (Recommended)

Currently, `GET /api/impact/summary` returns `ImpactResult[]` where each result contains `standards: string[]` (just standard codes). The per-standard DiD data is only available from `GET /api/assignments/:id/impact` (the `StandardImpactResult` endpoint).

**Extend `ImpactResult` to include per-standard DiD data** so it's available without a second API call:

1. Add a new field to `ImpactResult`:
   ```typescript
   export interface ImpactResult {
     // ... existing fields ...
     standardImpacts?: StandardDiDSummary[];
   }
   
   export interface StandardDiDSummary {
     code: string;
     treatedDelta: number;
     controlDelta: number;
     didImpact: number;
   }
   ```

2. In `src/lib/impact.ts` → `calculateAssignmentImpact()`, compute per-standard DiD alongside the overall DiD (reuse logic from `calculateStandardLevelImpact`) and include it in the returned `ImpactResult`.

3. The summary API already calls `calculateAssignmentImpact()` for each assignment, so no API route changes are needed — the new field flows through automatically.

### Option B: Client-Side Fetch per Card (Not Recommended)

Each card could call `useStandardImpact(assignmentId)` individually. This would create N parallel API requests on page load (one per assignment). Avoid this approach — it creates unnecessary load and latency.

---

## Changes Required

### 1. Type — Add `StandardDiDSummary`

**File**: `src/types/index.ts`

```typescript
export interface StandardDiDSummary {
  code: string;
  treatedDelta: number;
  controlDelta: number;
  didImpact: number;
}
```

Add `standardImpacts?: StandardDiDSummary[]` to the existing `ImpactResult` interface.

### 2. Impact Calculation — Include Per-Standard DiD in Summary

**File**: `src/lib/impact.ts`

In `calculateAssignmentImpact()`:
- After computing the overall DiD, iterate over each linked standard.
- For each standard, extract individual standard scores from `std_scores` JSON for treated and control students on both pre-test and post-test.
- Compute `treatedDelta`, `controlDelta`, and `didImpact` per standard.
- Attach the array as `standardImpacts` on the returned `ImpactResult`.

This reuses the same logic already in `calculateStandardLevelImpact()` but without the full t-test / p-value computation (not needed for the compact card display).

### 3. ImpactCard Component — Replace Chips with Mini-Table

**File**: `src/components/impact/ImpactCard.tsx`

Replace the standard chips section:

```tsx
{/* Current: standard chips */}
<div className="flex flex-wrap gap-1">
  {impact.standards.slice(0, 4).map((std) => (
    <Badge key={std} variant="outline" className="text-xs">{std}</Badge>
  ))}
  {impact.standards.length > 4 && (
    <Badge variant="outline" className="text-xs">+{impact.standards.length - 4}</Badge>
  )}
</div>
```

With an inline mini-table:

```tsx
{/* New: per-standard DiD mini-table */}
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
      <Badge key={std} variant="outline" className="text-xs">{std}</Badge>
    ))}
  </div>
)}
```

Falls back to the existing code chips if `standardImpacts` is not populated (backwards compatibility).

### 4. No API Route Changes

The summary endpoint (`GET /api/impact/summary`) already calls `calculateAssignmentImpact()` for each assignment and returns the full `ImpactResult` objects. Adding `standardImpacts` to the returned object flows through without route changes.

---

## Files Changed

| File | Change |
|------|--------|
| `src/types/index.ts` | Add `StandardDiDSummary` interface; add `standardImpacts?` to `ImpactResult` |
| `src/lib/impact.ts` | Compute per-standard DiD in `calculateAssignmentImpact()` and attach to result |
| `src/components/impact/ImpactCard.tsx` | Replace standard code chips with inline mini-table showing per-standard DiD |

---

## Edge Cases

- **No standards linked**: Some assignments may have zero linked standards. Keep the existing empty state (no chips, no table).
- **Single standard**: Table renders with one row — still useful, shows the standard's individual contribution.
- **Negative DiD on specific standard**: Displayed in red, alerting the teacher that this standard regressed despite the assignment.
- **`standardImpacts` absent**: Falls back to code chip rendering for backwards compatibility with any cached/stale API responses.

---

## Future Enhancements

- Add p-value / significance indicator per standard in the mini-table (currently omitted to keep cards compact).
- Click a standard row in the mini-table to scroll/navigate to the full `StandardImpactBreakdown` panel.
- Conditionally highlight standards with negative DiD using a subtle red background row.
