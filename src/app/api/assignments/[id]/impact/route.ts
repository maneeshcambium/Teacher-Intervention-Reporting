import { NextRequest, NextResponse } from "next/server";
import { calculateAssignmentImpact } from "@/lib/impact";

export async function GET(
  _request: NextRequest,
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

    const impact = calculateAssignmentImpact(assignmentId, true);

    if (!impact) {
      return NextResponse.json(
        { error: "Assignment not found or has no impacted test" },
        { status: 404 }
      );
    }

    return NextResponse.json(impact, {
      headers: {
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    console.error("Failed to calculate assignment impact:", error);
    return NextResponse.json(
      { error: "Failed to calculate impact" },
      { status: 500 }
    );
  }
}
