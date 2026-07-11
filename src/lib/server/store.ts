import {
  buildDailyDefinition,
  buildStageDefinition,
  calculateStars,
  countCorrectPositions,
  makeInitialArrangement,
  sortLeaderboard,
  validateGuess
} from "@/features/game/engine";
import { difficulties } from "@/features/game/config";
import { getThemeItems, themeOrder } from "@/features/game/themes";
import type { Difficulty, GameSessionView, GameType, LeaderboardEntry, StageSummary, ThemeId } from "@/features/game/types";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Player } from "./auth";
import { getLocalDailyRank, localStore, StoredSession, upsertLocalCompletion } from "./local-store";

function cryptoId(prefix: string) {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
}

function serializeLocalSession(session: StoredSession): GameSessionView {
  return {
    id: session.id,
    gameType: session.gameType,
    stageId: session.stageId,
    dailyPuzzleId: session.dailyPuzzleId,
    stageNumber: session.stageNumber,
    difficulty: session.difficulty,
    theme: session.theme,
    items: getThemeItems(session.theme, session.items.length),
    arrangement: session.arrangement,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    attemptCount: session.attemptCount,
    durationMs: session.durationMs,
    status: session.status,
    isOfficial: session.isOfficial,
    guesses: session.guesses,
    stars: session.stars,
    dailyRank: getLocalDailyRank(session)
  };
}

async function ensureProfile(player: Player) {
  const admin = createAdminClient();
  if (!admin) return;
  await admin.from("profiles").upsert({
    id: player.id,
    display_name: player.displayName,
    updated_at: new Date().toISOString()
  });
}

export async function startGame(player: Player, input: { gameType: GameType; stageNumber?: number; difficulty?: Difficulty; theme?: ThemeId; timerEnabled?: boolean }) {
  await ensureProfile(player);
  const admin = createAdminClient();

  if (!admin) {
    return startLocalGame(player, input);
  }

  if (input.gameType === "stage") {
    const stageNumber = input.stageNumber ?? 1;
    const stage = buildStageDefinition(stageNumber);
    const arrangement = makeInitialArrangement(stage.items, stage.seed, stage.solution);
    const { data: session, error } = await admin
      .from("game_sessions")
      .insert({
        player_id: player.id,
        game_type: "stage",
        stage_id: stage.id,
        difficulty: stage.difficulty,
        theme: stage.theme,
        started_at: new Date().toISOString(),
        attempt_count: 0,
        status: "active",
        is_official: true
      })
      .select("id, started_at")
      .single();

    if (error) throw new Error(error.message);
    return {
      id: session.id,
      gameType: "stage",
      stageId: stage.id,
      stageNumber,
      difficulty: stage.difficulty,
      theme: stage.theme,
      items: stage.items,
      arrangement,
      startedAt: session.started_at,
      attemptCount: 0,
      status: "active",
      isOfficial: true,
      guesses: []
    } satisfies GameSessionView;
  }

  if (input.gameType === "daily") {
    const daily = await ensureDailyPuzzle();
    const existing = await getOfficialDailySession(player.id, daily.id);
    const arrangement = makeInitialArrangement(daily.items, daily.seed, daily.solution);
    if (existing) return existing;

    const { data: session, error } = await admin
      .from("game_sessions")
      .insert({
        player_id: player.id,
        game_type: "daily",
        daily_puzzle_id: daily.id,
        difficulty: daily.difficulty,
        theme: daily.theme,
        started_at: new Date().toISOString(),
        attempt_count: 0,
        status: "active",
        is_official: true
      })
      .select("id, started_at")
      .single();
    if (error) throw new Error(error.message);
    return {
      id: session.id,
      gameType: "daily",
      dailyPuzzleId: daily.id,
      difficulty: daily.difficulty,
      theme: daily.theme,
      items: daily.items,
      arrangement,
      startedAt: session.started_at,
      attemptCount: 0,
      status: "active",
      isOfficial: true,
      guesses: []
    } satisfies GameSessionView;
  }

  return startLocalGame(player, input);
}

