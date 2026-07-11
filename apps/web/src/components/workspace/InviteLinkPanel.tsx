import { Check, Copy, Link2 } from "lucide-react";
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
        "w-full max-w-[448px] overflow-hidden rounded-md border border-hairline bg-paper shadow-[0px_8px_24px_0px_rgba(0,0,0,0.06)]",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-hairline px-6 pb-[17px] pt-4">
        <div className="flex items-center gap-2">
          <Link2 className="size-6 text-ink" strokeWidth={1.75} />
          <span className="font-display text-2xl font-semibold leading-[28.8px] tracking-[-0.96px] text-ink">
            Huddle
          </span>
        </div>

        <div className="flex items-center gap-1" aria-hidden>
          <span className="size-2 rounded-xl border border-text-muted" />
          <span className="size-2 rounded-xl bg-ink" />
        </div>
      </div>

      <div className="p-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-base font-medium leading-6 text-ink">
            Invite your team
          </h1>
          <p className="text-[13px] leading-[18.2px] text-text-muted">
            Share this link to give teammates access to{" "}
            <span className="font-mono text-ink">{workspaceName}</span>.
          </p>
        </div>

        <div className="pt-6">
          <label className="font-mono text-xs font-medium uppercase tracking-[0.24px] text-text-muted">
            Invite Link
          </label>
          <div className="mt-2 flex items-center gap-2 rounded-md border border-hairline bg-surface-2 px-[17px] py-[10px]">
            <input
              readOnly
              value={inviteUrl}
              aria-label="Workspace invite link"
              className="min-w-0 flex-1 bg-transparent font-mono text-[13px] leading-[19.5px] text-ink outline-none"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={copied ? "Copied" : "Copy invite link"}
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="size-4 text-signal" strokeWidth={1.75} />
              ) : (
                <Copy className="size-4" strokeWidth={1.75} />
              )}
            </Button>
          </div>
          <p className="pt-2 font-mono text-[13px] leading-[19.5px] text-text-placeholder">
            Links expire after 7 days. Regenerate from workspace settings.
          </p>
        </div>

        <div className="flex justify-end border-t border-hairline pt-6">
          <Button type="button" variant="ink" size="sm" onClick={onContinue}>
            Enter Workspace
          </Button>
        </div>
      </div>
    </div>
  );
}