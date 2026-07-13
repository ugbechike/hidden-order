const secret = ["🍎", "🍌", "🍇", "🍊"];
const guess = ["🍎", "🍇", "🍌", "🍊"];

export default function HowToPlayPage() {
  return (
    <main className="grid gap-4">
      <section className="rounded-[30px] bg-mint p-6 text-ink shadow-pop">
        <p className="text-sm font-black uppercase tracking-wide text-ink/60">How to Play</p>
        <h1 className="text-4xl font-black">Place, submit, deduce.</h1>
      </section>

      <section className="rounded-[30px] bg-white/85 p-5 shadow-soft">
        <div className="grid gap-4 sm:grid-cols-2">
          <Example title="A hidden order exists" items={secret} blurred />
          <Example title="Your guess gets one number" items={guess} score="2 positions are correct" />
        </div>
      </section>

      <section className="rounded-[30px] bg-white/85 p-5 text-lg font-bold leading-relaxed shadow-soft">
        <p>Tap an available object, then tap a guess slot to place it. Fill every slot and submit your guess.</p>
        <p className="mt-3">Use your attempts to compare totals. The game never marks which individual positions are correct.</p>
      </section>
    </main>
  );
}

function Example({ title, items, blurred, score }: { title: string; items: string[]; blurred?: boolean; score?: string }) {
  return (
    <div className="rounded-[26px] bg-cream p-4">
      <h2 className="font-black">{title}</h2>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {items.map((item, index) => (
          <div key={`${item}-${index}`} className={`grid aspect-square place-items-center rounded-2xl bg-white text-3xl shadow-soft ${blurred ? "blur-sm" : ""}`}>
            {item}
          </div>
        ))}
      </div>
      {score ? <p className="mt-3 rounded-2xl bg-ink px-4 py-3 text-center font-black text-white">{score}</p> : null}
    </div>
  );
}
