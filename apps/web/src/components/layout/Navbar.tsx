import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Preview", href: "#preview", active: true },
  { label: "Features", href: "#features" },
  { label: "Architecture", href: "#architecture" },
] as const;

interface NavbarProps {
  className?: string;
  activeLink?: string;
  onSignIn?: () => void;
  onGetStarted?: () => void;
}

export function Navbar({
  className,
  activeLink = "Preview",
  onSignIn,
  onGetStarted,
}: NavbarProps) {
  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50",
        "border-b border-hairline-frost bg-surface-frost backdrop-blur-[6px]",
        "shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]",
        className,
      )}
    >
      <div className="mx-auto w-full max-w-[1280px] px-6 py-2">
        <div className="flex items-center justify-between">
          {/* Logo + nav links — gap 48px in Figma */}
          <div className="flex items-center gap-12">
            <a
              href="/"
              className="font-display text-2xl font-bold leading-[28.8px] tracking-[-0.6px] text-ink"
            >
              Huddle
            </a>

            <nav
              aria-label="Primary"
              className="hidden items-start gap-6 md:flex"
            >
              {NAV_LINKS.map((link) => {
                const isActive = link.label === activeLink;
                return (
                  <a
                    key={link.label}
                    href={link.href}
                    className={cn(
                      "text-base leading-6 transition-colors",
                      isActive
                        ? "border-b-2 border-ink pb-[6px] font-bold text-ink"
                        : "pb-1 font-normal text-text-subtle hover:text-ink",
                    )}
                  >
                    {link.label}
                  </a>
                );
              })}
            </nav>
          </div>

          {/* Sign in + CTA — gap 16px in Figma */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onSignIn}
              className="text-base leading-6 text-text-subtle transition-colors hover:text-ink"
            >
              Sign in
            </button>
            <Button variant="ink" size="nav" onClick={onGetStarted}>
              Get started
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}