import { NextResponse } from "next/server";
import { z } from "zod";
import { getPlayer } from "@/lib/server/auth";
import { toApiErrorMessage } from "@/lib/server/errors";
import { submitGuess } from "@/lib/server/store";

const schema = z.object({
  sessionId: z.string().min(1),
  arrangement: z.array(z.string().min(1))
});

export async function POST(request: Request) {
  try {
    const player = await getPlayer(request);
    const input = schema.parse(await request.json());
    const session = await submitGuess(player, input.sessionId, input.arrangement);
    const latestGuess = session.guesses.at(-1);
    return NextResponse.json({
      result: {
        correctPositions: latestGuess?.correctPositions ?? 0,
        totalPositions: input.arrangement.length,
        attemptNumber: session.attemptCount,
        completed: session.status === "completed"
      }
    });
  } catch (error) {
    return NextResponse.json({ error: toApiErrorMessage(error, "Unable to submit guess.") }, { status: 400 });
  }
}
