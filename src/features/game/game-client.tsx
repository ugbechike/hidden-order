"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, Clock, Sparkles } from "lucide-react";
import { difficulties, formatCountdown, formatDuration } from "./config";
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

function swap(items: string[], first: number, second: number) {
  const copy = [...items];
  [copy[first], copy[second]] = [copy[second], copy[first]];
  return copy;
}

export function GameClient() {
  const searchParams = useSearchParams();
  const { ready, headers, authError } = usePlayer();
  const [session, setSession] = useState<GameSessionView | null>(null);
  const [arrangement, setArrangement] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [lastResult, setLastResult] = useState<{ correctPositions: number; total: number; attemptNumber: number } | null>(null);
  const [completedRevealGuess, setCompletedRevealGuess] = useState<string[] | null>(null);
  const [showBalloons, setShowBalloons] = useState(false);
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
      setCompletedRevealGuess(null);
      setShowBalloons(false);
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
        setArrangement(payload.session.arrangement);
        setSelectedIndex(null);
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

  useEffect(() => {
    if (!showBalloons) return;
    const timeout = window.setTimeout(() => setShowBalloons(false), 10_000);
    return () => window.clearTimeout(timeout);
  }, [showBalloons]);

  const itemById = useMemo(() => new Map(session?.items.map((item) => [item.id, item]) ?? []), [session]);
  const validArrangement = session ? new Set(arrangement).size === session.items.length && arrangement.length === session.items.length : false;

  function dismissOnboarding() {
    localStorage.setItem("hidden-order-onboarding-dismissed", "true");
    setShowOnboarding(false);
  }

  async function loadCompletedSession(sessionId: string) {
    const response = await fetch(`/api/game/session?id=${sessionId}`, { headers });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "Unable to load results.");
    return payload.session as GameSessionView;
  }

  async function submitGuess() {
    if (!session || !validArrangement || submitting) return;
    const guess = [...arrangement];
    setSubmitting(true);
    setError("");
    const response = await fetch("/api/game/guess", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ sessionId: session.id, arrangement: guess })
    });
    const payload = await response.json();
    if (!response.ok) {
      setSubmitting(false);
      setError(payload.error ?? "Unable to submit guess.");
      return;
    }

    const result = payload.result as { correctPositions: number; totalPositions: number; attemptNumber: number; completed: boolean };
    const guessRecord: GuessRecord = {
      arrangement: guess,
      correctPositions: result.correctPositions,
      createdAt: new Date().toISOString()
    };
    setLastResult({
      correctPositions: result.correctPositions,
      total: result.totalPositions,
      attemptNumber: result.attemptNumber
    });
    if (result.completed) {
      setCompletedRevealGuess(guess);
      setArrangement(guess);
      setShowBalloons(true);
    }
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
    setSelectedIndex(null);
    navigator.vibrate?.(result.completed ? [40, 50, 80] : 25);

    if (result.completed) {
      window.setTimeout(async () => {
        try {
          const completedSession = await loadCompletedSession(session.id);
          setSession(completedSession);
          localStorage.setItem("hidden-order-last-session", JSON.stringify(completedSession));
        } catch (loadError) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load results.");
        } finally {
          setSubmitting(false);
        }
      }, 850);
      return;
    }

    setSubmitting(false);
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
          <div className="grid w-full grid-cols-3 gap-2 text-center sm:w-auto">
            <StatCard label="Time" value={timerEnabled || session.gameType !== "practice" ? formatDuration(session.durationMs ?? elapsed) : "Off"} />
            <StatCard label="Attempts" value={String(session.attemptCount)} />
            <StatCard label="Last Result" value={lastResult ? `${lastResult.correctPositions} / ${lastResult.total}` : "—"} />
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
            Swap cards in your current guess, submit it, and use the latest clue to decide what to change next.
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
              <p className="mt-1 text-sm font-bold text-white/65">
                {completedRevealGuess ? "Matched. The hidden order is revealed." : "The answer stays hidden until every position matches."}
              </p>
            </div>
            <span className="rounded-full bg-white/10 px-3 py-2 text-sm font-black text-white">
              {completedRevealGuess ? "Matched" : "Locked"}
            </span>
          </div>
          <div className="mt-3 grid gap-2" style={{ gridTemplateColumns: `repeat(${columnsFor(session.items.length)}, minmax(0, 1fr))` }}>
            {session.items.map((item, index) => {
              const revealedItem = completedRevealGuess ? itemById.get(completedRevealGuess[index]) : undefined;
              return (
                <div
                  key={`${item.id}-${index}`}
                  className={`grid aspect-square min-h-14 place-items-center rounded-[20px] border-2 text-center font-black ${
                    revealedItem ? "border-mango bg-white text-ink shadow-soft" : "border-white/15 bg-white/10 text-2xl text-white"
                  }`}
                >
                  {revealedItem ? (
                    <>
                      <span className="block text-3xl sm:text-4xl" aria-hidden>
                        {revealedItem.icon}
                      </span>
                      <span className="mt-1 block text-[11px] leading-tight sm:text-xs">{revealedItem.label}</span>
                    </>
                  ) : (
                    "?"
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-5">
          <h2 className="text-xl font-black text-white">Your Guess</h2>
          <div
            className={`mt-3 grid gap-2 ${submitting ? "animate-pulse" : ""}`}
            style={{ gridTemplateColumns: `repeat(${columnsFor(session.items.length)}, minmax(0, 1fr))` }}
          >
            {arrangement.map((id, index) => {
              const item = itemById.get(id);
              const active = selectedIndex === index;
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
                    if (submitting || session.status === "completed") return;
                    if (selectedIndex === null) {
                      setSelectedIndex(index);
                      navigator.vibrate?.(15);
                      return;
                    }
                    if (selectedIndex === index) {
                      setSelectedIndex(null);
                      return;
                    }
                    setArrangement((current) => swap(current, selectedIndex, index));
                    setSelectedIndex(null);
                    navigator.vibrate?.(20);
                  }}
                  disabled={submitting || session.status === "completed"}
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
          disabled={!validArrangement || submitting || session.status === "completed"}
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

      {session.status === "completed" ? <CompletedActions session={session} /> : null}

      {session.status === "completed" ? (
        <div className="fixed inset-x-4 bottom-4 mx-auto flex max-w-md items-center gap-3 rounded-[26px] bg-mango p-4 font-black text-ink shadow-pop">
          <Sparkles aria-hidden />
          Matched! Choose your next move.
        </div>
      ) : null}

      {showBalloons ? <CelebrationBalloons /> : null}
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-cream px-3 py-3">
      <p className="text-[10px] font-black uppercase text-ink/50 sm:text-xs">{label}</p>
      <p className="mt-1 text-sm font-black sm:text-base">{value}</p>
    </div>
  );
}

function replayHref(session: GameSessionView) {
  if (session.gameType === "stage") return `/game?mode=stage&stage=${session.stageNumber ?? 1}`;
  return "/game?mode=practice";
}

function continueHref(session: GameSessionView) {
  if (session.gameType === "stage" && session.stageNumber && session.stageNumber < 40) {
    return `/game?mode=stage&stage=${session.stageNumber + 1}`;
  }
  if (session.gameType === "daily") return "/leaderboard";
  return "/stages";
}

function continueLabel(session: GameSessionView) {
  if (session.gameType === "stage" && session.stageNumber && session.stageNumber < 40) return "Continue";
  if (session.gameType === "daily") return "View Leaderboard";
  return "Stage Select";
}

function CompletedActions({ session }: { session: GameSessionView }) {
  return (
    <section className="rounded-[30px] bg-mango p-5 text-ink shadow-pop">
      <p className="text-sm font-black uppercase tracking-wide text-ink/60">Perfect match</p>
      <h2 className="mt-1 text-3xl font-black">You found the hidden order.</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Link href={replayHref(session)} className="rounded-[24px] bg-ink px-5 py-4 text-center font-black text-white shadow-pop">
          Play Again
        </Link>
        <Link href={continueHref(session)} className="rounded-[24px] bg-white px-5 py-4 text-center font-black text-ink shadow-soft">
          {continueLabel(session)}
        </Link>
      </div>
    </section>
  );
}

function CelebrationBalloons() {
  const balloons = Array.from({ length: 18 }, (_, index) => ({
    id: index,
    left: `${6 + ((index * 17) % 88)}%`,
    delay: `${(index % 6) * 0.28}s`,
    duration: `${6.5 + (index % 5) * 0.55}s`,
    color: ["#ffbf46", "#e83f6f", "#55d6be", "#2f80ed", "#8e6cff"][index % 5]
  }));

  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden" aria-hidden>
      {balloons.map((balloon) => (
        <span
          key={balloon.id}
          className="celebration-balloon"
          style={{
            left: balloon.left,
            animationDelay: balloon.delay,
            animationDuration: balloon.duration,
            backgroundColor: balloon.color
          }}
        />
      ))}
    </div>
  );
}
