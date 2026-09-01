import { useState, type FormEvent } from "react";
import { ArrowRight, KeyRound, Mail, User } from "lucide-react";

import { AuthCard } from "@/components/auth/AuthCard";
import { AuthField } from "@/components/auth/AuthField";
import { GithubAuthButton } from "@/components/auth/GithubAuthButton";
import { cn } from "@/lib/utils";

interface SignupFormProps {
  onSubmit?: (values: {
    username: string;
    email: string;
    password: string;
  }) => void | Promise<void>;
  onSignIn?: () => void;
  error?: string;
  className?: string;
}

export function SignupForm({
  onSubmit,
  onSignIn,
  error,
  className,
}: SignupFormProps) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit?.({ username, email, password });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCard variant="signup" className={className}>
      <div className="border-b border-hairline px-6 py-5 text-center">
        <h1 className="font-display text-2xl font-medium tracking-tight text-ink">
          Huddle
        </h1>
        <p className="mt-1 text-xs text-text-muted">
          Make an account, then create a workspace.
        </p>
      </div>

      <form className="flex flex-col gap-3.5 px-6 py-5" onSubmit={handleSubmit}>
        <GithubAuthButton variant="signup" />

        <AuthField
          name="username"
          type="text"
          label="Username"
          labelVariant="mono"
          placeholder="johndoe"
          autoComplete="username"
          icon={User}
          iconPosition="left"
          inputVariant="signup"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />

        <AuthField
          name="email"
          type="email"
          label="Email"
          labelVariant="mono"
          placeholder="you@example.com"
          autoComplete="email"
          icon={Mail}
          iconPosition="left"
          inputVariant="signup"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <AuthField
          name="password"
          type="password"
          label="Password"
          labelVariant="mono"
          placeholder="••••••••"
          autoComplete="new-password"
          icon={KeyRound}
          iconPosition="left"
          inputVariant="signup"
          hint="At least 8 characters."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
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
          Create account
        </button>
      </form>

      <div className="border-t border-hairline px-4 py-3.5">
        <button
          type="button"
          onClick={onSignIn}
          className="mx-auto flex items-center gap-1 text-xs text-text-muted transition-colors hover:text-ink"
        >
          Already have an account? Sign in
          <ArrowRight className="size-3.5" strokeWidth={1.75} />
        </button>
      </div>
    </AuthCard>
  );
}
