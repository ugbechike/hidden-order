import { NextResponse } from "next/server";
import { getPlayer } from "@/lib/server/auth";
import { toApiErrorMessage } from "@/lib/server/errors";
import { loadLeaderboard } from "@/lib/server/store";

export async function GET(request: Request) {
  try {
    const player = await getPlayer(request);
    const url = new URL(request.url);
    const stageId = url.searchParams.get("stageId") ?? undefined;
    const entries = await loadLeaderboard(player, { stageId });
    return NextResponse.json({ entries });
  } catch (error) {
    return NextResponse.json({ error: toApiErrorMessage(error, "Unable to load leaderboard.") }, { status: 400 });
  }
}
