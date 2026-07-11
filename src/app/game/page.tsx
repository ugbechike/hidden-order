import { Suspense } from "react";
import { GameClient } from "@/features/game/game-client";

export default function GamePage() {
  return (
    <Suspense fallback={<div className="rounded-[30px] bg-white p-6 font-black shadow-soft">Loading...</div>}>
      <GameClient />
    </Suspense>
  );
}
