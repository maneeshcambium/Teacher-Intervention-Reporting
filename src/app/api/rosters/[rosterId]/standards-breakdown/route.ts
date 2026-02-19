import { NextRequest, NextResponse } from "next/server";
import { getStandardsBreakdown } from "@/lib/queries";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ rosterId: string }> }
) {
  try {
    const { rosterId } = await params;
    const testId = request.nextUrl.searchParams.get("testId");

    if (!testId) {
      return NextResponse.json({ error: "testId is required" }, { status: 400 });
    }

    const data = getStandardsBreakdown(Number(rosterId), Number(testId));
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to fetch standards breakdown:", error);
    return NextResponse.json(
      { error: "Failed to fetch standards breakdown" },
      { status: 500 }
    );
  }
}
