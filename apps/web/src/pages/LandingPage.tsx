import { Footer } from "@/components/landing/Footer";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Navbar } from "@/components/layout/Navbar";

interface LandingPageProps {
  onSignIn?: () => void;
  onGetStarted?: () => void;
  onQuickStart?: () => void;
}

export function LandingPage({
  onSignIn,
  onGetStarted,
  onQuickStart,
}: LandingPageProps) {
  return (
    <div className="min-h-screen bg-paper">
      <Navbar onSignIn={onSignIn} onGetStarted={onGetStarted} />
      <main>
        <Hero onQuickStart={onQuickStart ?? onGetStarted} />
        <HowItWorks />
        <Footer />
      </main>
    </div>
  );
}
