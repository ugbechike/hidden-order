"use client";

import { useEffect, useState } from "react";
import { Medal } from "lucide-react";
import { formatDuration } from "@/features/game/config";
import type { LeaderboardEntry } from "@/features/game/types";
import { usePlayer } from "@/features/profile/player-context";

export function LeaderboardClient() {
  const { ready, headers } = usePlayer();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [stageId, setStageId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    async function load() {
      setLoading(true);
      const query = stageId ? `?stageId=${stageId}` : "";
      const response = await fetch(`/api/leaderboard${query}`, { headers });
      const payload = await response.json();
      setEntries(response.ok ? payload.entries : []);
      setLoading(false);
    }
    load();
  }, [headers, ready, stageId]);

  return (
    <main className="grid gap-4">
      <section className="rounded-[30px] bg-lilac p-6 text-white shadow-pop">
        <p className="text-sm font-black uppercase tracking-wide text-white/75">Leaderboard</p>
        <h1 className="text-4xl font-black">Fewest guesses wins.</h1>
      </section>

      <section className="rounded-[30px] bg-white/85 p-4 shadow-soft">
        <label className="grid gap-2 text-sm font-black">
          Board
          <select className="rounded-2xl border-2 border-ink/10 bg-white px-4 py-3" value={stageId} onChange={(event) => setStageId(event.target.value)}>
            <option value="">Daily leaderboard</option>
            {Array.from({ length: 40 }, (_, index) => (
              <option key={index + 1} value={`stage-${index + 1}`}>
                Stage {index + 1}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="rounded-[30px] bg-white/85 p-4 shadow-soft">
        {loading ? (
          <p className="rounded-2xl bg-cream p-4 font-black">Loading scores...</p>
        ) : entries.length === 0 ? (
          <p className="rounded-2xl bg-cream p-4 font-black text-ink/60">No completed scores yet.</p>
        ) : (
          <ol className="grid gap-3">
            {entries.map((entry) => (
              <li key={`${entry.rank}-${entry.displayName}-${entry.completedAt}`} className="flex items-center gap-3 rounded-2xl bg-cream p-3">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-mango font-black">#{entry.rank}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-black">{entry.displayName}</p>
                  <p className="text-sm font-bold text-ink/60">{entry.attemptCount} guesses · {formatDuration(entry.durationMs)}</p>
                </div>
                {entry.rank <= 3 ? <Medal className="text-berry" aria-hidden /> : null}
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
