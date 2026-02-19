import { NextRequest, NextResponse } from "next/server";
import { calculateAllImpacts } from "@/lib/impact";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get("groupId");

    if (!groupId) {
      return NextResponse.json(
        { error: "groupId query parameter is required" },
        { status: 400 }
      );
    }

    const impacts = calculateAllImpacts(Number(groupId));

    return NextResponse.json(
      {
        impacts,
        calculatedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "private, max-age=300",
        },
      }
    );
  } catch (error) {
    console.error("Failed to calculate impact summary:", error);
    return NextResponse.json(
      { error: "Failed to calculate impact summary" },
      { status: 500 }
    );
  }
}
