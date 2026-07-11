import { NextResponse } from "next/server";
import { getPlayer } from "@/lib/server/auth";
import { getSession } from "@/lib/server/store";

export async function GET(request: Request) {
  try {
    const player = await getPlayer(request);
    const url = new URL(request.url);
    const sessionId = url.searchParams.get("id");
    if (!sessionId) throw new Error("Missing session id.");
    const session = await getSession(player, sessionId);
    return NextResponse.json({ session });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load game." }, { status: 400 });
  }
}
