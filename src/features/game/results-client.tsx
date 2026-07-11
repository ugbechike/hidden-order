"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Copy, Play, Share2, Star, StepForward } from "lucide-react";
import { formatDuration } from "./config";
import { buildShareText } from "./share";
import type { GameSessionView } from "./types";
import { usePlayer } from "@/features/profile/player-context";

export function ResultsClient() {
  const { ready, headers } = usePlayer();
  const searchParams = useSearchParams();
  const [session, setSession] = useState<GameSessionView | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ready) return;
    const sessionId = searchParams.get("session");
    const cached = localStorage.getItem("hidden-order-last-session");
    if (cached) {
      const parsed = JSON.parse(cached) as GameSessionView;
      if (!sessionId || parsed.id === sessionId) setSession(parsed);
    }
    if (!sessionId) return;
    async function load() {
      const response = await fetch(`/api/game/session?id=${sessionId}`, { headers });
      const payload = await response.json();
      if (response.ok) setSession(payload.session);
      else setError(payload.error ?? "Unable to load results.");
    }
    load();
  }, [headers, ready, searchParams]);

  async function share() {
    if (!session) return;
    const text = buildShareText(session);
    if (navigator.share) {
      await navigator.share({ text });
      return;
    }
    await navigator.clipboard.writeText(text);
    setCopied(true);
  }

  if (error && !session) return <div className="rounded-[30px] bg-white p-6 font-bold text-berry shadow-soft">{error}</div>;
  if (!session) return <div className="rounded-[30px] bg-white p-6 font-black shadow-soft">Loading results...</div>;

  const nextStage = session.stageNumber && session.stageNumber < 40 ? session.stageNumber + 1 : undefined;

  return (
    <main className="grid gap-4">
      <section className="celebrate rounded-[30px] bg-mango p-6 text-ink shadow-pop">
        <p className="text-sm font-black uppercase tracking-wide text-ink/60">Puzzle completed</p>
        <h1 className="text-4xl font-black">You found the order.</h1>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label="Time" value={formatDuration(session.durationMs ?? 0)} />
          <Metric label="Guesses" value={String(session.attemptCount)} />
          <Metric label="Stars" value={session.gameType === "stage" ? `${session.stars ?? 1}/3` : "--"} />
          <Metric label="Rank" value={session.dailyRank ? `#${session.dailyRank}` : "--"} />
        </div>
      </section>

      <section className="rounded-[30px] bg-white/85 p-5 shadow-soft">
        <h2 className="text-2xl font-black">Guess path</h2>
        <ol className="mt-3 grid gap-2">
          {session.guesses.map((guess, index) => (
            <li key={`${guess.createdAt}-${index}`} className="flex items-center justify-between rounded-2xl bg-cream p-3 font-black">
              <span>Guess {index + 1}</span>
              <span>{guess.correctPositions}/{session.items.length}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <Link href={`/game?mode=${session.gameType}${session.stageNumber ? `&stage=${session.stageNumber}` : ""}`} className="flex items-center justify-center gap-2 rounded-[24px] bg-ink px-5 py-4 font-black text-white shadow-pop">
          <Play size={20} aria-hidden />
          Retry
        </Link>
        {nextStage ? (
          <Link href={`/game?mode=stage&stage=${nextStage}`} className="flex items-center justify-center gap-2 rounded-[24px] bg-sky px-5 py-4 font-black text-white shadow-pop">
            <StepForward size={20} aria-hidden />
            Next Stage
          </Link>
        ) : null}
        <button onClick={share} className="flex items-center justify-center gap-2 rounded-[24px] bg-berry px-5 py-4 font-black text-white shadow-pop">
          {copied ? <Copy size={20} aria-hidden /> : <Share2 size={20} aria-hidden />}
          {copied ? "Copied" : "Share Result"}
        </button>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/70 px-4 py-3">
      <p className="text-xs font-black uppercase text-ink/50">{label}</p>
      <p className="mt-1 flex items-center gap-1 text-xl font-black">
        {label === "Stars" && value !== "--" ? <Star size={18} fill="currentColor" aria-hidden /> : null}
        {value}
      </p>
    </div>
  );
}
