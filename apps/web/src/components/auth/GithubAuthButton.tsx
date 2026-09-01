import { startGithubLogin } from "@/lib/api";
import { cn } from "@/lib/utils";

interface GithubAuthButtonProps {
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

export function GithubAuthButton({
  className,
  label = "Continue with GitHub",
}: GithubAuthButtonProps) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <button
        type="button"
        onClick={() => startGithubLogin()}
        className={cn(
          "flex h-9 w-full items-center justify-center gap-2 rounded-md border border-hairline",
          "bg-paper/80 text-sm text-ink transition-colors hover:bg-surface-2",
        )}
      >
        <GithubMark className="size-3.5 shrink-0" />
        {label}
      </button>

      <div className="flex items-center gap-2.5" role="separator" aria-label="or">
        <div className="h-px flex-1 bg-hairline" />
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-placeholder">
          or
        </span>
        <div className="h-px flex-1 bg-hairline" />
      </div>
    </div>
  );
}
