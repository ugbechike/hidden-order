import type { Difficulty } from "./types";

export const difficulties: Record<
  Difficulty,
  { label: string; itemCount: number; targetGuesses: number; targetTimeSeconds: number }
> = {
  easy: { label: "Easy", itemCount: 4, targetGuesses: 5, targetTimeSeconds: 45 },
  normal: { label: "Normal", itemCount: 5, targetGuesses: 7, targetTimeSeconds: 70 },
  medium: { label: "Medium", itemCount: 6, targetGuesses: 9, targetTimeSeconds: 95 },
  hard: { label: "Hard", itemCount: 7, targetGuesses: 11, targetTimeSeconds: 125 },
  expert: { label: "Expert", itemCount: 8, targetGuesses: 13, targetTimeSeconds: 160 },
  master: { label: "Master", itemCount: 9, targetGuesses: 15, targetTimeSeconds: 200 },
  extreme: { label: "Extreme", itemCount: 10, targetGuesses: 17, targetTimeSeconds: 250 },
  legend: { label: "Legend", itemCount: 12, targetGuesses: 22, targetTimeSeconds: 330 }
};

export const difficultyOrder = Object.keys(difficulties) as Difficulty[];

export function difficultyForStage(stageNumber: number): Difficulty {
  const index = Math.max(0, Math.min(difficultyOrder.length - 1, Math.floor((stageNumber - 1) / 5)));
  return difficultyOrder[index];
}

export function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function formatCountdown(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
