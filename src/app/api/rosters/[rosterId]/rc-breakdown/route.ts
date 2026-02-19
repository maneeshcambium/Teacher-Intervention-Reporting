import { NextRequest, NextResponse } from "next/server";
import { getRCBreakdown } from "@/lib/queries";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ rosterId: string }> }
) {
  const { rosterId } = await params;
  const rosterIdNum = parseInt(rosterId, 10);

  if (isNaN(rosterIdNum)) {
    return NextResponse.json({ error: "Invalid roster ID" }, { status: 400 });
  }

  const testId = request.nextUrl.searchParams.get("testId");
  if (!testId) {
    return NextResponse.json({ error: "testId is required" }, { status: 400 });
  }

  const testIdNum = parseInt(testId, 10);
  if (isNaN(testIdNum)) {
    return NextResponse.json({ error: "Invalid test ID" }, { status: 400 });
  }

  const result = getRCBreakdown(rosterIdNum, testIdNum);
  return NextResponse.json(result);
}
