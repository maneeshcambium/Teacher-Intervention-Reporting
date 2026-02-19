import { NextRequest, NextResponse } from "next/server";
import { getStudentAssignments } from "@/lib/queries";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const studentId = Number(id);

    if (isNaN(studentId)) {
      return NextResponse.json({ error: "Invalid student ID" }, { status: 400 });
    }

    const result = getStudentAssignments(studentId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch student assignments:", error);
    return NextResponse.json(
      { error: "Failed to fetch student assignments" },
      { status: 500 }
    );
  }
}
