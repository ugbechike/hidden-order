"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Lock, Star } from "lucide-react";
import { difficulties, difficultyOrder, formatDuration } from "@/features/game/config";
import type { StageSummary } from "@/features/game/types";
import { usePlayer } from "@/features/profile/player-context";

export function StageSelectionClient() {
  const { ready, headers } = usePlayer();
  const [stages, setStages] = useState<StageSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ready) return;
    async function load() {
      const response = await fetch("/api/progress", { headers });
      const payload = await response.json();
      if (!response.ok) setError(payload.error ?? "Unable to load stages.");
      else setStages(payload.stages);
      setLoading(false);
    }
    load();
  }, [headers, ready]);

  const grouped = useMemo(
    () =>
      difficultyOrder.map((difficulty) => ({
        difficulty,
        stages: stages.filter((stage) => stage.difficulty === difficulty)
      })),
    [stages]
  );

  if (loading) return <div className="rounded-[30px] bg-white p-6 font-black shadow-soft">Loading stages...</div>;
  if (error) return <div className="rounded-[30px] bg-white p-6 font-bold text-berry shadow-soft">{error}</div>;

  return (
    <main className="grid gap-5">
      <section className="rounded-[30px] bg-sky p-6 text-white shadow-pop">
        <p className="text-sm font-black uppercase tracking-wide text-white/75">Stage Mode</p>
        <h1 className="text-4xl font-black">40 stages. One order at a time.</h1>
      </section>

      {grouped.map((group) => (
        <section key={group.difficulty} className="rounded-[30px] bg-white/85 p-4 shadow-soft">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-2xl font-black">{difficulties[group.difficulty].label}</h2>
            <span className="rounded-full bg-cream px-3 py-2 text-sm font-black">{difficulties[group.difficulty].itemCount} objects</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {group.stages.map((stage) => {
              const content = (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-black">#{stage.stageNumber}</span>
                    {stage.locked ? <Lock size={18} aria-hidden /> : <Stars count={stage.stars} />}
                  </div>
                  <div className="mt-3 text-sm font-bold text-ink/65">
                    <p>{stage.bestAttemptCount ? `${stage.bestAttemptCount} guesses` : "No clear yet"}</p>
                    <p>{stage.bestDurationMs ? formatDuration(stage.bestDurationMs) : "Best time --"}</p>
                  </div>
                </>
              );

              return stage.locked ? (
                <div key={stage.id} className="rounded-[24px] bg-ink/10 p-4 text-ink/45">
                  {content}
                </div>
              ) : (
                <Link key={stage.id} href={`/game?mode=stage&stage=${stage.stageNumber}`} className="rounded-[24px] bg-cream p-4 shadow-soft transition active:scale-[0.98]">
                  {content}
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </main>
  );
}

function Stars({ count }: { count: number }) {
  return (
    <span className="flex gap-0.5 text-mango" aria-label={`${count} stars`}>
      {[0, 1, 2].map((index) => (
        <Star key={index} size={16} fill={index < count ? "currentColor" : "none"} aria-hidden />
      ))}
    </span>
  );
}
