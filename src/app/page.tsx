import Link from "next/link";
import { CalendarDays, GraduationCap, HelpCircle, Play, Trophy, Wand2 } from "lucide-react";

const actions = [
  { href: "/game?mode=stage&stage=1", label: "Continue Stage Mode", icon: Play, tone: "bg-berry text-white" },
  { href: "/game?mode=daily", label: "Daily Puzzle", icon: CalendarDays, tone: "bg-mango text-ink" },
  { href: "/game?mode=practice", label: "Practice Mode", icon: Wand2, tone: "bg-mint text-ink" },
  { href: "/stages", label: "Stage Selection", icon: GraduationCap, tone: "bg-sky text-white" },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy, tone: "bg-lilac text-white" },
  { href: "/how-to-play", label: "How to Play", icon: HelpCircle, tone: "bg-white text-ink" }
];

export default function Home() {
  return (
    <main className="flex flex-1 flex-col gap-5">
      <section className="rounded-[30px] bg-ink p-6 text-white shadow-pop">
        <p className="text-sm font-black uppercase tracking-wide text-mango">Deduction in disguise</p>
        <h1 className="mt-2 text-4xl font-black leading-none sm:text-5xl">Find the hidden order.</h1>
        <p className="mt-4 max-w-xl text-base font-semibold text-white/80">
          Swap the current arrangement, submit it, and use the latest clue to close in on the hidden order.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={action.href}
              className={`flex min-h-24 items-center justify-between rounded-[26px] p-5 text-xl font-black shadow-soft transition active:scale-[0.98] ${action.tone}`}
            >
              <span>{action.label}</span>
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/25">
                <Icon size={24} aria-hidden />
              </span>
            </Link>
          );
        })}
      </section>
    </main>
  );
}
