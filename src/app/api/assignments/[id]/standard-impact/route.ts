import { NextRequest, NextResponse } from "next/server";
import { calculateStandardLevelImpact } from "@/lib/impact";

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

    const result = calculateStandardLevelImpact(assignmentId);

    if (!result) {
      return NextResponse.json(
        { error: "Assignment not found or has no impacted test" },
        { status: 404 }
      );
    }

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    console.error("Failed to calculate standard-level impact:", error);
    return NextResponse.json(
      { error: "Failed to calculate standard-level impact" },
      { status: 500 }
    );
  }
}
