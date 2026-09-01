import { Button } from "@/components/ui/button";

interface NavbarProps {
  onSignIn?: () => void;
  onGetStarted?: () => void;
}

export function Navbar({ onSignIn, onGetStarted }: NavbarProps) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-paper/70 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-5">
        <a
          href="/"
          className="group inline-flex items-center gap-2 text-ink"
          aria-label="Huddle home"
        >
          <span
            aria-hidden
            className="flex size-6 items-center justify-center rounded-[6px] bg-ink transition-colors group-hover:bg-brand-800"
          >
            <span className="grid grid-cols-2 gap-0.5">
              <span className="size-1 rounded-[1px] bg-paper" />
              <span className="size-1 rounded-[1px] bg-paper" />
              <span className="size-1 rounded-[1px] bg-paper" />
              <span className="size-1 rounded-[1px] bg-paper" />
            </span>
          </span>
          <span className="text-[15px] font-semibold tracking-tight">
            Huddle
          </span>
        </a>

        <nav className="hidden items-center gap-6 text-sm text-text-subtle md:flex">
          <a href="#preview" className="transition-colors hover:text-ink">
            Product
          </a>
          <a href="#how-it-works" className="transition-colors hover:text-ink">
            How it works
          </a>
        </nav>

        <div className="flex shrink-0 items-center gap-0.5 sm:gap-2">
          <button
            type="button"
            onClick={onSignIn}
            className="px-2 py-1.5 text-sm text-text-subtle transition-colors hover:text-ink sm:px-2.5"
          >
            Sign in
          </button>
          <Button variant="ink" size="sm" onClick={onGetStarted}>
            Get started
          </Button>
        </div>
      </div>
    </header>
  );
}
