import { useEffect, useState } from "react";

import { LogoMark } from "@/components/ui/LogoMark";
import { Icon } from "@/components/ui/Icon";
import { GITHUB_URL, scrollToSection } from "@/components/landing/links";

interface NavbarProps {
  onOpenApp?: () => void;
}

const SECTIONS = [
  { id: "demo", label: "Product" },
  { id: "features", label: "Features" },
  { id: "for", label: "Teams" },
  { id: "start", label: "Start" },
  { id: "questions", label: "Questions" },
];

export function Navbar({ onOpenApp }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={scrolled ? "nav is-scrolled" : "nav"}>
      <div className="wrap nav__in">
        <a
          className="logo"
          href="#/"
          aria-label="Huddle home"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          <LogoMark />
          huddle
        </a>
        <nav className="nav__links">
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} onClick={scrollToSection(s.id)}>
              {s.label}
            </a>
          ))}
        </nav>
        <div className="nav__end">
          <a className="star" href={GITHUB_URL}>
            <Icon name="github" />
            Star
          </a>
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={onOpenApp}
          >
            Open Huddle
          </button>
        </div>
      </div>
    </header>
  );
}
