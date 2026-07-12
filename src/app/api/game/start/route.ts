import { NextResponse } from "next/server";
import { z } from "zod";
import { difficulties } from "@/features/game/config";
import { themes } from "@/features/game/themes";
import { getPlayer } from "@/lib/server/auth";
import { toApiErrorMessage } from "@/lib/server/errors";
import { startGame } from "@/lib/server/store";

const schema = z.object({
  gameType: z.enum(["stage", "daily", "practice"]),
  stageNumber: z.number().int().min(1).max(40).optional(),
  difficulty: z.enum(Object.keys(difficulties) as [keyof typeof difficulties, ...(keyof typeof difficulties)[]]).optional(),
  theme: z.enum(Object.keys(themes) as [keyof typeof themes, ...(keyof typeof themes)[]]).optional(),
  timerEnabled: z.boolean().optional()
});

export async function POST(request: Request) {
  try {
    const player = await getPlayer(request);
    const input = schema.parse(await request.json());
    const session = await startGame(player, input);
    return NextResponse.json({ session });
  } catch (error) {
    return NextResponse.json({ error: toApiErrorMessage(error, "Unable to start game.") }, { status: 400 });
  }
}
