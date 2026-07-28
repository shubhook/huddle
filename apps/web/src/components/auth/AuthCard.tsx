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
        "w-full max-w-[420px] border border-hairline bg-paper",
        variant === "signin" &&
          "rounded-lg px-[49px] pb-[49px] pt-[73px] shadow-[0px_12px_32px_rgba(15,39,68,0.08)]",
        variant === "signup" &&
          "overflow-hidden rounded-lg shadow-[0px_12px_32px_rgba(15,39,68,0.1)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
