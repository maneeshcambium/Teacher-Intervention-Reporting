import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { testGroups } from "@/lib/schema";

export async function GET() {
  const allGroups = db.select().from(testGroups).all();
  return NextResponse.json(allGroups);
}