function startLocalGame(player: Player, input: { gameType: GameType; stageNumber?: number; difficulty?: Difficulty; theme?: ThemeId }) {
  const stageNumber = input.gameType === "stage" ? (input.stageNumber ?? 1) : undefined;
  const definition =
    input.gameType === "stage"
      ? buildStageDefinition(stageNumber ?? 1)
      : input.gameType === "daily"
        ? buildDailyDefinition()
        : buildPracticeDefinition(input.difficulty ?? "easy", input.theme ?? "fruits");
  const now = new Date().toISOString();
  const existingDaily =
    input.gameType === "daily"
      ? [...localStore.sessions.values()].find(
          (session) =>
            session.playerId === player.id &&
            session.gameType === "daily" &&
            session.dailyPuzzleId === definition.id &&
            session.isOfficial
        )
      : undefined;
  if (existingDaily) return serializeLocalSession(existingDaily);

  const session: StoredSession = {
    id: cryptoId("session"),
    playerId: player.id,
    displayName: player.displayName,
    gameType: input.gameType,
    stageId: input.gameType === "stage" ? definition.id : undefined,
    dailyPuzzleId: input.gameType === "daily" ? definition.id : undefined,
    stageNumber,
    difficulty: definition.difficulty,
    theme: definition.theme,
    items: definition.items.map((item) => item.id),
    solution: definition.solution,
    arrangement: makeInitialArrangement(definition.items, definition.seed, definition.solution),
    startedAt: now,
    attemptCount: 0,
    status: "active",
    isOfficial: input.gameType !== "practice",
    targetGuesses: definition.targetGuesses,
    targetTimeSeconds: definition.targetTimeSeconds,
    guesses: []
  };
  localStore.sessions.set(session.id, session);
  return serializeLocalSession(session);
}

function buildPracticeDefinition(difficulty: Difficulty, theme: ThemeId) {
  const config = difficulties[difficulty];
  const seed = `hidden-order:practice:${difficulty}:${theme}:${Date.now()}`;
  const items = getThemeItems(theme, config.itemCount);
  return {
    id: cryptoId("practice"),
    difficulty,
    theme,
    items,
    solution: makeInitialArrangement(items, `${seed}:solution`, []),
    seed,
    targetGuesses: config.targetGuesses,
    targetTimeSeconds: config.targetTimeSeconds
  };
}

