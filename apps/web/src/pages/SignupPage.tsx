import { useState, type FormEvent } from "react";

import { AccountLayout, FormError, GithubButton } from "@/components/account/AccountLayout";

interface SignupPageProps {
  onSubmit: (values: { username: string; email: string; password: string }) => Promise<void>;
  onSignIn: () => void;
  error?: string;
}

export function SignupPage({ onSubmit, onSignIn, error }: SignupPageProps) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await onSubmit({ username, email, password });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AccountLayout
      title="Create your account"
      lede="Then you’ll name a workspace and invite people."
    >
      <GithubButton />
      <form onSubmit={handleSubmit}>
        <label className="f">
          Username
          <input
            type="text"
            name="username"
            placeholder="khakha"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
          />
        </label>
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
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <small>At least 8 characters.</small>
        </label>
        <FormError message={error} />
        <button className="btn btn--primary" type="submit" disabled={busy}>
          {busy ? "Creating account…" : "Create account"}
        </button>
      </form>
      <p className="fine">
        Already have an account?{" "}
        <button type="button" onClick={onSignIn}>
          Sign in
        </button>
      </p>
    </AccountLayout>
  );
}
