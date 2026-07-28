import { startGithubLogin } from "@/lib/api";
import { cn } from "@/lib/utils";

interface GithubAuthButtonProps {
  /** Visual density to match signin vs signup form styles */
  variant?: "signin" | "signup";
  className?: string;
  label?: string;
}

function GithubMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="currentColor"
    >
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.29-.01-1.04-.02-2.04-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5 1 .11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.62-5.48 5.92.43.37.81 1.1.81 2.22 0 1.6-.01 2.89-.01 3.29 0 .32.22.7.82.58A12.01 12.01 0 0 0 24 12c0-6.63-5.37-12-12-12Z" />
    </svg>
  );
}

/**
 * GitHub OAuth entry point — placed above email/password fields with an OR divider below.
 */
export function GithubAuthButton({
  variant = "signin",
  className,
  label = "Continue with GitHub",
}: GithubAuthButtonProps) {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <button
        type="button"
        onClick={() => startGithubLogin()}
        className={cn(
          "flex w-full items-center justify-center gap-2.5 border border-hairline bg-paper text-ink transition-colors hover:border-brand-200 hover:bg-brand-50",
          variant === "signin" &&
            "rounded bg-transparent px-4 py-[10px] text-sm leading-[21px]",
          variant === "signup" &&
            "h-11 rounded text-base font-medium leading-6",
        )}
      >
        <GithubMark className="size-4 shrink-0" />
        {label}
      </button>

      <div className="flex items-center gap-3" role="separator" aria-label="or">
        <div className="h-px flex-1 bg-hairline" />
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-subtle">
          or
        </span>
        <div className="h-px flex-1 bg-hairline" />
      </div>
    </div>
  );
}
