import { NextRequest, NextResponse } from "next/server";
import { getStudentList } from "@/lib/queries";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ rosterId: string }> }
) {
  const { rosterId } = await params;
  const rosterIdNum = parseInt(rosterId, 10);

  if (isNaN(rosterIdNum)) {
    return NextResponse.json({ error: "Invalid roster ID" }, { status: 400 });
  }

  const searchParams = request.nextUrl.searchParams;
  const testId = searchParams.get("testId");
  if (!testId) {
    return NextResponse.json({ error: "testId is required" }, { status: 400 });
  }

  const testIdNum = parseInt(testId, 10);
  if (isNaN(testIdNum)) {
    return NextResponse.json({ error: "Invalid test ID" }, { status: 400 });
  }

  const level = searchParams.get("level");
  const rc = searchParams.get("rc");
  const search = searchParams.get("search") || undefined;
  const sort = searchParams.get("sort") || "name";
  const order = searchParams.get("order") || "asc";

  const result = getStudentList(rosterIdNum, testIdNum, {
    level: level ? parseInt(level, 10) : null,
    rc: rc ? parseInt(rc, 10) : null,
    search,
    sort,
    order: order as "asc" | "desc",
  });

  return NextResponse.json(result);
}
