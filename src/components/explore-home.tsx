import Link from "next/link";
import Image from "next/image";
import { Hero } from "@/components/shell/hero";
import { Chip, PageHead } from "@/components/shell/page-head";
import { Checklist, Col, DashCard, LinkRow, NotWired, SkelRows, StatGrid } from "@/components/dash/cards";

const CAPS = [
  { href: "/talk", title: "Talk", hint: "Live VR avatar + brain", img: "/brand/yuri-talk-desk.jpg" },
  { href: "/vault", title: "Vault", hint: "FC Quick Auth + Base wallet", img: "/brand/yuri-splash-mark.jpg" },
  { href: "/launch", title: "Operate / Launch", hint: "Bankr launch on Base", img: "/brand/yuri-launch-pose.jpg" },
  { href: "/", title: "Base Mini App", hint: "Chain 8453 · Farcaster", img: "" },
];

export function ExploreHome() {
  return (
    <Col>
      <Hero src="/brand/yuri-hero-stage.jpg" alt="Yuri on stage — Based Agents Terminal" width={1200} height={675} priority className="h-44 w-full object-cover object-[center_30%]" />
      <section aria-label="What I can do" data-capabilities className="space-y-2">
        <div className="flex items-center gap-2">
          <Image src="/brand/yuri-splash-mark.jpg" alt="" width={36} height={36} className="size-9 rounded-full border-2 border-rk-lav object-cover" />
          <p className="rk-kicker text-rk-lav">Based Agents Terminal · capabilities</p>
        </div>
        <Image src="/brand/yuri-capabilities-board.jpg" alt="Yuri presenting capabilities: Talk, Base wallet, Farcaster Mini App, Bankr launch, Vault" width={1024} height={576} className="w-full rounded-2xl border-2 border-rk-lav" />
        <div className="grid grid-cols-2 gap-2">
          {CAPS.map((c) => (
            <Link key={c.href} href={c.href} className="relative overflow-hidden rounded-2xl border-2 border-rk-lav bg-[#120828] p-3 min-h-24">
              {c.img && <Image src={c.img} alt="" fill sizes="212px" className="object-cover opacity-35" />}
              <span className="relative block text-sm font-semibold text-rk-lav">{c.title}</span>
              <span className="relative block text-xs text-muted-foreground">{c.hint}</span>
            </Link>
          ))}
        </div>
      </section>
      <PageHead
        title="Explore"
        purpose={<>Tokens launched on Base, read straight from the chain. I&apos;m a character, <span className="rk-serif">not a chatbot.</span></>}
        chip={<Chip tone="pending">Feed not wired yet · Phase 0</Chip>}
      />
      <div className="flex flex-wrap gap-2">
        <Link href="/chat" className="rk-btn-honey">Ask Yuri</Link>
        <Link href="/launch" className="inline-flex min-h-11 items-center rounded-full border-[1.5px] border-rk-lav px-4 text-sm font-semibold text-rk-lav">Launch on Base</Link>
      </div>
      <DashCard title="Base at a glance" chip={<NotWired>Indexer idle</NotWired>}>
        <StatGrid stats={[["Launches", "—"], ["24h vol", "—"], ["Agents", "—"]]} />
      </DashCard>
      <DashCard title="Launch feed" chip={<NotWired />}>
        <div className="mb-3 flex gap-2 overflow-x-auto" role="tablist" aria-label="Explore tabs">
          {["New", "Trending", "Top volume", "My launches"].map((t, i) => (
            <span key={t} role="tab" aria-selected={i === 0} className="rk-chip shrink-0 aria-selected:border-rk-honey aria-selected:text-rk-honey">{t}</span>
          ))}
        </div>
        <SkelRows n={4} />
        <p className="mt-3 text-xs text-muted-foreground">No launches yet. Want to be first?</p>
      </DashCard>
      <DashCard title="Risk check" chip={<NotWired>Scanner later</NotWired>}>
        <Checklist items={[["Contract verified", false], ["LP locked", false], ["Owner renounced", false], ["Honeypot sim", false]]} />
      </DashCard>
      <DashCard title="Jump in">
        <div className="space-y-2">
          <LinkRow href="/talk" label="Talk to Yuri" hint="18+" />
          <LinkRow href="/games" label="Ride 'Em" hint="Games" />
          <LinkRow href="/community" label="Community" hint="Callouts" />
        </div>
      </DashCard>
    </Col>
  );
}
