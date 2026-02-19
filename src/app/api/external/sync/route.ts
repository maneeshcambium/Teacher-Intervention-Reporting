import { NextRequest, NextResponse } from "next/server";
import { db, sqlite } from "@/lib/db";
import { students, assignments, assignmentStudents } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

interface SyncRequestBody {
  platform: string;
  studentExternalId: string;
  assignmentName: string;
  status: string;
  completedAt: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SyncRequestBody;

    // Validate status
    const validStatuses = ["not_started", "started", "completed"];
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json(
        {
          error: `Invalid status "${body.status}". Must be one of: ${validStatuses.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Look up student by externalId
    const student = db
      .select()
      .from(students)
      .where(eq(students.externalId, body.studentExternalId))
      .get();

    if (!student) {
      return NextResponse.json(
        { error: `Student not found with externalId "${body.studentExternalId}"` },
        { status: 404 }
      );
    }

    // Find attribution by name and platform
    const assignment = db
      .select()
      .from(assignments)
      .where(
        and(
          eq(assignments.name, body.assignmentName),
          eq(assignments.platform, body.platform)
        )
      )
      .get();

    if (!assignment) {
      return NextResponse.json(
        {
          error: `Assignment not found with name "${body.assignmentName}" and platform "${body.platform}"`,
        },
        { status: 404 }
      );
    }

    // Check if the student is assigned to this assignment
    const existingRecord = db
      .select()
      .from(assignmentStudents)
      .where(
        and(
          eq(assignmentStudents.assignmentId, assignment.id),
          eq(assignmentStudents.studentId, student.id)
        )
      )
      .get();

    if (!existingRecord) {
      return NextResponse.json(
        {
          error: `Student ${student.id} is not assigned to assignment ${assignment.id}`,
        },
        { status: 400 }
      );
    }

    const previousStatus = existingRecord.status;
    const timestamp = body.completedAt || new Date().toISOString();

    // Update status based on the incoming status
    if (body.status === "started") {
      db.update(assignmentStudents)
        .set({
          status: "started",
          startedAt: timestamp,
        })
        .where(
          and(
            eq(assignmentStudents.assignmentId, assignment.id),
            eq(assignmentStudents.studentId, student.id)
          )
        )
        .run();
    } else if (body.status === "completed") {
      db.update(assignmentStudents)
        .set({
          status: "completed",
          completedAt: timestamp,
          startedAt: existingRecord.startedAt || timestamp,
        })
        .where(
          and(
            eq(assignmentStudents.assignmentId, assignment.id),
            eq(assignmentStudents.studentId, student.id)
          )
        )
        .run();
    } else {
      // not_started — reset
      db.update(assignmentStudents)
        .set({
          status: "not_started",
          startedAt: null,
          completedAt: null,
        })
        .where(
          and(
            eq(assignmentStudents.assignmentId, assignment.id),
            eq(assignmentStudents.studentId, student.id)
          )
        )
        .run();
    }

    return NextResponse.json({
      success: true,
      studentId: student.id,
      assignmentId: assignment.id,
      previousStatus,
      newStatus: body.status,
    });
  } catch (error) {
    console.error("External sync failed:", error);
    return NextResponse.json(
      { error: "External sync failed" },
      { status: 500 }
    );
  }
}
