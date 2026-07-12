"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type PlayerContextValue = {
  ready: boolean;
  playerId: string;
  displayName: string;
  authError?: string;
  token?: string;
  headers: HeadersInit;
  setDisplayName: (name: string) => void;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

function ensureLocalPlayerId() {
  const existing = localStorage.getItem("hidden-order-player-id");
  if (existing) return existing;
  const next = `local-${crypto.randomUUID()}`;
  localStorage.setItem("hidden-order-player-id", next);
  return next;
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [playerId, setPlayerId] = useState("");
  const [displayName, setDisplayNameState] = useState("");
  const [token, setToken] = useState<string | undefined>();
  const [authError, setAuthError] = useState<string | undefined>();

  useEffect(() => {
    let alive = true;
    async function init() {
      const savedName = localStorage.getItem("hidden-order-display-name") || "";
      const supabase = createClient();
      if (supabase) {
        setAuthError(undefined);
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          setAuthError(sessionError.message);
        }
        let session = sessionData.session;
        if (!session) {
          const { data, error } = await supabase.auth.signInAnonymously({
            options: { data: { display_name: savedName || "Player" } }
          });
          if (error) {
            setAuthError(
              `${error.message}. Enable anonymous sign-ins in Supabase Auth settings, then refresh the app.`
            );
          }
          session = data.session;
        }
        if (alive && session?.user) {
          setPlayerId(session.user.id);
          setToken(session.access_token);
          setDisplayNameState(savedName || session.user.user_metadata.display_name || "Player");
        }
      } else if (alive) {
        setPlayerId(ensureLocalPlayerId());
        setDisplayNameState(savedName || "Player");
      }
      if (alive) setReady(true);
    }
    init();
    return () => {
      alive = false;
    };
  }, []);

  const setDisplayName = (name: string) => {
    const clean = name.trim().slice(0, 24) || "Player";
    localStorage.setItem("hidden-order-display-name", clean);
    setDisplayNameState(clean);
  };

  const value = useMemo<PlayerContextValue>(() => {
    const requestHeaders: Record<string, string> = token
      ? { Authorization: `Bearer ${token}`, "x-display-name": displayName }
      : { "x-player-id": playerId, "x-display-name": displayName };

    return {
      ready,
      playerId,
      displayName,
      authError,
      token,
      headers: requestHeaders,
      setDisplayName
    };
  }, [authError, displayName, playerId, ready, token]);

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) throw new Error("usePlayer must be used inside PlayerProvider.");
  return context;
}

export function DisplayNameGate() {
  const { ready, displayName, authError, setDisplayName } = usePlayer();
  const [draft, setDraft] = useState(displayName === "Player" ? "" : displayName);

  useEffect(() => {
    if (displayName !== "Player") setDraft(displayName);
  }, [displayName]);

  if (!ready || authError || displayName !== "Player") return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/45 p-5 backdrop-blur-sm">
      <form
        className="w-full max-w-sm rounded-[28px] bg-white p-6 shadow-soft"
        onSubmit={(event) => {
          event.preventDefault();
          setDisplayName(draft);
        }}
      >
        <p className="text-sm font-bold uppercase tracking-wide text-berry">First launch</p>
        <h2 className="mt-2 text-2xl font-black text-ink">Choose your player name</h2>
        <input
          className="mt-5 w-full rounded-2xl border-2 border-ink/10 px-4 py-3 text-lg font-bold outline-none focus:border-sky"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={24}
          placeholder="Puzzle pilot"
          autoFocus
        />
        <button className="mt-4 w-full rounded-2xl bg-ink px-5 py-4 text-lg font-black text-white shadow-pop" type="submit">
          Start playing
        </button>
      </form>
    </div>
  );
}
