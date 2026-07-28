import { Layers } from "lucide-react";
import { useState } from "react";

import { AuthField } from "@/components/auth/AuthField";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const REGIONS = [
  { id: "us-east-1", label: "us-east-1", description: "N. Virginia" },
  { id: "eu-west-1", label: "eu-west-1", description: "Ireland" },
] as const;

interface CreateWorkspaceModalProps {
  open: boolean;
  step?: 1 | 2;
  className?: string;
  onClose?: () => void;
  onContinue?: (values: {
    workspaceName: string;
    region: string;
  }) => void | Promise<void>;
}

export function CreateWorkspaceModal({
  open,
  step = 1,
  className,
  onClose,
  onContinue,
}: CreateWorkspaceModalProps) {
  const [workspaceName, setWorkspaceName] = useState("");
  const [region, setRegion] = useState<(typeof REGIONS)[number]["id"]>(
    "us-east-1",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!open) return null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await onContinue?.({ workspaceName: workspaceName.trim(), region });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-950/30 p-4 backdrop-blur-[2px]"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-workspace-title"
        className={cn(
          "w-full max-w-[448px] overflow-hidden rounded-lg border border-hairline bg-paper shadow-[0px_12px_32px_0px_rgba(15,39,68,0.12)]",
          className,
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-hairline px-6 pb-[17px] pt-4">
          <div className="flex items-center gap-2">
            <Layers className="size-6 text-brand-600" strokeWidth={1.75} />
            <span className="font-display text-2xl font-semibold leading-[28.8px] tracking-[-0.96px] text-brand-900">
              Huddle
            </span>
          </div>

          <div className="flex items-center gap-1" aria-hidden>
            <span
              className={cn(
                "size-2 rounded-xl",
                step === 1 ? "bg-brand" : "border border-hairline-strong",
              )}
            />
            <span
              className={cn(
                "size-2 rounded-xl",
                step === 2 ? "bg-brand" : "border border-hairline-strong",
              )}
            />
          </div>
        </div>

        <form className="p-6" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1">
            <h1
              id="create-workspace-title"
              className="text-base font-medium leading-6 text-ink"
            >
              Create a new workspace
            </h1>
            <p className="text-[13px] leading-[18.2px] text-text-muted">
              Initialize a dedicated environment for your engineering team.
            </p>
          </div>

          <div className="pt-6">
            <AuthField
              label="Workspace Name"
              labelVariant="mono"
              name="workspace-name"
              placeholder="e.g. core-infrastructure"
              value={workspaceName}
              onChange={(event) => setWorkspaceName(event.target.value)}
              inputVariant="signup"
              className="font-mono text-[13px]"
            />
          </div>

          <div className="flex flex-col gap-2 pt-6">
            <label className="font-mono text-xs font-medium uppercase tracking-[0.24px] text-text-muted">
              Deployment Region
            </label>
            <div className="grid grid-cols-2 gap-2">
              {REGIONS.map((item) => {
                const isSelected = region === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setRegion(item.id)}
                    className={cn(
                      "rounded-md border bg-surface-2 px-[17px] py-[9px] text-left transition-colors",
                      isSelected
                        ? "border-brand bg-brand-50 ring-1 ring-brand"
                        : "border-hairline hover:border-brand-200",
                    )}
                  >
                    <span className="block font-mono text-[13px] leading-[19.5px] text-ink">
                      {item.label}
                    </span>
                    <span className="block pt-1 font-mono text-xs font-medium tracking-[0.24px] text-text-muted">
                      {item.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end border-t border-hairline pt-6">
            <Button
              type="submit"
              variant="ink"
              size="sm"
              disabled={!workspaceName.trim() || isSubmitting}
              className="h-[34px] px-4 text-[13px]"
            >
              Initialize Workspace
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}