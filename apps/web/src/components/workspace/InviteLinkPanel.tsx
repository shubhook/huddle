import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface InviteLinkPanelProps {
  workspaceName: string;
  inviteUrl: string;
  className?: string;
  onContinue?: () => void;
  onCopy?: (url: string) => void;
}

export function InviteLinkPanel({
  workspaceName,
  inviteUrl,
  className,
  onContinue,
  onCopy,
}: InviteLinkPanelProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      onCopy?.(inviteUrl);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div
      className={cn(
        "w-full max-w-[400px] overflow-hidden rounded-xl border border-hairline bg-paper",
        className,
      )}
    >
      <div className="border-b border-hairline px-5 py-3.5">
        <span className="font-display text-lg font-medium tracking-tight text-brand-900">
          Huddle
        </span>
      </div>

      <div className="p-5">
        <h1 className="text-sm font-medium text-ink">Invite your team</h1>
        <p className="mt-1 text-xs leading-relaxed text-text-muted">
          Share this link so people can join{" "}
          <span className="font-medium text-ink">{workspaceName}</span>.
        </p>

        <div className="pt-5">
          <label className="font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-text-muted">
            Invite link
          </label>
          <div className="mt-1.5 flex items-center gap-2 rounded-md border border-hairline bg-surface/80 px-3 py-2">
            <input
              readOnly
              value={inviteUrl}
              aria-label="Workspace invite link"
              className="min-w-0 flex-1 bg-transparent font-mono text-xs text-ink outline-none"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={copied ? "Copied" : "Copy invite link"}
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="size-3.5 text-signal" strokeWidth={1.75} />
              ) : (
                <Copy className="size-3.5" strokeWidth={1.75} />
              )}
            </Button>
          </div>
          <p className="pt-2 text-xs text-text-placeholder">
            Links expire after 7 days.
          </p>
        </div>

        <div className="flex justify-end pt-5">
          <Button type="button" variant="ink" size="sm" onClick={onContinue}>
            Enter workspace
          </Button>
        </div>
      </div>
    </div>
  );
}
