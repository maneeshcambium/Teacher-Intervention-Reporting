import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/lib/db";

interface SimulateRequestBody {
  assignmentId?: number;
  completePercentage?: number;
  startPercentage?: number;
}

interface AssignmentStudentRow {
  assignment_id: number;
  student_id: number;
  status: string;
  started_at: string | null;
  completed_at: string | null;
}

interface AssignmentInfo {
  id: number;
  name: string;
  created_after_test_id: number;
  impacted_test_id: number | null;
}

function randomDateBetween(start: string, end: string): string {
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  const randomMs = startMs + Math.random() * (endMs - startMs);
  return new Date(randomMs).toISOString();
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export async function POST(request: NextRequest) {
  try {
    let body: SimulateRequestBody = {};
    try {
      const text = await request.text();
      if (text.trim()) {
        body = JSON.parse(text);
      }
    } catch {
      // No body or invalid JSON — use defaults
    }

    const completePercentage = body.completePercentage ?? 9;
    const startPercentage = body.startPercentage ?? 15;

    // Get target assignments
    let targetAssignments: AssignmentInfo[];
    if (body.assignmentId) {
      targetAssignments = sqlite
        .prepare(
          `SELECT id, name, created_after_test_id, impacted_test_id
           FROM assignments WHERE id = ?`
        )
        .all(body.assignmentId) as AssignmentInfo[];

      if (targetAssignments.length === 0) {
        return NextResponse.json(
          { error: `Assignment ${body.assignmentId} not found` },
          { status: 404 }
        );
      }
    } else {
      targetAssignments = sqlite
        .prepare(
          `SELECT id, name, created_after_test_id, impacted_test_id
           FROM assignments`
        )
        .all() as AssignmentInfo[];
    }

    if (targetAssignments.length === 0) {
      return NextResponse.json({
        success: true,
        assignments: [],
        totalUpdated: 0,
      });
    }

    // Get date ranges from tests for generating random timestamps
    const testDates = sqlite
      .prepare(`SELECT id, administered_at FROM tests WHERE administered_at IS NOT NULL`)
      .all() as Array<{ id: number; administered_at: string }>;

    const testDateMap = new Map(testDates.map((t) => [t.id, t.administered_at]));

    const results: Array<{
      assignmentId: number;
      assignmentName: string;
      changed: { completed: number; started: number; unchanged: number };
    }> = [];

    let totalUpdated = 0;

    // Process inside a transaction
    sqlite.transaction(() => {
      const updateCompleted = sqlite.prepare(
        `UPDATE assignment_students
         SET status = 'completed', completed_at = ?, started_at = COALESCE(started_at, ?)
         WHERE assignment_id = ? AND student_id = ?`
      );

      const updateStarted = sqlite.prepare(
        `UPDATE assignment_students
         SET status = 'started', started_at = ?
         WHERE assignment_id = ? AND student_id = ?`
      );

      for (const assignment of targetAssignments) {
        // Get all not_started students for this assignment
        const notStartedStudents = sqlite
          .prepare(
            `SELECT assignment_id, student_id, status, started_at, completed_at
             FROM assignment_students
             WHERE assignment_id = ? AND status = 'not_started'`
          )
          .all(assignment.id) as AssignmentStudentRow[];

        // Determine intervention window dates
        const createdDate =
          testDateMap.get(assignment.created_after_test_id) || "2026-01-15T00:00:00Z";
        const impactDate = assignment.impacted_test_id
          ? testDateMap.get(assignment.impacted_test_id) || "2026-03-15T00:00:00Z"
          : "2026-03-15T00:00:00Z";

        const shuffled = shuffleArray(notStartedStudents);
        const completeCount = Math.floor(
          (shuffled.length * completePercentage) / 100
        );
        const remaining = shuffled.length - completeCount;
        const startCount = Math.floor((remaining * startPercentage) / 100);

        let completedUpdates = 0;
        let startedUpdates = 0;

        // Mark completed
        for (let i = 0; i < completeCount; i++) {
          const student = shuffled[i];
          const randomDate = randomDateBetween(createdDate, impactDate);
          updateCompleted.run(randomDate, randomDate, assignment.id, student.student_id);
          completedUpdates++;
        }

        // Mark started (from remaining)
        for (let i = completeCount; i < completeCount + startCount; i++) {
          const student = shuffled[i];
          const randomDate = randomDateBetween(createdDate, impactDate);
          updateStarted.run(randomDate, assignment.id, student.student_id);
          startedUpdates++;
        }

        const unchanged =
          shuffled.length - completedUpdates - startedUpdates;

        results.push({
          assignmentId: assignment.id,
          assignmentName: assignment.name,
          changed: {
            completed: completedUpdates,
            started: startedUpdates,
            unchanged,
          },
        });

        totalUpdated += completedUpdates + startedUpdates;
      }
    })();

    return NextResponse.json({
      success: true,
      assignments: results,
      totalUpdated,
    });
  } catch (error) {
    console.error("Simulate sync failed:", error);
    return NextResponse.json(
      { error: "Simulate sync failed" },
      { status: 500 }
    );
  }
}
