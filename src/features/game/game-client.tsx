"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Clock, RotateCcw, Sparkles } from "lucide-react";
import { difficulties, formatDuration } from "./config";
import { themes } from "./themes";
import type { Difficulty, GameSessionView, ThemeId } from "./types";
import { usePlayer } from "@/features/profile/player-context";

function nextMidnightCountdown() {
  const now = new Date();
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return next.getTime() - now.getTime();
}

function swap(items: string[], first: number, second: number) {
  const copy = [...items];
  [copy[first], copy[second]] = [copy[second], copy[first]];
  return copy;
}

export function GameClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { ready, headers } = usePlayer();
  const [session, setSession] = useState<GameSessionView | null>(null);
  const [arrangement, setArrangement] = useState<string[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
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
    if (!ready) return;
    let alive = true;
    async function start() {
      setLoading(true);
      setError("");
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
      }
      if (alive) setLoading(false);
    }
    start();
    return () => {
      alive = false;
    };
  }, [headers, mode, practiceDifficulty, practiceTheme, ready, stageNumber, timerEnabled]);

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
  const validArrangement = session ? new Set(arrangement).size === session.items.length && arrangement.length === session.items.length : false;

  async function submitGuess() {
    if (!session || !validArrangement || submitting) return;
    setSubmitting(true);
    setError("");
    const response = await fetch("/api/game/guess", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ sessionId: session.id, arrangement })
    });
    const payload = await response.json();
    setSubmitting(false);
    if (!response.ok) {
      setError(payload.error ?? "Unable to submit guess.");
      return;
    }
    setSession(payload.session);
    setArrangement(payload.session.arrangement);
    setSelected(null);
    navigator.vibrate?.(payload.session.status === "completed" ? [40, 50, 80] : 25);
    if (payload.session.status === "completed") {
      localStorage.setItem("hidden-order-last-session", JSON.stringify(payload.session));
      window.setTimeout(() => router.push(`/results?session=${payload.session.id}`), 650);
    }
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
              <p className="text-xs font-black uppercase text-ink/50">Guesses</p>
              <p className="font-black">{session.attemptCount}</p>
            </div>
          </div>
        </div>

        {session.gameType === "daily" ? (
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-mint/25 px-4 py-3 font-bold text-ink">
            <Clock size={18} aria-hidden />
            Next puzzle in {formatDuration(dailyCountdown)}
          </div>
        ) : null}
      </section>

      <section className="rounded-[30px] bg-ink p-4 shadow-pop">
        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: `repeat(${arrangement.length > 6 ? 6 : Math.min(arrangement.length, 4)}, minmax(0, 1fr))`
          }}
        >
          {arrangement.map((id, index) => {
            const item = itemById.get(id);
            const active = selected === index;
            return (
              <button
                key={id}
                type="button"
                data-item-id={id}
                aria-pressed={active}
                className={`swap-pop aspect-square min-h-16 rounded-[24px] border-4 text-center shadow-soft ${
                  active ? "border-mango bg-white scale-105" : "border-white/10 bg-white/95"
                }`}
                onClick={() => {
                  if (selected === null) {
                    setSelected(index);
                    navigator.vibrate?.(15);
                    return;
                  }
                  if (selected === index) {
                    setSelected(null);
                    return;
                  }
                  setArrangement((current) => swap(current, selected, index));
                  setSelected(null);
                  navigator.vibrate?.(20);
                }}
              >
                <span className="block text-3xl sm:text-4xl" aria-hidden>
                  {item?.icon}
                </span>
                <span className="mt-1 block text-[11px] font-black leading-tight text-ink sm:text-xs">{item?.label}</span>
              </button>
            );
          })}
        </div>
        <button
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-[24px] bg-berry px-5 py-4 text-lg font-black text-white shadow-pop disabled:cursor-not-allowed disabled:bg-white/25 disabled:text-white/60"
          disabled={!validArrangement || submitting || session.status === "completed"}
          onClick={submitGuess}
        >
          <Check size={22} aria-hidden />
          {submitting ? "Checking..." : "Check Arrangement"}
        </button>
        {error ? <p className="mt-3 rounded-2xl bg-white px-4 py-3 font-bold text-berry">{error}</p> : null}
      </section>

      <section className="rounded-[30px] bg-white/85 p-5 shadow-soft">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black">Previous guesses</h2>
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-full bg-cream text-ink"
            aria-label="Reset selection"
            onClick={() => setSelected(null)}
          >
            <RotateCcw size={18} aria-hidden />
          </button>
        </div>
        {session.guesses.length === 0 ? (
          <p className="mt-3 rounded-2xl bg-cream px-4 py-4 font-bold text-ink/60">No guesses yet.</p>
        ) : (
          <ol className="mt-3 grid gap-3">
            {session.guesses
              .slice()
              .reverse()
              .map((guess, index) => (
                <li key={`${guess.createdAt}-${index}`} className="rounded-2xl bg-cream p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-wrap gap-1">
                      {guess.arrangement.map((id) => (
                        <span key={id} className="grid h-9 w-9 place-items-center rounded-xl bg-white text-xl">
                          {itemById.get(id)?.icon}
                        </span>
                      ))}
                    </div>
                    <span className="whitespace-nowrap rounded-full bg-ink px-3 py-2 text-sm font-black text-white">
                      {guess.correctPositions}/{session.items.length}
                    </span>
                  </div>
                </li>
              ))}
          </ol>
        )}
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
