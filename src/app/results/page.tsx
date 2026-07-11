import { Suspense } from "react";
import { ResultsClient } from "@/features/game/results-client";

export default function ResultsPage() {
  return (
    <Suspense fallback={<div className="rounded-[30px] bg-white p-6 font-black shadow-soft">Loading...</div>}>
      <ResultsClient />
    </Suspense>
  );
}
