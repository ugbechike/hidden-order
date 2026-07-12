import type { Metadata } from "next";
import Link from "next/link";
import { Brain, Trophy } from "lucide-react";
import { DisplayNameGate, PlayerProvider } from "@/features/profile/player-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hidden Order",
  description: "A bright deduction puzzle about finding the secret order.",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-touch-icon.svg", type: "image/svg+xml" }]
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <PlayerProvider>
          <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 pb-8 pt-4 sm:px-6">
            <header className="mb-4 flex items-center justify-between gap-3">
              <Link className="flex items-center gap-2 rounded-full bg-white/80 px-3 py-2 font-black text-ink shadow-soft" href="/">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-mango">
                  <Brain size={20} aria-hidden />
                </span>
                Hidden Order
              </Link>
              <Link
                href="/leaderboard"
                className="grid h-12 w-12 place-items-center rounded-full bg-ink text-white shadow-pop"
                aria-label="Leaderboard"
              >
                <Trophy size={21} aria-hidden />
              </Link>
            </header>
            {children}
          </div>
          <DisplayNameGate />
        </PlayerProvider>
      </body>
    </html>
  );
}
