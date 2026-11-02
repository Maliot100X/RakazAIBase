import Image from "next/image";
import Link from "next/link";

export function EmptyState({ copy, cta, href }: { copy: string; cta: string; href: string }) {
  return (
    <div className="rk-card-hard flex flex-col items-center gap-3 p-6 text-center">
      <Image src="/brand/yuri-splash-mark.jpg" alt="" width={96} height={96} className="size-24 rounded-2xl border-2 border-rk-ink object-cover" />
      <p className="text-muted-foreground">{copy}</p>
      <Link href={href} className="rk-btn-honey">{cta}</Link>
    </div>
  );
}