async function ensureDailyPuzzle() {
  const admin = createAdminClient();
  const definition = buildDailyDefinition();
  if (!admin) return definition;

  const { data: existing } = await admin.from("daily_puzzles").select("*").eq("puzzle_date", definition.puzzleDate).maybeSingle();
  if (existing) {
    return {
      ...definition,
      id: existing.id,
      difficulty: existing.difficulty,
      theme: existing.theme,
      itemCount: existing.item_count,
      seed: existing.seed,
      solution: existing.solution
    };
  }

  const { data, error } = await admin
    .from("daily_puzzles")
    .insert({
      id: definition.id,
      puzzle_date: definition.puzzleDate,
      difficulty: definition.difficulty,
      theme: definition.theme,
      item_count: definition.itemCount,
      seed: definition.seed,
      solution: definition.solution
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return { ...definition, id: data.id };
}

async function getOfficialDailySession(playerId: string, dailyPuzzleId: string) {
  const admin = createAdminClient();
  if (!admin) return undefined;
  const { data } = await admin
    .from("game_sessions")
    .select("id, difficulty, theme, started_at, completed_at, attempt_count, duration_ms, status, is_official, guesses(arrangement, correct_positions, created_at)")
    .eq("player_id", playerId)
    .eq("daily_puzzle_id", dailyPuzzleId)
    .eq("is_official", true)
    .maybeSingle();
  if (!data) return undefined;
  const daily = buildDailyDefinition();
  return {
    id: data.id,
    gameType: "daily",
    dailyPuzzleId,
    difficulty: data.difficulty,
    theme: data.theme,
    items: daily.items,
    arrangement: makeInitialArrangement(daily.items, daily.seed, daily.solution),
    startedAt: data.started_at,
    completedAt: data.completed_at,
    attemptCount: data.attempt_count,
    durationMs: data.duration_ms,
    status: data.status,
    isOfficial: data.is_official,
    guesses: (data.guesses ?? []).map((guess: { arrangement: string[]; correct_positions: number; created_at: string }) => ({
      arrangement: guess.arrangement,
      correctPositions: guess.correct_positions,
      createdAt: guess.created_at
    }))
  } satisfies GameSessionView;
}

export async function submitGuess(player: Player, sessionId: string, arrangement: string[]) {
  const admin = createAdminClient();
  if (!admin) return submitLocalGuess(player, sessionId, arrangement);

  const { data: session, error } = await admin.from("game_sessions").select("*").eq("id", sessionId).eq("player_id", player.id).single();
  if (error || !session) throw new Error("Game session not found.");
  if (session.status !== "active") throw new Error("This game is already complete.");

  const definition =
    session.game_type === "stage"
      ? buildStageDefinition(Number(String(session.stage_id).replace("stage-", "")))
      : session.game_type === "daily"
        ? await ensureDailyPuzzle()
        : buildPracticeDefinition(session.difficulty, session.theme);
  const requiredItems = definition.items.map((item) => item.id);
  const validation = validateGuess(arrangement, requiredItems);
  if (!validation.valid) throw new Error(validation.error);

  const correctPositions = countCorrectPositions(arrangement, definition.solution);
  const nextAttemptCount = session.attempt_count + 1;
  const completed = correctPositions === definition.solution.length;
  const now = new Date();
  const durationMs = completed ? now.getTime() - new Date(session.started_at).getTime() : null;

  await admin.from("guesses").insert({
    game_session_id: session.id,
    arrangement,
    correct_positions: correctPositions
  });
  await admin
    .from("game_sessions")
    .update({
      attempt_count: nextAttemptCount,
      status: completed ? "completed" : "active",
      completed_at: completed ? now.toISOString() : null,
      duration_ms: durationMs
    })
    .eq("id", session.id);

  if (completed && session.game_type === "stage" && durationMs !== null) {
    const stars = calculateStars(nextAttemptCount, durationMs, definition.targetGuesses, definition.targetTimeSeconds);
    await admin.from("player_stage_progress").upsert(
      {
        player_id: player.id,
        stage_id: session.stage_id,
        completed: true,
        stars,
        best_attempt_count: nextAttemptCount,
        best_duration_ms: durationMs,
        completed_at: now.toISOString(),
        updated_at: now.toISOString()
      },
      { onConflict: "player_id,stage_id" }
    );
  }

  return getSession(player, session.id, arrangement);
}

function submitLocalGuess(player: Player, sessionId: string, arrangement: string[]) {
  const session = localStore.sessions.get(sessionId);
  if (!session || session.playerId !== player.id) throw new Error("Game session not found.");
  if (session.status !== "active") throw new Error("This game is already complete.");
  const validation = validateGuess(arrangement, session.items);
  if (!validation.valid) throw new Error(validation.error);

  const correctPositions = countCorrectPositions(arrangement, session.solution);
  const now = new Date();
  session.arrangement = arrangement;
  session.attemptCount += 1;
  session.guesses.push({ arrangement, correctPositions, createdAt: now.toISOString() });
  if (correctPositions === session.solution.length) {
    session.status = "completed";
    session.completedAt = now.toISOString();
    session.durationMs = now.getTime() - new Date(session.startedAt).getTime();
    session.stars = calculateStars(session.attemptCount, session.durationMs, session.targetGuesses, session.targetTimeSeconds);
    upsertLocalCompletion(session);
  }
  localStore.sessions.set(session.id, session);
  return serializeLocalSession(session);
}

export async function getSession(player: Player, sessionId: string, fallbackArrangement?: string[]) {
  const admin = createAdminClient();
  if (!admin) {
    const session = localStore.sessions.get(sessionId);
    if (!session || session.playerId !== player.id) throw new Error("Game session not found.");
    return serializeLocalSession(session);
  }

  const { data, error } = await admin
    .from("game_sessions")
    .select("*, guesses(arrangement, correct_positions, created_at)")
    .eq("id", sessionId)
    .eq("player_id", player.id)
    .single();
  if (error || !data) throw new Error("Game session not found.");
  const definition =
    data.game_type === "stage"
      ? buildStageDefinition(Number(String(data.stage_id).replace("stage-", "")))
      : data.game_type === "daily"
        ? await ensureDailyPuzzle()
        : buildPracticeDefinition(data.difficulty, data.theme);

  return {
    id: data.id,
    gameType: data.game_type,
    stageId: data.stage_id,
    dailyPuzzleId: data.daily_puzzle_id,
    stageNumber: data.stage_id ? Number(String(data.stage_id).replace("stage-", "")) : undefined,
    difficulty: data.difficulty,
    theme: data.theme,
    items: definition.items,
    arrangement: fallbackArrangement ?? makeInitialArrangement(definition.items, definition.seed, definition.solution),
    startedAt: data.started_at,
    completedAt: data.completed_at,
    attemptCount: data.attempt_count,
    durationMs: data.duration_ms,
    status: data.status,
    isOfficial: data.is_official,
    guesses: (data.guesses ?? []).map((guess: { arrangement: string[]; correct_positions: number; created_at: string }) => ({
      arrangement: guess.arrangement,
      correctPositions: guess.correct_positions,
      createdAt: guess.created_at
    }))
  } satisfies GameSessionView;
}

export async function loadProgress(player: Player) {
  const admin = createAdminClient();
  if (!admin) {
    const progress = localStore.progress.get(player.id) ?? new Map();
    const completedStages = new Set([...progress.values()].filter((item) => item.completed).map((item) => item.stageNumber));
    return Array.from({ length: 40 }, (_, index) => {
      const stage = buildStageDefinition(index + 1);
      const record = progress.get(stage.id);
      return {
        id: stage.id,
        stageNumber: stage.stageNumber,
        difficulty: stage.difficulty,
        theme: stage.theme,
        itemCount: stage.itemCount,
        targetGuesses: stage.targetGuesses,
        targetTimeSeconds: stage.targetTimeSeconds,
        locked: stage.stageNumber !== 1 && !completedStages.has(stage.stageNumber - 1),
        completed: record?.completed ?? false,
        stars: record?.stars ?? 0,
        bestAttemptCount: record?.bestAttemptCount,
        bestDurationMs: record?.bestDurationMs
      } satisfies StageSummary;
    });
  }

  const { data: progressRows } = await admin.from("player_stage_progress").select("*").eq("player_id", player.id);
  const progress = new Map((progressRows ?? []).map((row) => [row.stage_id, row]));
  const completedStages = new Set((progressRows ?? []).map((row) => Number(String(row.stage_id).replace("stage-", ""))));
  return Array.from({ length: 40 }, (_, index) => {
    const stage = buildStageDefinition(index + 1);
    const record = progress.get(stage.id);
    return {
      id: stage.id,
      stageNumber: stage.stageNumber,
      difficulty: stage.difficulty,
      theme: stage.theme,
      itemCount: stage.itemCount,
      targetGuesses: stage.targetGuesses,
      targetTimeSeconds: stage.targetTimeSeconds,
      locked: stage.stageNumber !== 1 && !completedStages.has(stage.stageNumber - 1),
      completed: Boolean(record?.completed),
      stars: record?.stars ?? 0,
      bestAttemptCount: record?.best_attempt_count,
      bestDurationMs: record?.best_duration_ms
    } satisfies StageSummary;
  });
}

export async function loadLeaderboard(player: Player, options?: { stageId?: string }) {
  const admin = createAdminClient();
  if (!admin) {
    const daily = buildDailyDefinition();
    const completed = [...localStore.sessions.values()].filter((session) => {
      if (options?.stageId) return session.stageId === options.stageId && session.status === "completed";
      return session.gameType === "daily" && session.dailyPuzzleId === daily.id && session.status === "completed";
    });
    return sortLeaderboard(
      completed.map((session) => ({
        displayName: session.displayName,
        attemptCount: session.attemptCount,
        durationMs: session.durationMs ?? 0,
        completedAt: session.completedAt ?? ""
      }))
    ).map((entry, index) => ({ ...entry, rank: index + 1 })) satisfies LeaderboardEntry[];
  }

  const query = admin
    .from("game_sessions")
    .select("attempt_count, duration_ms, completed_at, profiles(display_name)")
    .eq("status", "completed")
    .not("duration_ms", "is", null);
  if (options?.stageId) {
    query.eq("stage_id", options.stageId);
  } else {
    const daily = await ensureDailyPuzzle();
    query.eq("daily_puzzle_id", daily.id).eq("is_official", true);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return sortLeaderboard(
    (data ?? []).map((row) => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      return {
        displayName: profile?.display_name ?? "Player",
        attemptCount: row.attempt_count,
        durationMs: row.duration_ms,
        completedAt: row.completed_at
      };
    })
  ).map((entry, index) => ({ ...entry, rank: index + 1 })) satisfies LeaderboardEntry[];
}

export function getPracticeOptions() {
  return {
    difficulties: Object.entries(difficulties).map(([id, config]) => ({ id, ...config })),
    themes: themeOrder
  };
}
