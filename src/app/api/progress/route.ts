import { NextResponse } from "next/server";
import { getPlayer } from "@/lib/server/auth";
import { toApiErrorMessage } from "@/lib/server/errors";
import { loadProgress } from "@/lib/server/store";

export async function GET(request: Request) {
  try {
    const player = await getPlayer(request);
    const stages = await loadProgress(player);
    return NextResponse.json({ stages });
  } catch (error) {
    return NextResponse.json({ error: toApiErrorMessage(error, "Unable to load progress.") }, { status: 400 });
  }
}
