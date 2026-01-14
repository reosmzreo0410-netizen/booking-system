import { auth } from "@/auth";
import { syncAvailableBlocks } from "@/services/google-calendar";
import { NextResponse } from "next/server";

export async function POST() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  try {
    const result = await syncAvailableBlocks(session.user.id);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Sync failed:", error);
    return NextResponse.json(
      { error: "Failed to sync calendar" },
      { status: 500 }
    );
  }
}
