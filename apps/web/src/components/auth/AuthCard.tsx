import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface AuthCardProps {
  variant: "signin" | "signup";
  children: ReactNode;
  className?: string;
}

export function AuthCard({ variant, children, className }: AuthCardProps) {
  return (
    <div
      className={cn(
        "w-full max-w-[420px] border border-hairline-frost-50",
        variant === "signin" &&
          "rounded-lg bg-surface-lowest px-[49px] pb-[49px] pt-[73px] shadow-[0px_8px_12px_rgba(0,0,0,0.02)]",
        variant === "signup" &&
          "overflow-hidden rounded-lg bg-surface-lowest shadow-[0px_8px_24px_rgba(0,0,0,0.06)]",
        className,
      )}
    >
      {children}
    </div>
  );
}