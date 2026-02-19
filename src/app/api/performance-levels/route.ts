import { NextResponse } from "next/server";
import { getPerformanceLevels } from "@/lib/queries";

export async function GET() {
  const levels = getPerformanceLevels();
  return NextResponse.json(levels);
}
