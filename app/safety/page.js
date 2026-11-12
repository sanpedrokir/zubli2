import { PageShell, PageHeader } from "@/components/ui";

export const metadata = { title: "Privacy & safety" };

const SECTIONS = [
  {
    title: "What stays private",
    items: [
      "Your saved searches (memories) are visible only to you.",
      "Your email address, phone number and other contact details are never shown to other members.",
      "Your historical profile is NOT used for matching until you switch on “Discoverable”. Each entry can be included or excluded individually.",
      "Your “About me” text and birth year are never shown in suggestions.",
    ],
  },
  {
    title: "How matching works",
    items: [
      "Zubli compares the clues you enter (school, neighbourhood, years, nicknames, workplaces) with the opted-in history of other members, on our own servers. Profile data is not sent to third-party AI services for matching.",
      "Suggestions explain which of YOUR clues line up. They never reveal another member's stored details.",
      "A suggestion is a possibility, never a confirmed identity. Memories fade and many people share names and schools.",
    ],
  },
  {
    title: "Consent before contact",
    items: [
      "You can request an introduction with a short note. The other person decides whether to accept.",
      "Messaging opens only after they accept. Either of you can close the conversation at any time.",
      "Block anyone — they won't be suggested to you, and you won't be suggested to them.",
      "Report anything that worries you. Accounts reported by several different members are suspended automatically pending review.",
    ],
  },
  {
    title: "Memory-inspired illustrations",
    items: [
      "Optional. Creates an artistic scene inspired by your description and the era, using a server-side image service.",
      "Always labelled as AI-generated and never a verified likeness of anyone. Personal names are not included in the prompt.",
      "Illustrations are private to you and are never used for facial recognition or identity matching.",
    ],
  },
  {
    title: "Public web searches",
    items: [
      "Zubli can prepare search links (Google, Bing, DuckDuckGo) using your clues. Nothing is searched until you click.",
      "We don't scrape social media, bypass logins, collect private profiles, or claim that any public account belongs to a particular person. You review results yourself.",
    ],
  },
  {
    title: "Staying safe when you reconnect",
    items: [
      "Take your time. Ask questions only the real person would know.",
      "Never send money, gift cards or financial details — however convincing the story.",
      "Meet in public places and tell someone you trust if you decide to meet.",
      "If you feel in danger, contact your local emergency services.",
    ],
  },
];

export default function SafetyPage() {
  return (
    <PageShell className="max-w-4xl">
      <PageHeader
        eyebrow="Privacy & safety"
        title="Gentle by design"
        description="Reconnecting should feel warm, not risky. Here is exactly how Zubli Reconnect protects you and the people you're looking for."
      />
      <div className="grid gap-5 md:grid-cols-2">
        {SECTIONS.map((s) => (
          <section key={s.title} className="card">
            <h2 className="subheading">{s.title}</h2>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-ink-soft">
              {s.items.map((i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-clay" aria-hidden="true" />
                  <span>{i}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </PageShell>
  );
}
