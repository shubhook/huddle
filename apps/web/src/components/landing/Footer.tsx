import { LogoMark } from "@/components/ui/LogoMark";
import { GITHUB_URL, scrollToSection } from "@/components/landing/links";

interface FooterProps {
  onOpenApp?: () => void;
}

export function Footer({ onOpenApp }: FooterProps) {
  return (
    <footer className="foot">
      <div className="wrap foot__in">
        <span className="logo">
          <LogoMark />
          huddle
        </span>
        <span>© 2026</span>
        <nav className="foot__links">
          <a href={GITHUB_URL}>GitHub</a>
          <a href="#features" onClick={scrollToSection("features")}>
            Features
          </a>
          <a href="#questions" onClick={scrollToSection("questions")}>
            Questions
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
