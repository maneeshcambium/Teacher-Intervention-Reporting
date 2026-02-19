import { NextRequest, NextResponse } from "next/server";
import { getStudentsByStandard } from "@/lib/queries";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ rosterId: string }> }
) {
  try {
    const { rosterId } = await params;
    const testId = request.nextUrl.searchParams.get("testId");
    const standardId = request.nextUrl.searchParams.get("standardId");

    if (!testId || !standardId) {
      return NextResponse.json(
        { error: "testId and standardId are required" },
        { status: 400 }
      );
    }

    const data = getStudentsByStandard(
      Number(rosterId),
      Number(testId),
      Number(standardId)
    );
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to fetch standard students:", error);
    return NextResponse.json(
      { error: "Failed to fetch standard students" },
      { status: 500 }
    );
  }
}
