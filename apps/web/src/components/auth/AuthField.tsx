import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface AuthFieldProps extends React.ComponentProps<"input"> {
  label: string;
  labelVariant?: "body" | "mono";
  error?: string;
  hint?: string;
  labelAction?: ReactNode;
  icon?: LucideIcon;
  iconPosition?: "left" | "right";
  inputVariant?: "signin" | "signup";
}

export function AuthField({
  label,
  labelVariant = "body",
  error,
  hint,
  labelAction,
  icon: Icon,
  iconPosition = "right",
  inputVariant = "signin",
  className,
  id,
  ...props
}: AuthFieldProps) {
  const fieldId = id ?? props.name;

  return (
    <div className="flex w-full flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={fieldId}
          className={cn(
            labelVariant === "mono"
              ? "font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-text-subtle"
              : "text-sm text-ink",
          )}
        >
          {label}
        </label>
        {labelAction}
      </div>

      <div className="relative">
        {Icon && iconPosition === "left" && (
          <Icon
            aria-hidden
            className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-text-placeholder"
            strokeWidth={1.75}
          />
        )}

        <input
          id={fieldId}
          className={cn(
            "w-full rounded-md border border-hairline bg-paper/80 outline-none transition-colors",
            "text-sm placeholder:text-text-placeholder",
            "focus-visible:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-500/15",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "h-9 px-3",
            Icon && iconPosition === "left" && "pl-8",
            Icon && iconPosition === "right" && "pr-8",
            inputVariant === "signup" && "bg-surface/80",
            error && "border-destructive focus-visible:border-destructive",
            className,
          )}
          aria-invalid={error ? true : undefined}
          {...props}
        />

        {Icon && iconPosition === "right" && (
          <Icon
            aria-hidden
            className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-text-placeholder"
            strokeWidth={1.75}
          />
        )}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
      {hint && !error && (
        <p className="text-xs text-text-placeholder">{hint}</p>
      )}
    </div>
  );
}
