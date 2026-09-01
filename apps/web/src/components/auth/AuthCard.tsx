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
        "w-full max-w-[380px] rounded-xl border border-hairline bg-paper/90",
        variant === "signin" && "px-6 pb-6 pt-7",
        variant === "signup" && "overflow-hidden",
        className,
      )}
    >
      {children}
    </div>
  );
}
