import { NextResponse } from "next/server";
import { getReportingCategoriesWithStandards } from "@/lib/queries";

export async function GET() {
  try {
    const categories = getReportingCategoriesWithStandards();
    return NextResponse.json(categories);
  } catch (error) {
    console.error("Failed to fetch reporting categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch reporting categories" },
      { status: 500 }
    );
  }
}
