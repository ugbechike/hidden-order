export type Difficulty =
  | "easy"
  | "normal"
  | "medium"
  | "hard"
  | "expert"
  | "master"
  | "extreme"
  | "legend";

export type ThemeId = "fruits" | "animals" | "shapes" | "desserts" | "sports";

export type GameType = "stage" | "daily" | "practice";

export type GameStatus = "active" | "completed";

export type GameItem = {
  id: string;
  label: string;
  icon: string;
};

export type GuessRecord = {
  arrangement: string[];
  correctPositions: number;
  createdAt: string;
};

export type GameSessionView = {
  id: string;
  gameType: GameType;
  stageId?: string;
  dailyPuzzleId?: string;
  stageNumber?: number;
  difficulty: Difficulty;
  theme: ThemeId;
  items: GameItem[];
  arrangement: string[];
  startedAt: string;
  completedAt?: string;
  attemptCount: number;
  durationMs?: number;
  status: GameStatus;
  isOfficial: boolean;
  guesses: GuessRecord[];
  stars?: number;
  dailyRank?: number;
};

export type StageSummary = {
  id: string;
  stageNumber: number;
  difficulty: Difficulty;
  theme: ThemeId;
  itemCount: number;
  targetGuesses: number;
  targetTimeSeconds: number;
  locked: boolean;
  completed: boolean;
  stars: number;
  bestAttemptCount?: number;
  bestDurationMs?: number;
};

export type LeaderboardEntry = {
  rank: number;
  displayName: string;
  attemptCount: number;
  durationMs: number;
  completedAt: string;
};
