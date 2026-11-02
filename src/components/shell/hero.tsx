import Image from "next/image";

/** The single hero per page; the only place .rk-hero-bob is allowed. */
export function Hero({ src, alt = "Rakaza", width = 1200, height = 800, className = "h-44 w-full object-cover", priority }: { src: string; alt?: string; width?: number; height?: number; className?: string; priority?: boolean }) {
  return (
    <div className="mb-6 overflow-hidden rounded-[1.4rem] border-2 border-rk-ink shadow-[3px_3px_0_var(--rk-pink)]">
      <Image src={src} alt={alt} width={width} height={height} priority={priority} className={`rk-hero-bob ${className}`} />
    </div>
  );
}
