# Phase 7 Prompt: Polish & Demo Prep

> **Feed this entire file to GitHub Copilot Chat or Replit Agent.**
> **Prerequisites**: Phases 1–6 complete.
> **Stack**: Next.js 14 App Router, TypeScript, shadcn/ui, Tailwind CSS.

---

## Task

Polish the application for demo readiness: loading states, empty states, navigation, and visual tweaks.

## 1. Loading States

Add skeleton loading to every data-fetching component:

### `PerformanceOverview`
- Show 4 skeleton cards (gray rectangles, `animate-pulse`) matching performance card layout
- Use shadcn `Skeleton` component

### `RCBreakdown`
- Show skeleton chart area (rectangular skeleton)

### `StudentTable`
- Show 10 skeleton rows with gray cells
- Keep header visible (not skeleton)

### `AssignmentSummary`
- Show 3 skeleton rows

### `ImpactCards`
- Show 8 skeleton cards in grid layout

### `StudentPage`
- Skeleton for header + score cards + table

## 2. Empty States

### No students after filter
```tsx
<div className="text-center py-12">
  <SearchX className="mx-auto h-12 w-12 text-muted-foreground" />
  <h3 className="mt-4 text-lg font-semibold">No students found</h3>
  <p className="text-muted-foreground">Try adjusting your filters or search query</p>
  <Button variant="outline" onClick={clearFilters} className="mt-4">Clear Filters</Button>
</div>
```

### No assignments yet
```tsx
<div className="text-center py-12">
  <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground" />
  <h3 className="mt-4 text-lg font-semibold">No assignments yet</h3>
  <p className="text-muted-foreground">Select students from the table above and create an assignment</p>
</div>
```

### No impact data
```tsx
<div className="text-center py-12">
  <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground" />
  <h3 className="mt-4 text-lg font-semibold">No impact data available</h3>
  <p className="text-muted-foreground">Impact analysis requires completed assignments with post-test scores</p>
</div>
```

## 3. Toast Notifications

Install and configure shadcn `toast` (Sonner):

```bash
npx shadcn-ui@latest add sonner
```

Add toasts for:
- Assignment created: "✓ Assignment '{name}' created with {N} students"
- Sync completed: "✓ Synced {N} students across {M} assignments"
- Seed completed: "✓ Database seeded with 8,750 students in {time}"
- Error: "✗ {error message}" (destructive variant)

## 4. Dashboard Navigation (Tabs)

Create a shared dashboard layout with tabs navigation:

### `src/app/dashboard/layout.tsx`

```tsx
export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  
  return (
    <div>
      <TopBar />
      <div className="border-b">
        <nav className="flex space-x-4 px-6">
          <TabLink href="/dashboard" active={pathname === '/dashboard'}>
            Overview
          </TabLink>
          <TabLink href="/dashboard/assignments" active={pathname === '/dashboard/assignments'}>
            Assignments
          </TabLink>
          <TabLink href="/dashboard/impact" active={pathname === '/dashboard/impact'}>
            Impact Analysis
          </TabLink>
        </nav>
      </div>
      {children}
    </div>
  );
}
```

Style tabs with bottom border active indicator (2px blue bottom border on active tab).

## 5. Responsive Improvements

- Charts: Stack vertically on screens < 1280px
- Student table: Allow horizontal scroll on narrow screens
- Impact cards: 1 column on < 768px, 2 on < 1280px, 3 on ≥ 1280px
- Top bar: Collapse selectors into a hamburger menu on < 768px (stretch goal)

## 6. Quick Actions

### Dashboard header actions
```tsx
<div className="flex items-center gap-2">
  <Button variant="outline" size="sm" onClick={seedDb}>
    <Database className="mr-2 h-4 w-4" />
    Seed Data
  </Button>
  <SimulateSyncButton />
</div>
```

### Keyboard shortcut hint (stretch)
- Show `Ctrl+K` hint for search

## 7. Color Theme Consistency

Ensure all level colors are consistent across the app:

```typescript
// src/lib/colors.ts
export const LEVEL_COLORS = {
  1: { bg: 'bg-red-100', text: 'text-red-700', fill: '#EF4444', label: 'Beginning to Understand' },
  2: { bg: 'bg-orange-100', text: 'text-orange-700', fill: '#F97316', label: 'Approaching Understanding' },
  3: { bg: 'bg-green-100', text: 'text-green-700', fill: '#22C55E', label: 'Understands' },
  4: { bg: 'bg-blue-100', text: 'text-blue-700', fill: '#3B82F6', label: 'Advanced Understanding' },
} as const;

export const PLATFORM_COLORS = {
  ixl: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'IXL' },
  khan_academy: { bg: 'bg-green-100', text: 'text-green-700', label: 'Khan Academy' },
  reflex: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Reflex' },
  lexiacore5: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'LexiaCore5' },
} as const;
```

## 8. Error Boundary

Add a simple error boundary for the dashboard:

```tsx
// src/app/dashboard/error.tsx
'use client';
export default function DashboardError({ error, reset }) {
  return (
    <div className="flex flex-col items-center justify-center h-96">
      <AlertTriangle className="h-12 w-12 text-destructive" />
      <h2 className="mt-4 text-lg font-semibold">Something went wrong</h2>
      <p className="text-muted-foreground mt-2">{error.message}</p>
      <Button onClick={reset} className="mt-4">Try Again</Button>
    </div>
  );
}
```

## 9. Demo Script (3-minute walkthrough)

Create this sequence for the demo:

1. **[0:00]** "This is the Teacher Intervention Dashboard. It automatically loads my roster of ~35 students and latest test results."
2. **[0:20]** "I can see my class overall performance across 4 levels. Let me click on 'Beginning to Understand' to see struggling students."
3. **[0:40]** "I'll select these 3 students and create a targeted assignment on IXL focusing on fractions."
4. **[1:00]** "The assignment is tracked here with all students showing 'Not Started'."
5. **[1:15]** "Let me simulate the external platform sync — this represents IXL reporting back that students completed their work."
6. **[1:30]** "Now I can see status updates — 70% completed. Let me switch to Impact Analysis."
7. **[1:45]** "Here's the key insight — our DiD analysis shows a **+50 scale score point impact** from the Fractions assignment. The treated group improved 55 points while the control group only improved 5 points."
8. **[2:15]** "I can drill into the scatter plot — green dots (completed assignment) are clearly above the no-change line."
9. **[2:30]** "Let me click into a student — Alice Johnson — to see her individual journey. Her fraction scores jumped from 5280 to 5462 across 6 PM tests."
10. **[2:50]** "With 250 rosters, 8,750 students, and 6 tests generating 52,500+ score records, this system delivers sub-second load times powered by SQLite."

## Verification

Final end-to-end test:
1. Fresh start: `npm run dev` → clean page loads
2. Click "Seed Data" → toast confirms 8,750 students + 52,500 scores
3. Dashboard populates with performance cards and table
4. Click "Beginning to Understand" → table filters
5. Select 3 students → create assignment → toast confirms
6. Click "Simulate Sync" → counts update
7. Navigate to Impact → 8 cards show ~50 pt DiD
8. Click card → scatter plot renders
9. Navigate to a student → full detail page with up to 6 test scores
10. Back to dashboard → context preserved

Generate all the code. Do not use placeholder comments — write the full implementation for every file.
