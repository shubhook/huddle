import { useState } from "react";

import { AuthField } from "@/components/auth/AuthField";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  className,
  onClose,
  onContinue,
}: CreateWorkspaceModalProps) {
  const [workspaceName, setWorkspaceName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!open) return null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await onContinue?.({
        workspaceName: workspaceName.trim(),
        region: "local",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-950/20 p-4 backdrop-blur-[2px]"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-workspace-title"
        className={cn(
          "w-full max-w-[400px] overflow-hidden rounded-xl border border-hairline bg-paper",
          className,
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-hairline px-5 py-3.5">
          <span className="font-display text-lg font-medium tracking-tight text-brand-900">
            Huddle
          </span>
        </div>

        <form className="p-5" onSubmit={handleSubmit}>
          <h1
            id="create-workspace-title"
            className="text-sm font-medium text-ink"
          >
            Name your workspace
          </h1>
          <p className="mt-1 text-xs leading-relaxed text-text-muted">
            Something short. You can invite people after this.
          </p>

          <div className="pt-5">
            <AuthField
              label="Workspace name"
              labelVariant="mono"
              name="workspace-name"
              placeholder="e.g. studio"
              value={workspaceName}
              onChange={(event) => setWorkspaceName(event.target.value)}
              inputVariant="signup"
            />
          </div>

          <div className="flex justify-end pt-5">
            <Button
              type="submit"
              variant="ink"
              size="sm"
              disabled={!workspaceName.trim() || isSubmitting}
            >
              Create workspace
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
