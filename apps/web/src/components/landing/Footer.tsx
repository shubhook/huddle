import { GITHUB_URL, scrollToSection } from "@/components/landing/links";

interface FooterProps {
  onOpenApp?: () => void;
}

export function Footer({ onOpenApp }: FooterProps) {
  return (
    <footer className="foot">
      <div className="wrap foot__in">
        <span className="logo">
          <span className="logo__mark" aria-hidden />
          huddle
        </span>
        <span>© 2026 · Built to learn WebSockets</span>
        <nav className="foot__links">
          <a href={GITHUB_URL}>GitHub</a>
          <a href={`${GITHUB_URL}#readme`}>Docs</a>
          <a href="#status" onClick={scrollToSection("status")}>
            Status
          </a>
          <a
            href="#/app"
            onClick={(e) => {
              e.preventDefault();
              onOpenApp?.();
            }}
          >
            Open app
          </a>
        </nav>
      </div>
    </footer>
  );
}
