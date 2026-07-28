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
    <div className="flex w-full flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={fieldId}
          className={cn(
            labelVariant === "mono"
              ? "font-mono text-xs font-medium uppercase tracking-[0.6px] text-text-subtle"
              : "text-[13px] leading-[18.2px] text-ink",
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
            className="pointer-events-none absolute left-[9px] top-1/2 size-[18px] -translate-y-1/2 text-text-subtle"
            strokeWidth={1.75}
          />
        )}

        <input
          id={fieldId}
          className={cn(
            "w-full rounded border border-hairline outline-none transition-colors",
            "focus-visible:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-500/20",
            "disabled:cursor-not-allowed disabled:opacity-50",
            inputVariant === "signin" &&
              "bg-paper px-[17px] py-[11px] text-base placeholder:text-text-placeholder",
            inputVariant === "signup" &&
              "h-11 bg-surface-container px-[9px] text-sm placeholder:text-text-placeholder",
            Icon && iconPosition === "left" && "pl-[31px]",
            Icon && iconPosition === "right" && "pr-10",
            error && "border-destructive focus-visible:border-destructive",
            className,
          )}
          aria-invalid={error ? true : undefined}
          {...props}
        />

        {Icon && iconPosition === "right" && (
          <Icon
            aria-hidden
            className="pointer-events-none absolute right-4 top-1/2 size-[18px] -translate-y-1/2 text-text-subtle"
            strokeWidth={1.75}
          />
        )}
      </div>

      {error && (
        <p className="text-[13px] leading-[18.2px] text-destructive">{error}</p>
      )}
      {hint && !error && (
        <p className="pt-1 font-mono text-[13px] leading-[19.5px] text-text-placeholder">
          {hint}
        </p>
      )}
    </div>
  );
}