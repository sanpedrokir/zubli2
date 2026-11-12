import { Suspense } from "react";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { LogoMark } from "@/components/Logo";

function StartLink() {
  return (
    <Link href="/sign-up" className="btn-primary px-7 py-3 text-base">
      Start remembering
    </Link>
  );
}

// Personalises the main call-to-action; streams in behind <Suspense>.
async function HeroCta() {
  const { userId } = await auth();
  if (!userId) return <StartLink />;
  return (
    <Link href="/dashboard" className="btn-primary px-7 py-3 text-base">
      Go to your dashboard
    </Link>
  );
}

const STEPS = [
  {
    title: "Write down what you remember",
    body: "A nickname, a street corner, the school bell, the summer of ’78. Any small clue helps — only a short description is required.",
    icon: "✎",
  },
  {
    title: "Share your own history — if you want",
    body: "Add the schools, neighbourhoods and workplaces of your past, and decide exactly which details can be used for matching.",
    icon: "❦",
  },
  {
    title: "See gentle suggestions",
    body: "Zubli compares clues with people who chose to be discoverable. You see possibilities and why — never anyone's private details.",
    icon: "✦",
  },
  {
    title: "Ask for an introduction",
    body: "They get a kind note from you and decide. Conversation opens only if they say yes. You can block or report at any time.",
    icon: "✉",
  },
];

const PROMISES = [
  ["Private by default", "Your searches are visible only to you. Your history joins matching only when you switch it on."],
  ["Consent before contact", "No one can message you unless you accept their introduction. Contact details are never shared."],
  ["Possibilities, not proof", "Suggestions are clues that line up — never a confirmed identity. You stay in charge of every step."],
];

export default function HomePage() {
  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-honey-soft blur-3xl" />
        <div className="pointer-events-none absolute -right-20 top-40 h-80 w-80 rounded-full bg-rose-soft blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:pt-24">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-sand bg-white/70 px-3 py-1 text-xs font-medium text-ink-soft">
              <span className="h-1.5 w-1.5 rounded-full bg-sage" /> For friendships from the 1960s to the 1990s — and beyond
            </p>
            <h1 className="font-serif text-4xl font-semibold leading-[1.08] tracking-tight text-ink sm:text-6xl">
              Some friendships deserve a <em className="text-clay">second hello.</em>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
              Zubli Reconnect helps you find childhood friends, old classmates, neighbours and colleagues you lost touch
              with — gently, privately, and only with their consent.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Suspense fallback={<StartLink />}>
                <HeroCta />
              </Suspense>
              <Link href="/safety" className="btn-secondary px-7 py-3 text-base">
                How we keep it safe
              </Link>
            </div>
          </div>

          {/* Polaroid collage */}
          <div className="relative mx-auto h-[360px] w-full max-w-md" aria-hidden="true">
            <div className="absolute left-2 top-6 w-56 -rotate-6 rounded-md bg-white p-3 pb-10 shadow-soft">
              <div className="h-44 rounded-sm bg-gradient-to-br from-honey-soft via-clay-soft to-rose-soft" />
              <p className="mt-3 text-center font-serif text-sm italic text-ink-soft">Berea, summer ’79</p>
            </div>
            <div className="absolute right-0 top-24 w-56 rotate-6 rounded-md bg-white p-3 pb-10 shadow-soft">
              <div className="flex h-44 items-center justify-center rounded-sm bg-gradient-to-br from-sage-soft via-parchment to-honey-soft">
                <LogoMark className="h-20 w-20 opacity-80" />
              </div>
              <p className="mt-3 text-center font-serif text-sm italic text-ink-soft">Class of ’84</p>
            </div>
            <div className="absolute bottom-0 left-16 rounded-2xl border border-sand bg-white/90 px-4 py-3 text-sm shadow-soft">
              <p className="font-medium text-ink">“Is that you, Kathy from Room 12?”</p>
              <p className="text-xs text-ink-soft">An introduction is waiting for a reply</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <h2 className="heading text-center">How it works</h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <div key={s.title} className="card">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-clay-soft text-xl text-clay">{s.icon}</div>
              <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-ink-soft">Step {i + 1}</p>
              <h3 className="mt-1 font-serif text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Promises */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="rounded-[2rem] bg-ink px-6 py-12 text-cream sm:px-12">
          <h2 className="font-serif text-3xl font-semibold">Our promises to you</h2>
          <div className="mt-8 grid gap-8 md:grid-cols-3">
            {PROMISES.map(([t, b]) => (
              <div key={t}>
                <h3 className="font-serif text-xl text-honey">{t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-cream/80">{b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
