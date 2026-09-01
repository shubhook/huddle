import { useState, type FormEvent } from "react";
import { KeyRound, Mail } from "lucide-react";

import { AuthCard } from "@/components/auth/AuthCard";
import { AuthField } from "@/components/auth/AuthField";
import { GithubAuthButton } from "@/components/auth/GithubAuthButton";
import { cn } from "@/lib/utils";

interface SigninFormProps {
  onSubmit?: (values: { email: string; password: string }) => void | Promise<void>;
  onForgotPassword?: () => void;
  error?: string;
  className?: string;
}

export function SigninForm({
  onSubmit,
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
      <div className="mb-5 flex flex-col gap-1">
        <h2 className="text-sm font-medium text-ink">Sign in</h2>
        <p className="text-xs text-text-muted">
          Come back in with email or GitHub.
        </p>
      </div>

      <div className="mb-4">
        <GithubAuthButton variant="signin" />
      </div>

      <form className="flex flex-col gap-3.5" onSubmit={handleSubmit}>
        <AuthField
          name="email"
          type="email"
          label="Email"
          placeholder="you@example.com"
          autoComplete="email"
          icon={Mail}
          iconPosition="right"
          inputVariant="signin"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

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
          required
        />

        {error && <p className="text-xs text-destructive">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            "mt-1 h-9 w-full rounded-md bg-brand text-sm font-medium text-text-on-brand",
            "transition-colors hover:bg-brand-700",
            "disabled:pointer-events-none disabled:opacity-50",
          )}
        >
          Sign in
        </button>
      </form>
    </AuthCard>
  );
}
