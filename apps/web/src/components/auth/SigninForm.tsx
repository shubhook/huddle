import { useState, type FormEvent } from "react";
import { KeyRound, Mail } from "lucide-react";

import { AuthCard } from "@/components/auth/AuthCard";
import { AuthField } from "@/components/auth/AuthField";
import { cn } from "@/lib/utils";

interface SigninFormProps {
  onSubmit?: (values: { email: string; password: string }) => void | Promise<void>;
  onForgotPassword?: () => void;
  error?: string;
  className?: string;
}

export function SigninForm({
  onSubmit,
  onForgotPassword,
  error,
  className,
}: SigninFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit?.({ email, password });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCard variant="signin" className={className}>
      <div className="mb-6 flex flex-col gap-1">
        <h2 className="text-base leading-6 text-ink">Sign in to your account</h2>
        <p className="text-[13px] leading-[18.2px] text-text-subtle">
          Welcome back. Enter your details to proceed.
        </p>
      </div>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <AuthField
          name="email"
          type="email"
          label="Email"
          placeholder="name@company.com"
          autoComplete="email"
          icon={Mail}
          iconPosition="right"
          inputVariant="signin"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <div className="pb-2">
          <AuthField
            name="password"
            type="password"
            label="Password"
            placeholder="••••••••"
            autoComplete="current-password"
            icon={KeyRound}
            iconPosition="right"
            inputVariant="signin"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            labelAction={
              <button
                type="button"
                onClick={onForgotPassword}
                className="text-[13px] leading-[18.2px] text-text-subtle transition-colors hover:text-ink"
              >
                Forgot password?
              </button>
            }
            required
          />
        </div>

        {error && (
          <p className="text-[13px] leading-[18.2px] text-destructive">{error}</p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            "w-full rounded bg-ink px-4 py-[10px]",
            "text-sm leading-[21px] text-text-on-ink",
            "transition-colors hover:bg-ink/90",
            "disabled:pointer-events-none disabled:opacity-50",
          )}
        >
          Sign in
        </button>
      </form>
    </AuthCard>
  );
}