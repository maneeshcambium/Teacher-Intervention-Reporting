import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rosters } from "@/lib/schema";
import { asc } from "drizzle-orm";

export async function GET() {
  const allRosters = db.select().from(rosters).orderBy(asc(rosters.name)).all();
  return NextResponse.json(allRosters);
}
