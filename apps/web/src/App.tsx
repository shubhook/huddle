import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import "./index.css";

export function App() {
  return (
    <div className="min-h-screen bg-surface-lowest px-8 py-12 text-ink">
      <header className="mx-auto max-w-3xl">
        <h1 className="text-[40px] font-semibold leading-[1.1] tracking-[-0.04em]">
          Huddle · Step 1 — Primitives
        </h1>
        <p className="mt-2 text-text-muted">
          Quick smoke test of the shadcn primitives pulled from the Figma frame.
        </p>
      </header>

      <section className="mx-auto mt-12 max-w-3xl space-y-10">
        <div>
          <h2 className="mb-3 font-mono-label text-text-muted">Button</h2>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="ink" size="hero">
              Quick Start
            </Button>
            <Button variant="outline" size="hero">
              Documentation
            </Button>
            <Button variant="ink" size="nav">
              Get started
            </Button>
            <Button variant="ghost" size="icon" aria-label="Search" />
          </div>
        </div>

        <Separator />

        <div>
          <h2 className="mb-3 font-mono-label text-text-muted">Badge</h2>
          <div className="flex flex-wrap items-center gap-3">
            <Badge dot>v0.1 · WebSocket layer live</Badge>
            <Badge variant="plain" dot>
              # engineering-deployments
            </Badge>
          </div>
        </div>

        <Separator />

        <div>
          <h2 className="mb-3 font-mono-label text-text-muted">Input</h2>
          <Input
            placeholder="Message #engineering-deployments"
            className="max-w-md"
          />
        </div>

        <Separator />

        <div>
          <h2 className="mb-3 font-mono-label text-text-muted">Avatar</h2>
          <div className="flex items-center gap-3">
            <Avatar name="Alice" size="sm" />
            <Avatar name="Bob Ops" size="md" />
            <Avatar name="System Bot" size="lg" />
            <Avatar name="Carol Engineer" size="xl" />
          </div>
        </div>
      </section>
    </div>
  );
}

export default App;
