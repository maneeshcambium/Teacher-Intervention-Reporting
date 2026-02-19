import { NextRequest, NextResponse } from "next/server";
import { getAssignments, createAssignment } from "@/lib/queries";
import type { CreateAssignmentInput } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get("groupId");
    const rosterId = searchParams.get("rosterId");

    if (!groupId) {
      return NextResponse.json(
        { error: "groupId query parameter is required" },
        { status: 400 }
      );
    }

    const assignments = getAssignments(Number(groupId), rosterId ? Number(rosterId) : null);
    return NextResponse.json(assignments);
  } catch (error) {
    console.error("Failed to fetch assignments:", error);
    return NextResponse.json(
      { error: "Failed to fetch assignments" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateAssignmentInput;

    // Validate required fields
    if (!body.name || !body.platform || !body.groupId || !body.createdAfterTestId) {
      return NextResponse.json(
        { error: "Missing required fields: name, platform, groupId, createdAfterTestId" },
        { status: 400 }
      );
    }

    if (!body.standardIds?.length) {
      return NextResponse.json(
        { error: "At least one standard is required" },
        { status: 400 }
      );
    }

    if (!body.studentIds?.length) {
      return NextResponse.json(
        { error: "At least one student is required" },
        { status: 400 }
      );
    }

    const result = createAssignment(body);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Failed to create assignment:", error);
    return NextResponse.json(
      { error: "Failed to create assignment" },
      { status: 500 }
    );
  }
}
