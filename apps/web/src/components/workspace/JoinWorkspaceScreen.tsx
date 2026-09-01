import { ArrowRight } from "lucide-react";
import { useState } from "react";

import { AuthField } from "@/components/auth/AuthField";
import { Button } from "@/components/ui/button";
import { inviteCodeFromHash } from "@/lib/hashRoute";
import { cn } from "@/lib/utils";

interface JoinWorkspaceScreenProps {
  className?: string;
  onSubmit?: (inviteCode: string) => void | Promise<void>;
  onSignIn?: () => void;
}

function tokenFromInviteInput(value: string): string {
  const trimmed = value.trim();
  const fromHash = inviteCodeFromHash(
    trimmed.includes("#") ? trimmed.slice(trimmed.indexOf("#")) : "",
  );
  if (fromHash) return fromHash;
  const joinIdx = trimmed.lastIndexOf("/join/");
  if (joinIdx >= 0) {
    return decodeURIComponent(trimmed.slice(joinIdx + "/join/".length));
  }
  return trimmed;
}

export function JoinWorkspaceScreen({
  className,
  onSubmit,
  onSignIn,
}: JoinWorkspaceScreenProps) {
  const [inviteCode, setInviteCode] = useState(() =>
    typeof window === "undefined" ? "" : inviteCodeFromHash(),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit?.(tokenFromInviteInput(inviteCode));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className={cn(
        "flex min-h-screen flex-col items-center justify-center px-4 py-12",
        className,
      )}
    >
      <p className="mb-6 font-display text-xl font-medium tracking-tight text-brand-900">
        Huddle
      </p>

      <div className="w-full max-w-[380px] rounded-xl border border-hairline bg-paper/90 p-6">
        <div className="mb-5 flex flex-col gap-1">
          <h1 className="text-sm font-medium text-ink">Join a workspace</h1>
          <p className="text-xs leading-relaxed text-text-muted">
            Paste the invite link or token someone sent you.
          </p>
        </div>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <AuthField
            label="Invite"
            labelVariant="mono"
            name="invite-code"
            placeholder="paste invite token or link"
            value={inviteCode}
            onChange={(event) => setInviteCode(event.target.value)}
            inputVariant="signup"
          />

          <Button
            type="submit"
            variant="ink"
            size="hero"
            disabled={!inviteCode.trim() || isSubmitting}
            className="w-full"
          >
            Join workspace
            <ArrowRight className="size-3.5" strokeWidth={1.75} />
          </Button>
        </form>

        <p className="mt-5 text-center text-xs text-text-muted">
          Already signed in elsewhere?{" "}
          <button
            type="button"
            onClick={onSignIn}
            className="font-medium text-brand-700 hover:text-brand-800"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
