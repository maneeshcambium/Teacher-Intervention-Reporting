import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tests } from "@/lib/schema";
import { eq, asc } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const groupId = parseInt(id, 10);

  if (isNaN(groupId)) {
    return NextResponse.json(
      { error: "Invalid group ID" },
      { status: 400 }
    );
  }

  const groupTests = db
    .select()
    .from(tests)
    .where(eq(tests.groupId, groupId))
    .orderBy(asc(tests.sequence))
    .all();

  return NextResponse.json(groupTests);
}
