import {
  Activity,
  Database,
  Gauge,
  Layers,
  Radio,
  Shield,
} from "lucide-react";

import { ArchitecturePanel } from "@/components/landing/ArchitecturePanel";
import { FeatureGrid } from "@/components/landing/FeatureGrid";
import { Footer } from "@/components/landing/Footer";
import { Hero } from "@/components/landing/Hero";
import { StatsRow } from "@/components/landing/StatsRow";
import { Navbar } from "@/components/layout/Navbar";

interface LandingPageProps {
  onSignIn?: () => void;
  onGetStarted?: () => void;
  onQuickStart?: () => void;
}

const LANDING_STATS = [
  {
    label: "Latency",
    value: "< 20ms",
    description: "Global average P99 delivery time",
    icon: Gauge,
  },
  {
    label: "Reliability",
    value: "99.99%",
    description: "Uptime SLA guarantee",
    icon: Shield,
  },
  {
    label: "Open Source",
    value: "MIT",
    description: "Permissive license, self-host freely",
    icon: Activity,
  },
] as const;

const LANDING_FEATURES = [
  {
    title: "Postgres Persistence",
    description:
      "Durable message storage backed by PostgreSQL. Benefit from ACID compliance, robust querying, and point-in-time recovery for your chat history.",
    icon: Database,
  },
  {
    title: "Redis Pub/Sub Fan-out",
    description:
      "Horizontally scalable message routing. Nodes communicate via Redis to ensure lightning-fast message delivery across distributed clusters.",
    icon: Radio,
  },
  {
    title: "Zero-config Deploy",
    description:
      "Ship faster with pre-configured Docker images and Helm charts. Get a highly available cluster running in under 5 minutes with sane defaults.",
    icon: Layers,
  },
] as const;

export function LandingPage({
  onSignIn,
  onGetStarted,
  onQuickStart,
}: LandingPageProps) {
  return (
    <div className="min-h-screen bg-surface-lowest">
      <Navbar
        activeLink="Preview"
        onSignIn={onSignIn}
        onGetStarted={onGetStarted}
      />

      <main className="pt-14">
        <Hero onQuickStart={onQuickStart ?? onGetStarted} />

        <div className="mx-auto flex w-full max-w-[1216px] justify-center px-8 pb-16">
          <StatsRow stats={[...LANDING_STATS]} />
        </div>

        <FeatureGrid features={[...LANDING_FEATURES]} />
        <ArchitecturePanel className="py-16" />
        <Footer />
      </main>
    </div>
  );
}