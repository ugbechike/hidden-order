import { formatDuration } from "./config";
import type { GameSessionView } from "./types";

export function buildShareText(session: GameSessionView) {
  const title =
    session.gameType === "daily"
      ? "Hidden Order - Daily Puzzle"
      : session.gameType === "stage"
        ? `Hidden Order - Stage ${session.stageNumber}`
        : "Hidden Order - Practice";
  const lines = session.guesses.map((guess) => `${guess.correctPositions}/${session.items.length}`).join("\n");
  const time = session.durationMs ? formatDuration(session.durationMs) : "0:00";

  return `${title}\n\nSolved in ${session.attemptCount} guesses\nTime: ${time}\nDifficulty: ${session.difficulty}\n\n${lines}\n\nCan you beat me?`;
}
