import { useState, type FormEvent } from "react";
import { ArrowRight, KeyRound, Mail, User } from "lucide-react";

import { AuthCard } from "@/components/auth/AuthCard";
import { AuthField } from "@/components/auth/AuthField";
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
      <div className="border-b border-hairline-frost bg-paper px-6 pb-[25px] pt-6 text-center">
        <h1 className="pb-1 font-display text-[32px] font-semibold leading-[38.4px] tracking-[-1.28px] text-ink">
          Huddle
        </h1>
        <p className="text-sm leading-[21px] text-text-subtle">
          Create a new workspace account.
        </p>
      </div>

      <form className="flex flex-col gap-4 bg-surface-lowest p-6" onSubmit={handleSubmit}>
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
          placeholder="john@example.com"
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
          hint="Must be at least 8 characters long."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
        />

        {error && (
          <p className="text-[13px] leading-[18.2px] text-destructive">{error}</p>
        )}

        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className={cn(
              "flex h-11 w-full items-center justify-center rounded bg-ink",
              "text-base font-medium leading-6 text-text-on-ink",
              "transition-colors hover:bg-ink/90",
              "disabled:pointer-events-none disabled:opacity-50",
            )}
          >
            Create account
          </button>
        </div>
      </form>

      <div className="border-t border-hairline-frost bg-paper px-4 py-4">
        <button
          type="button"
          onClick={onSignIn}
          className="mx-auto flex items-center gap-1 text-[13px] leading-[18.2px] text-text-subtle transition-colors hover:text-ink"
        >
          Already have an account? Sign in
          <ArrowRight className="size-4" strokeWidth={1.75} />
        </button>
      </div>
    </AuthCard>
  );
}