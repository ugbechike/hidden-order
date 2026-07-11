import { calculateStars, sortLeaderboard } from "@/features/game/engine";
import type { Difficulty, GameStatus, GameType, GuessRecord, ThemeId } from "@/features/game/types";

export type StoredSession = {
  id: string;
  playerId: string;
  displayName: string;
  gameType: GameType;
  stageId?: string;
  dailyPuzzleId?: string;
  stageNumber?: number;
  difficulty: Difficulty;
  theme: ThemeId;
  items: string[];
  solution: string[];
  arrangement: string[];
  startedAt: string;
  completedAt?: string;
  attemptCount: number;
  durationMs?: number;
  status: GameStatus;
  isOfficial: boolean;
  targetGuesses: number;
  targetTimeSeconds: number;
  guesses: GuessRecord[];
  stars?: number;
};

type ProgressRecord = {
  stageId: string;
  stageNumber: number;
  completed: boolean;
  stars: number;
  bestAttemptCount?: number;
  bestDurationMs?: number;
  completedAt?: string;
};

type PersonalRecord = {
  difficulty: Difficulty;
  bestAttemptCount?: number;
  bestDurationMs?: number;
};

const globalStore = globalThis as typeof globalThis & {
  __hiddenOrderStore?: {
    sessions: Map<string, StoredSession>;
    progress: Map<string, Map<string, ProgressRecord>>;
    personalRecords: Map<string, Map<Difficulty, PersonalRecord>>;
  };
};

export const localStore =
  globalStore.__hiddenOrderStore ??
  (globalStore.__hiddenOrderStore = {
    sessions: new Map<string, StoredSession>(),
    progress: new Map<string, Map<string, ProgressRecord>>(),
    personalRecords: new Map<string, Map<Difficulty, PersonalRecord>>()
  });

export function upsertLocalCompletion(session: StoredSession) {
  if (session.gameType === "stage" && session.stageId && session.stageNumber && session.durationMs) {
    const playerProgress = localStore.progress.get(session.playerId) ?? new Map<string, ProgressRecord>();
    const existing = playerProgress.get(session.stageId);
    const stars = calculateStars(
      session.attemptCount,
      session.durationMs,
      session.targetGuesses,
      session.targetTimeSeconds
    );
    playerProgress.set(session.stageId, {
      stageId: session.stageId,
      stageNumber: session.stageNumber,
      completed: true,
      stars: Math.max(existing?.stars ?? 0, stars),
      bestAttemptCount: Math.min(existing?.bestAttemptCount ?? Infinity, session.attemptCount),
      bestDurationMs: Math.min(existing?.bestDurationMs ?? Infinity, session.durationMs),
      completedAt: session.completedAt
    });
    localStore.progress.set(session.playerId, playerProgress);
  }

  if (session.gameType === "practice" && session.durationMs) {
    const records = localStore.personalRecords.get(session.playerId) ?? new Map<Difficulty, PersonalRecord>();
    const existing = records.get(session.difficulty);
    records.set(session.difficulty, {
      difficulty: session.difficulty,
      bestAttemptCount: Math.min(existing?.bestAttemptCount ?? Infinity, session.attemptCount),
      bestDurationMs: Math.min(existing?.bestDurationMs ?? Infinity, session.durationMs)
    });
    localStore.personalRecords.set(session.playerId, records);
  }
}

export function getLocalDailyRank(session: StoredSession) {
  if (session.gameType !== "daily" || !session.dailyPuzzleId || session.status !== "completed") return undefined;
  const completed = [...localStore.sessions.values()].filter(
    (candidate) =>
      candidate.gameType === "daily" &&
      candidate.dailyPuzzleId === session.dailyPuzzleId &&
      candidate.status === "completed" &&
      candidate.durationMs !== undefined
  );
  const sorted = sortLeaderboard(
    completed.map((entry) => ({
      sessionId: entry.id,
      attemptCount: entry.attemptCount,
      durationMs: entry.durationMs ?? 0,
      completedAt: entry.completedAt ?? ""
    }))
  );
  return sorted.findIndex((entry) => entry.sessionId === session.id) + 1 || undefined;
}
