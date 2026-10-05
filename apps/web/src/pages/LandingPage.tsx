import { useEffect, useRef } from "react";

import { Closing } from "@/components/landing/Closing";
import { Features } from "@/components/landing/Features";
import { Footer } from "@/components/landing/Footer";
import { Hero } from "@/components/landing/Hero";
import { LiveDemo } from "@/components/landing/LiveDemo";
import { Navbar } from "@/components/landing/Navbar";
import { Questions } from "@/components/landing/Questions";
import { Start } from "@/components/landing/Start";
import { Teams } from "@/components/landing/Teams";
import "@/components/landing/landing.css";

interface LandingPageProps {
  onOpenApp?: () => void;
  onGetStarted?: () => void;
}

export function LandingPage({ onOpenApp, onGetStarted }: LandingPageProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const els = rootRef.current?.querySelectorAll<HTMLElement>(".reveal");
    if (!els) return;

    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.12 },
    );
    els.forEach((el, i) => {
      el.style.transitionDelay = `${(i % 4) * 60}ms`;
      io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  return (
    <div className="landing" ref={rootRef}>
      <Navbar onOpenApp={onOpenApp} />
      <main>
        <Hero onGetStarted={onGetStarted} />

        <section className="demo wrap" id="demo">
          <div className="demo__frame reveal">
            <div className="demo__bar">
              <i />
              <i />
              <i />
              <span className="demo__url">huddle.app/studio/general</span>
            </div>
            <LiveDemo />
          </div>
          <p className="demo__caption">
            Live demo. Type a message and watch it go from sending to
            delivered.
          </p>
        </section>

        <Features />
        <Teams />
        <Start onGetStarted={onGetStarted} />
        <Questions />
        <Closing onGetStarted={onGetStarted} />
      </main>
      <Footer onOpenApp={onOpenApp} />
    </div>
  );
}
