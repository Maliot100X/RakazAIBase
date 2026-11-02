import Image from "next/image";
import Link from "next/link";
import { APP_NAME } from "@/lib/brand";

export function Logo({ variant = "agent" }: { variant?: "agent" | "control" }) {
  if (variant === "control")
    return (
      <Link href="/" className="flex min-h-11 items-center gap-2" aria-label={`${APP_NAME} home`}>
        <Image src="/brand/control-room-mark.png" alt="" width={28} height={28} className="size-7 rounded-md" />
        <span className="font-mono text-xs font-bold uppercase tracking-[0.14em]">Control room</span>
      </Link>
    );
  return (
    <Link href="/" className="flex min-h-11 items-center gap-2" aria-label={`${APP_NAME} home`}>
      <span className="relative grid size-9 place-items-center rounded-[10px] border-2 border-rk-ink bg-rk-violet font-display text-lg font-black text-rk-honey">
        R<span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-rk-pink" />
      </span>
      <span className="font-display text-[0.8rem] font-black uppercase leading-none tracking-tight [font-variation-settings:'wdth'_130]">
        Based Agents<br />Terminal
      </span>
    </Link>
  );
}
