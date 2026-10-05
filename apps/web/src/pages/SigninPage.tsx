import { useState, type FormEvent } from "react";

import { AccountLayout, FormError, GithubButton } from "@/components/account/AccountLayout";

interface SigninPageProps {
  onSubmit: (values: { email: string; password: string }) => Promise<void>;
  onSignUp: () => void;
  error?: string;
}

export function SigninPage({ onSubmit, onSignUp, error }: SigninPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await onSubmit({ email, password });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AccountLayout title="Welcome back" lede="Sign in with email or GitHub.">
      <GithubButton />
      <form onSubmit={handleSubmit}>
        <label className="f">
          Email
          <input
            type="email"
            name="email"
            placeholder="you@studio.dev"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label className="f">
          Password
          <input
            type="password"
            name="password"
            placeholder="••••••••"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        <FormError message={error} />
        <button className="btn btn--primary" type="submit" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="fine">
        New here?{" "}
        <button type="button" onClick={onSignUp}>
          Create an account
        </button>
      </p>
    </AccountLayout>
  );
}
