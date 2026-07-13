import { describe, expect, it } from "vitest";
import {
  buildDailyDefinition,
  buildStageDefinition,
  calculateStars,
  countCorrectPositions,
  isStageUnlocked,
  seededShuffle,
  sortLeaderboard,
  validateGuess
} from "./engine";
import { difficulties, formatCountdown } from "./config";

describe("game engine", () => {
  it("counts exact positional matches only", () => {
    expect(countCorrectPositions(["apple", "grape", "banana", "orange"], ["apple", "banana", "grape", "orange"])).toBe(2);
  });

  it("creates stable seeded shuffles", () => {
    const items = ["a", "b", "c", "d", "e"];
    expect(seededShuffle(items, "same")).toEqual(seededShuffle(items, "same"));
    expect(seededShuffle(items, "same")).not.toEqual(items);
  });

  it("generates the same daily puzzle for the same date", () => {
    const date = new Date("2026-07-10T12:00:00.000Z");
    expect(buildDailyDefinition(date)).toEqual(buildDailyDefinition(date));
  });

  it("maps stage difficulties and item counts", () => {
    expect(buildStageDefinition(1).difficulty).toBe("easy");
    expect(buildStageDefinition(40).difficulty).toBe("legend");
    expect(buildStageDefinition(40).itemCount).toBe(difficulties.legend.itemCount);
  });

  it("calculates stars from attempts and duration", () => {
    expect(calculateStars(4, 30_000, 5, 45)).toBe(3);
    expect(calculateStars(4, 90_000, 5, 45)).toBe(2);
    expect(calculateStars(9, 90_000, 5, 45)).toBe(1);
  });

  it("sorts leaderboards by guesses then time", () => {
    const sorted = sortLeaderboard([
      { attemptCount: 5, durationMs: 1000, completedAt: "2026-01-01" },
      { attemptCount: 4, durationMs: 5000, completedAt: "2026-01-02" },
      { attemptCount: 4, durationMs: 3000, completedAt: "2026-01-03" }
    ]);
    expect(sorted.map((entry) => entry.durationMs)).toEqual([3000, 5000, 1000]);
  });

  it("rejects invalid guesses", () => {
    expect(validateGuess(["a", "b", "b"], ["a", "b", "c"]).valid).toBe(false);
    expect(validateGuess(["a", "b", "x"], ["a", "b", "c"]).valid).toBe(false);
    expect(validateGuess(["a", "b", "c"], ["a", "b", "c"]).valid).toBe(true);
  });

  it("unlocks each difficulty entry stage and then gates within that difficulty", () => {
    expect(isStageUnlocked(1, new Set())).toBe(true);
    expect(isStageUnlocked(6, new Set())).toBe(true);
    expect(isStageUnlocked(11, new Set())).toBe(true);
    expect(isStageUnlocked(16, new Set())).toBe(true);
    expect(isStageUnlocked(21, new Set())).toBe(true);
    expect(isStageUnlocked(26, new Set())).toBe(true);
    expect(isStageUnlocked(31, new Set())).toBe(true);
    expect(isStageUnlocked(36, new Set())).toBe(true);
    expect(isStageUnlocked(2, new Set())).toBe(false);
    expect(isStageUnlocked(7, new Set())).toBe(false);
    expect(isStageUnlocked(2, new Set([1]))).toBe(true);
    expect(isStageUnlocked(7, new Set([6]))).toBe(true);
  });

  it("formats daily countdowns with hours", () => {
    expect(formatCountdown(10 * 60 * 60 * 1000 + 10 * 60 * 1000 + 1000)).toBe("10:10:01");
    expect(formatCountdown(10 * 60 * 1000 + 1000)).toBe("10:01");
  });
});
