import { difficulties, difficultyForStage } from "./config";
import { getThemeItems, themeOrder } from "./themes";
import type { Difficulty, GameItem } from "./types";

export function hashString(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function createSeededRandom(seed: string) {
  let state = hashString(seed) || 1;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle<T>(items: T[], seed: string) {
  const random = createSeededRandom(seed);
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

export function countCorrectPositions(guess: string[], solution: string[]) {
  return guess.reduce((count, item, index) => count + (item === solution[index] ? 1 : 0), 0);
}

export function validateGuess(guess: string[], requiredItems: string[]) {
  if (guess.length !== requiredItems.length) {
    return { valid: false, error: "Arrangement has the wrong number of objects." };
  }

  const expected = new Set(requiredItems);
  if (expected.size !== requiredItems.length) {
    return { valid: false, error: "Puzzle definition contains duplicate objects." };
  }

  const seen = new Set<string>();
  for (const item of guess) {
    if (!expected.has(item)) {
      return { valid: false, error: "Arrangement includes an object that is not in this puzzle." };
    }
    if (seen.has(item)) {
      return { valid: false, error: "Arrangement includes a duplicate object." };
    }
    seen.add(item);
  }

  return { valid: true as const };
}

export function calculateStars(attemptCount: number, durationMs: number, targetGuesses: number, targetTimeSeconds: number) {
  if (attemptCount <= 0) return 0;
  if (attemptCount <= targetGuesses && durationMs <= targetTimeSeconds * 1000) return 3;
  if (attemptCount <= targetGuesses) return 2;
  return 1;
}

export function sortLeaderboard<T extends { attemptCount: number; durationMs: number; completedAt: string }>(entries: T[]) {
  return [...entries].sort((a, b) => {
    if (a.attemptCount !== b.attemptCount) return a.attemptCount - b.attemptCount;
    if (a.durationMs !== b.durationMs) return a.durationMs - b.durationMs;
    return a.completedAt.localeCompare(b.completedAt);
  });
}

export function isStageUnlocked(stageNumber: number, completedStages: Set<number>) {
  const isDifficultyEntryStage = (stageNumber - 1) % 5 === 0;
  return isDifficultyEntryStage || completedStages.has(stageNumber - 1);
}

export function buildStageDefinition(stageNumber: number) {
  const difficulty = difficultyForStage(stageNumber);
  const config = difficulties[difficulty];
  const theme = themeOrder[(stageNumber - 1) % themeOrder.length];
  const seed = `hidden-order:stage:${stageNumber}:${difficulty}:${theme}`;
  const items = getThemeItems(theme, config.itemCount);
  const solution = seededShuffle(
    items.map((item) => item.id),
    `${seed}:solution`
  );

  return {
    id: `stage-${stageNumber}`,
    stageNumber,
    difficulty,
    theme,
    itemCount: config.itemCount,
    seed,
    items,
    solution,
    targetGuesses: config.targetGuesses,
    targetTimeSeconds: config.targetTimeSeconds
  };
}

export function buildDailyDefinition(date = new Date()) {
  const dateKey = date.toISOString().slice(0, 10);
  const difficultyValues = Object.keys(difficulties) as Difficulty[];
  const difficulty = difficultyValues[hashString(dateKey) % difficultyValues.length];
  const theme = themeOrder[hashString(`theme:${dateKey}`) % themeOrder.length];
  const config = difficulties[difficulty];
  const seed = `hidden-order:${dateKey}:${difficulty}:${theme}`;
  const items = getThemeItems(theme, config.itemCount);
  const solution = seededShuffle(
    items.map((item) => item.id),
    `${seed}:solution`
  );

  return {
    id: `daily-${dateKey}`,
    puzzleDate: dateKey,
    difficulty,
    theme,
    itemCount: config.itemCount,
    seed,
    items,
    solution,
    targetGuesses: config.targetGuesses,
    targetTimeSeconds: config.targetTimeSeconds
  };
}

export function makeInitialArrangement(items: GameItem[], seed: string, solution: string[]) {
  let arrangement = seededShuffle(
    items.map((item) => item.id),
    `${seed}:player`
  );
  if (arrangement.join("|") === solution.join("|") && arrangement.length > 1) {
    arrangement = [arrangement[1], arrangement[0], ...arrangement.slice(2)];
  }
  return arrangement;
}
