import { NextRequest, NextResponse } from "next/server";
import { addStudentsToAssignment, getAssignmentStudents } from "@/lib/queries";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const assignmentId = Number(id);
    if (isNaN(assignmentId)) {
      return NextResponse.json({ error: "Invalid assignment ID" }, { status: 400 });
    }
    const rosterParam = _request.nextUrl.searchParams.get("rosterId");
    const rosterId = rosterParam ? Number(rosterParam) : null;
    const students = getAssignmentStudents(assignmentId, rosterId);
    return NextResponse.json(students);
  } catch (error) {
    console.error("Failed to fetch assignment students:", error);
    return NextResponse.json(
      { error: "Failed to fetch assignment students" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const assignmentId = Number(id);

    if (isNaN(assignmentId)) {
      return NextResponse.json(
        { error: "Invalid assignment ID" },
        { status: 400 }
      );
    }

    const body = (await request.json()) as { studentIds: number[] };

    if (!body.studentIds?.length) {
      return NextResponse.json(
        { error: "At least one student ID is required" },
        { status: 400 }
      );
    }

    const result = addStudentsToAssignment(assignmentId, body.studentIds);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to add students to assignment:", error);
    return NextResponse.json(
      { error: "Failed to add students to assignment" },
      { status: 500 }
    );
  }
}
