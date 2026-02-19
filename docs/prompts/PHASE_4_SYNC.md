# Phase 4 Prompt: External Sync + Simulation

> **Feed this entire file to GitHub Copilot Chat or Replit Agent.**
> **Prerequisites**: Phases 1–3 complete. Assignments can be created and viewed.
> **Stack**: Next.js 14 App Router, TypeScript, Drizzle ORM, SQLite.

---

## Task

Build the external platform sync API and a simulation button to mock platform callbacks.

## API Routes

### `POST /api/external/sync`

Simulates an external platform (e.g., Khan Academy) calling back to report student progress.

**Request body:**
```json
{
  "platform": "khan_academy",
  "studentExternalId": "stu_123",
  "assignmentName": "Multiplication Mastery",
  "status": "completed",
  "completedAt": "2026-02-18T10:00:00Z"
}
```

**Logic:**
1. Look up student by `externalId`
2. Find the assignment by name and platform
3. Update `assignment_students` set `status = :status`
4. If status is 'started', set `startedAt = :completedAt`
5. If status is 'completed', set `completedAt = :completedAt` and `startedAt` if not already set
6. Return success with updated record

**Response:**
```json
{
  "success": true,
  "studentId": 123,
  "assignmentId": 1,
  "previousStatus": "not_started",
  "newStatus": "completed"
}
```

**Error cases:**
- Student not found → 404
- Assignment not found → 404
- Student not assigned to this assignment → 400
- Invalid status → 400

### `POST /api/simulate-sync`

Batch simulation endpoint for demo purposes.

**Request body:**
```json
{
  "assignmentId": 1,
  "completePercentage": 70,
  "startPercentage": 15
}
```

If no body provided, simulate for ALL assignments with default percentages (70% complete, 15% start).

**Logic:**
1. Get all `assignment_students` with status 'not_started' for the assignment(s)
2. Randomly select `completePercentage`% of them → set status to 'completed', set `completedAt` to random date within the assignment's intervention window
3. From remaining not_started, randomly select `startPercentage`% → set status to 'started', set `startedAt` to random date within the intervention window
4. Use a transaction for atomicity
5. Return summary of changes

**Response:**
```json
{
  "success": true,
  "assignments": [
    {
      "assignmentId": 1,
      "assignmentName": "Fractions Foundations",
      "changed": {
        "completed": 245,
        "started": 52,
        "unchanged": 53
      }
    }
  ],
  "totalUpdated": 297
}
```

## UI Changes

### Add "Simulate Sync" Button to Dashboard

In `src/app/dashboard/page.tsx`, add a button in the header area (next to the title or near the assignment summary):

```tsx
<div className="flex items-center justify-between">
  <h2 className="text-2xl font-bold">Dashboard</h2>
  <div className="flex gap-2">
    <SimulateSyncButton />
  </div>
</div>
```

### `src/components/dashboard/SimulateSyncButton.tsx`

- shadcn `Button` with variant="outline"
- Icon: `RefreshCw` from lucide-react (with spin animation while loading)
- Text: "Simulate External Sync"
- On click:
  1. Show confirmation dialog: "This will simulate external platform callbacks, randomly completing and starting assignments. Continue?"
  2. On confirm: POST to `/api/simulate-sync` (no body = all assignments)
  3. Show loading spinner
  4. On success: show toast with summary ("Updated 297 students across 8 assignments")
  5. Invalidate relevant TanStack Query keys: `['assignments']`, `['students']`
  6. Assignment summary table should automatically refresh and show updated counts

### Update `src/components/dashboard/AssignmentSummary.tsx`

Add visual refresh after sync:
- Status columns should animate when values change (use CSS transition on the progress bars)
- After sync, the "Completed" counts should visibly increase

## Verification

After implementing:
1. "Simulate External Sync" button appears on dashboard
2. Clicking it shows a confirmation dialog
3. Confirming triggers the sync — button shows spinner
4. Toast shows "Updated X students across Y assignments"
5. Assignment summary table refreshes — completed counts increase in relevant intervention windows
6. Running sync again on remaining students updates more
7. `POST /api/external/sync` with a single student payload updates that student's status
8. Sending invalid data returns appropriate error responses

Generate all the code. Do not use placeholder comments — write the full implementation for every file.
