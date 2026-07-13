"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Clock, RotateCcw, Sparkles, X } from "lucide-react";
import { difficulties, difficultyOrder, formatCountdown, formatDuration } from "./config";
import { themes } from "./themes";
import type { Difficulty, GameSessionView, GuessRecord, ThemeId } from "./types";
import { usePlayer } from "@/features/profile/player-context";

function nextMidnightCountdown() {
  const now = new Date();
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return next.getTime() - now.getTime();
}

function columnsFor(itemCount: number) {
  return itemCount > 6 ? 6 : Math.min(itemCount, 4);
}

function shouldShowAttemptArrangements(difficulty: Difficulty) {
  return difficulty === "easy" || difficulty === "normal";
}

function isLegendDifficulty(difficulty: Difficulty) {
  return difficulty === "legend";
}

export function GameClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { ready, headers, authError } = usePlayer();
  const [session, setSession] = useState<GameSessionView | null>(null);
  const [objectOrder, setObjectOrder] = useState<string[]>([]);
  const [guessSlots, setGuessSlots] = useState<Array<string | null>>([]);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{ correctPositions: number; total: number } | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [dailyCountdown, setDailyCountdown] = useState(nextMidnightCountdown());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [practiceDifficulty, setPracticeDifficulty] = useState<Difficulty>("easy");
  const [practiceTheme, setPracticeTheme] = useState<ThemeId>("fruits");
  const [timerEnabled, setTimerEnabled] = useState(true);

  const mode = searchParams.get("mode") ?? "stage";
  const stageNumber = Number(searchParams.get("stage") ?? "1");

  useEffect(() => {
    setShowOnboarding(localStorage.getItem("hidden-order-onboarding-dismissed") !== "true");
  }, []);

  useEffect(() => {
    if (!ready || authError) {
      if (authError) {
        setError(authError);
        setLoading(false);
      }
      return;
    }
    let alive = true;
    async function start() {
      setLoading(true);
      setError("");
      setLastResult(null);
      const response = await fetch("/api/game/start", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          gameType: mode,
          stageNumber,
          difficulty: practiceDifficulty,
          theme: practiceTheme,
          timerEnabled
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? "Unable to start game.");
      } else if (alive) {
        setSession(payload.session);
        setObjectOrder(payload.session.arrangement);
        setGuessSlots(Array(payload.session.items.length).fill(null));
        setSelectedObjectId(null);
      }
      if (alive) setLoading(false);
    }
    start();
    return () => {
      alive = false;
    };
  }, [authError, headers, mode, practiceDifficulty, practiceTheme, ready, stageNumber, timerEnabled]);

  useEffect(() => {
    if (!session || session.status === "completed" || (!timerEnabled && session.gameType === "practice")) return;
    const tick = () => setElapsed(Date.now() - new Date(session.startedAt).getTime());
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [session, timerEnabled]);

  useEffect(() => {
    const interval = window.setInterval(() => setDailyCountdown(nextMidnightCountdown()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const itemById = useMemo(() => new Map(session?.items.map((item) => [item.id, item]) ?? []), [session]);
  const filledGuess = guessSlots.every(Boolean);
  const currentGuess = guessSlots.filter(Boolean) as string[];
  const availableIds = objectOrder.filter((id) => !guessSlots.includes(id));

  function dismissOnboarding() {
    localStorage.setItem("hidden-order-onboarding-dismissed", "true");
    setShowOnboarding(false);
  }

  function placeSelectedObject(slotIndex: number) {
    if (!selectedObjectId || submitting) return;
    setGuessSlots((current) => {
      const next = current.map((id) => (id === selectedObjectId ? null : id));
      next[slotIndex] = selectedObjectId;
      return next;
    });
    setSelectedObjectId(null);
    navigator.vibrate?.(20);
  }

  function removeSlotObject(slotIndex: number) {
    if (submitting) return;
    setGuessSlots((current) => current.map((id, index) => (index === slotIndex ? null : id)));
    navigator.vibrate?.(15);
  }

  async function loadCompletedSession(sessionId: string) {
    const response = await fetch(`/api/game/session?id=${sessionId}`, { headers });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "Unable to load results.");
    return payload.session as GameSessionView;
  }

  async function submitGuess() {
    if (!session || !filledGuess || submitting) return;
    const arrangement = [...currentGuess];
    setSubmitting(true);
    setError("");
    setLastResult(null);
    const response = await fetch("/api/game/guess", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ sessionId: session.id, arrangement })
    });
    const payload = await response.json();
    if (!response.ok) {
      setSubmitting(false);
      setError(payload.error ?? "Unable to submit guess.");
      return;
    }

    const result = payload.result as { correctPositions: number; attemptNumber: number; completed: boolean };
    const guessRecord: GuessRecord = {
      arrangement,
      correctPositions: result.correctPositions,
      createdAt: new Date().toISOString()
    };
    setLastResult({ correctPositions: result.correctPositions, total: arrangement.length });
    setSession((current) =>
      current
        ? {
            ...current,
            attemptCount: result.attemptNumber,
            guesses: [...current.guesses, guessRecord],
            status: result.completed ? "completed" : current.status
          }
        : current
    );
    navigator.vibrate?.(result.completed ? [40, 50, 80] : 25);

    window.setTimeout(async () => {
      if (result.completed) {
        try {
          const completedSession = await loadCompletedSession(session.id);
          setSession(completedSession);
          localStorage.setItem("hidden-order-last-session", JSON.stringify(completedSession));
          router.push(`/results?session=${completedSession.id}`);
        } catch (loadError) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load results.");
        } finally {
          setSubmitting(false);
        }
        return;
      }

      setGuessSlots(Array(arrangement.length).fill(null));
      setSelectedObjectId(null);
      setSubmitting(false);
    }, 850);
  }

  if (loading) {
    return <div className="grid min-h-[60vh] place-items-center rounded-[30px] bg-white/75 p-8 text-xl font-black shadow-soft">Loading puzzle...</div>;
  }

  if (error && !session) {
    return (
      <div className="rounded-[30px] bg-white p-6 shadow-soft">
        <h1 className="text-3xl font-black">Could not start</h1>
        <p className="mt-2 font-semibold text-ink/70">{error}</p>
      </div>
    );
  }

  if (!session) return null;

  return (
    <main className={`flex flex-1 flex-col gap-4 ${session.status === "completed" ? "celebrate" : ""}`}>
      {session.gameType === "practice" && session.attemptCount === 0 ? (
        <section className="grid gap-3 rounded-[26px] bg-white/85 p-4 shadow-soft sm:grid-cols-3">
          <label className="grid gap-1 text-sm font-black">
            Difficulty
            <select
              className="rounded-2xl border-2 border-ink/10 bg-white px-3 py-3"
              value={practiceDifficulty}
              onChange={(event) => setPracticeDifficulty(event.target.value as Difficulty)}
            >
              {Object.entries(difficulties).map(([id, config]) => (
                <option key={id} value={id}>
                  {config.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-black">
            Theme
            <select
              className="rounded-2xl border-2 border-ink/10 bg-white px-3 py-3"
              value={practiceTheme}
              onChange={(event) => setPracticeTheme(event.target.value as ThemeId)}
            >
              {Object.entries(themes).map(([id, theme]) => (
                <option key={id} value={id}>
                  {theme.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-end gap-3 rounded-2xl bg-cream p-3 text-sm font-black">
            <input
              type="checkbox"
              checked={timerEnabled}
              onChange={(event) => setTimerEnabled(event.target.checked)}
              className="h-6 w-6 accent-berry"
            />
            Timer
          </label>
        </section>
      ) : null}

      <section className="rounded-[30px] bg-white p-5 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-berry">{session.gameType.replace("-", " ")}</p>
            <h1 className="text-3xl font-black text-ink">
              {session.gameType === "stage" ? `Stage ${session.stageNumber}` : session.gameType === "daily" ? "Daily Puzzle" : "Practice"}
            </h1>
            <p className="mt-1 font-bold text-ink/60">
              {difficulties[session.difficulty].label} · {themes[session.theme].label}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded-2xl bg-cream px-4 py-3">
              <p className="text-xs font-black uppercase text-ink/50">Time</p>
              <p className="font-black">{timerEnabled || session.gameType !== "practice" ? formatDuration(session.durationMs ?? elapsed) : "Off"}</p>
            </div>
            <div className="rounded-2xl bg-cream px-4 py-3">
              <p className="text-xs font-black uppercase text-ink/50">Attempts</p>
              <p className="font-black">{session.attemptCount}</p>
            </div>
          </div>
        </div>

        {session.gameType === "daily" ? (
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-mint/25 px-4 py-3 font-bold text-ink">
            <Clock size={18} aria-hidden />
            Next puzzle in {formatCountdown(dailyCountdown)}
          </div>
        ) : null}
      </section>

      {showOnboarding ? (
        <section className="rounded-[26px] bg-mango p-5 text-ink shadow-pop">
          <h2 className="text-xl font-black">A secret order is hidden behind the question marks.</h2>
          <p className="mt-2 font-bold text-ink/75">
            Place every object into a position and submit your guess. The game tells you only how many positions are correct, not which ones.
          </p>
          <button className="mt-4 rounded-2xl bg-ink px-5 py-3 font-black text-white" onClick={dismissOnboarding}>
            Got it
          </button>
        </section>
      ) : null}

      <section className="rounded-[30px] bg-ink p-4 shadow-pop">
        <div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-white">Hidden Order</h2>
              <p className="mt-1 text-sm font-bold text-white/65">Build a guess to discover the hidden arrangement.</p>
            </div>
            <span className="rounded-full bg-white/10 px-3 py-2 text-sm font-black text-white">Locked</span>
          </div>
          <div className="mt-3 grid gap-2" style={{ gridTemplateColumns: `repeat(${columnsFor(session.items.length)}, minmax(0, 1fr))` }}>
            {session.items.map((item, index) => (
              <div key={`${item.id}-${index}`} className="grid aspect-square min-h-14 place-items-center rounded-[20px] border-2 border-white/15 bg-white/10 text-2xl font-black text-white">
                ?
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-black text-white">Build Your Guess</h2>
            <button
              type="button"
              className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-2 text-sm font-black text-white disabled:opacity-40"
              disabled={!selectedObjectId}
              onClick={() => setSelectedObjectId(null)}
            >
              <X size={16} aria-hidden />
              Clear
            </button>
          </div>
          <div
            className={`mt-3 grid gap-2 ${submitting ? "animate-pulse" : ""}`}
            style={{ gridTemplateColumns: `repeat(${columnsFor(session.items.length)}, minmax(0, 1fr))` }}
          >
            {guessSlots.map((id, index) => {
              const item = id ? itemById.get(id) : undefined;
              return (
                <button
                  key={index}
                  type="button"
                  data-guess-slot={index}
                  aria-label={item ? `Remove ${item.label} from slot ${index + 1}` : `Empty guess slot ${index + 1}`}
                  className={`swap-pop aspect-square min-h-16 rounded-[22px] border-4 text-center shadow-soft ${
                    selectedObjectId && !id ? "border-mango bg-white" : "border-white/10 bg-white/90"
                  }`}
                  onClick={() => {
                    if (selectedObjectId) {
                      placeSelectedObject(index);
                      return;
                    }
                    if (id) removeSlotObject(index);
                  }}
                  disabled={submitting}
                >
                  {item ? (
                    <>
                      <span className="block text-3xl sm:text-4xl" aria-hidden>
                        {item.icon}
                      </span>
                      <span className="mt-1 block text-[11px] font-black leading-tight text-ink sm:text-xs">{item.label}</span>
                    </>
                  ) : (
                    <span className="text-2xl font-black text-ink/30">+</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5">
          <h2 className="text-xl font-black text-white">Available Objects</h2>
          <div className="mt-3 grid gap-2" style={{ gridTemplateColumns: `repeat(${columnsFor(session.items.length)}, minmax(0, 1fr))` }}>
            {availableIds.map((id) => {
              const item = itemById.get(id);
              const active = selectedObjectId === id;
              return (
                <button
                  key={id}
                  type="button"
                  data-object-id={id}
                  aria-pressed={active}
                  className={`swap-pop aspect-square min-h-16 rounded-[22px] border-4 text-center shadow-soft ${
                    active ? "scale-105 border-mango bg-white" : "border-white/10 bg-white/95"
                  }`}
                  onClick={() => {
                    setSelectedObjectId((current) => (current === id ? null : id));
                    navigator.vibrate?.(15);
                  }}
                  disabled={submitting}
                >
                  <span className="block text-3xl sm:text-4xl" aria-hidden>
                    {item?.icon}
                  </span>
                  <span className="mt-1 block text-[11px] font-black leading-tight text-ink sm:text-xs">{item?.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <button
          className="sticky bottom-3 mt-5 flex w-full items-center justify-center gap-2 rounded-[24px] bg-berry px-5 py-4 text-lg font-black text-white shadow-pop disabled:cursor-not-allowed disabled:bg-white/25 disabled:text-white/60"
          disabled={!filledGuess || submitting || session.status === "completed"}
          onClick={submitGuess}
        >
          <Check size={22} aria-hidden />
          {submitting ? "Checking..." : "Submit Guess"}
        </button>
        {lastResult ? (
          <p className="mt-3 rounded-2xl bg-white px-4 py-3 text-center font-black text-ink">
            You matched {lastResult.correctPositions} of {lastResult.total} hidden positions.
          </p>
        ) : null}
        {error ? <p className="mt-3 rounded-2xl bg-white px-4 py-3 font-bold text-berry">{error}</p> : null}
      </section>

      <section className="rounded-[30px] bg-white/85 p-5 shadow-soft">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black">Attempts</h2>
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-full bg-cream text-ink"
            aria-label="Clear current selection"
            onClick={() => setSelectedObjectId(null)}
          >
            <RotateCcw size={18} aria-hidden />
          </button>
        </div>
        <AttemptsList session={session} itemById={itemById} />
      </section>

      {session.status === "completed" ? (
        <div className="fixed inset-x-4 bottom-4 mx-auto flex max-w-md items-center gap-3 rounded-[26px] bg-mango p-4 font-black text-ink shadow-pop">
          <Sparkles aria-hidden />
          Solved! Opening results...
        </div>
      ) : null}
    </main>
  );
}

function AttemptsList({
  session,
  itemById
}: {
  session: GameSessionView;
  itemById: Map<string, NonNullable<GameSessionView["items"][number]>>;
}) {
  if (session.guesses.length === 0) {
    return <p className="mt-3 rounded-2xl bg-cream px-4 py-4 font-bold text-ink/60">No attempts yet.</p>;
  }

  const latest = session.guesses[session.guesses.length - 1];
  if (isLegendDifficulty(session.difficulty)) {
    return (
      <div className="mt-3 rounded-2xl bg-cream p-4 font-black">
        <p>Attempts: {session.guesses.length}</p>
        <p className="mt-1 text-ink/70">
          Latest Result: {latest.correctPositions} / {session.items.length}
        </p>
      </div>
    );
  }

  const showArrangements = shouldShowAttemptArrangements(session.difficulty);
  const difficultyIndex = difficultyOrder.indexOf(session.difficulty);
  const resultOnly = difficultyIndex >= difficultyOrder.indexOf("medium");

  return (
    <ol className="mt-3 grid gap-3">
      {session.guesses
        .slice()
        .reverse()
        .map((guess, reverseIndex) => {
          const attemptNumber = session.guesses.length - reverseIndex;
          return (
            <li key={`${guess.createdAt}-${attemptNumber}`} className="rounded-2xl bg-cream p-3">
              {showArrangements ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-black">Attempt {attemptNumber}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {guess.arrangement.map((id) => (
                        <span key={id} className="grid h-9 w-9 place-items-center rounded-xl bg-white text-xl">
                          {itemById.get(id)?.icon}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className="whitespace-nowrap rounded-full bg-ink px-3 py-2 text-sm font-black text-white">
                    {guess.correctPositions} / {session.items.length} correct
                  </span>
                </div>
              ) : resultOnly ? (
                <div className="flex items-center justify-between gap-3 font-black">
                  <span>Attempt {attemptNumber}</span>
                  <span>
                    {guess.correctPositions} / {session.items.length}
                  </span>
                </div>
              ) : null}
            </li>
          );
        })}
    </ol>
  );
}
