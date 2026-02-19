import { NextResponse } from "next/server";
import { seedDatabase } from "@/lib/seed";

export async function POST() {
  try {
    const start = Date.now();
    await seedDatabase();
    const elapsed = Date.now() - start;
    return NextResponse.json({ success: true, elapsed: `${elapsed}ms` });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
