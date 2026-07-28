import { cn } from "@/lib/utils";

const FOOTER_LINKS = [
  { label: "Docs", href: "#" },
  { label: "GitHub", href: "#" },
  { label: "Portfolio", href: "#" },
] as const;

interface FooterProps {
  className?: string;
}

export function Footer({ className }: FooterProps) {
  return (
    <footer
      className={cn(
        "w-full border-t border-hairline bg-paper px-8 pb-8 pt-[33px] md:px-20",
        className,
      )}
    >
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-8 sm:flex-row sm:items-center sm:justify-between">
        <span className="font-display text-base font-bold leading-6 text-brand-900">
          Huddle
        </span>

        <nav
          aria-label="Footer"
          className="flex flex-wrap items-center gap-6"
        >
          {FOOTER_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="font-mono text-xs font-medium uppercase tracking-[0.6px] text-text-muted transition-colors hover:text-brand-700"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <span className="font-mono text-[11px] leading-[16.5px] text-text-placeholder">
          v0.1.0-beta
        </span>
      </div>
    </footer>
  );
}
