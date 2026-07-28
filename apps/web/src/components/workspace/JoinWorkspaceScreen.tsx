import { ArrowRight, Layers } from "lucide-react";
import { useState } from "react";

import { AuthField } from "@/components/auth/AuthField";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface JoinWorkspaceScreenProps {
  className?: string;
  onSubmit?: (inviteCode: string) => void | Promise<void>;
  onSignIn?: () => void;
}

export function JoinWorkspaceScreen({
  className,
  onSubmit,
  onSignIn,
}: JoinWorkspaceScreenProps) {
  const [inviteCode, setInviteCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit?.(inviteCode.trim());
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className={cn(
        "flex min-h-screen flex-col items-center justify-center bg-surface-lowest px-4 py-12",
        className,
      )}
    >
      <div className="mb-8 flex items-center gap-2">
        <Layers className="size-6 text-brand-600" strokeWidth={1.75} />
        <span className="font-display text-2xl font-bold leading-[28.8px] tracking-[-0.6px] text-brand-900">
          Huddle
        </span>
      </div>

      <div className="w-full max-w-[420px] rounded-lg border border-hairline bg-paper p-8 shadow-[0px_12px_32px_rgba(15,39,68,0.1)]">
        <div className="mb-6 flex flex-col gap-1">
          <h1 className="text-base font-medium leading-6 text-ink">
            Join a workspace
          </h1>
          <p className="text-[13px] leading-[18.2px] text-text-muted">
            Enter the invite code or paste the full invite link you received from
            a teammate.
          </p>
        </div>

        <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
          <AuthField
            label="Invite Code"
            labelVariant="mono"
            name="invite-code"
            placeholder="huddle.app/join/core-infrastructure"
            value={inviteCode}
            onChange={(event) => setInviteCode(event.target.value)}
            inputVariant="signup"
            className="font-mono text-[13px]"
          />

          <Button
            type="submit"
            variant="ink"
            size="hero"
            disabled={!inviteCode.trim() || isSubmitting}
            className="w-full"
          >
            Join Workspace
            <ArrowRight className="size-5" strokeWidth={1.75} />
          </Button>
        </form>

        <p className="mt-6 text-center text-[13px] leading-[18.2px] text-text-muted">
          Already have an account?{" "}
          <button
            type="button"
            onClick={onSignIn}
            className="font-medium text-brand-700 underline-offset-4 hover:underline"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}