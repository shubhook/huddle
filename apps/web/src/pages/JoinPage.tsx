import { useState, type FormEvent } from "react";

import { AccountLayout, FormError } from "@/components/account/AccountLayout";
import { getApiErrorMessage } from "@/lib/api";
import { inviteCodeFromHash } from "@/lib/hashRoute";

interface JoinPageProps {
  signedIn: boolean;
  onJoin: (inviteToken: string) => Promise<void>;
  onSignIn: () => void;
}

/** Accepts a bare token, a #/join/<token> link, or a /join/<token> URL. */
function tokenFromInviteInput(value: string): string {
  const trimmed = value.trim();
  const fromHash = inviteCodeFromHash(
    trimmed.includes("#") ? trimmed.slice(trimmed.indexOf("#")) : "",
  );
  if (fromHash) return fromHash;
  const joinIdx = trimmed.lastIndexOf("/join/");
  if (joinIdx >= 0) {
    return decodeURIComponent(trimmed.slice(joinIdx + "/join/".length));
  }
  return trimmed;
}

export function JoinPage({ signedIn, onJoin, onSignIn }: JoinPageProps) {
  const [invite, setInvite] = useState(() => inviteCodeFromHash());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      await onJoin(tokenFromInviteInput(invite));
    } catch (err) {
      setError(getApiErrorMessage(err, "That invite did not work. It may have expired."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AccountLayout
      title="Join a workspace"
      lede={
        signedIn
          ? "Paste the invite link someone sent you."
          : "Sign in first, then come back to this link to join."
      }
    >
      <form onSubmit={handleSubmit}>
        <label className="f">
          Invite link
          <input
            type="text"
            name="invite"
            placeholder="huddle.app/#/join/…"
            autoComplete="off"
            value={invite}
            onChange={(event) => setInvite(event.target.value)}
            required
          />
        </label>
        <FormError message={error} />
        <button
          className="btn btn--primary"
          type="submit"
          disabled={busy || !signedIn || !invite.trim()}
        >
          {busy ? "Joining…" : "Join workspace"}
        </button>
      </form>
      {!signedIn && (
        <p className="fine">
          No session yet?{" "}
          <button type="button" onClick={onSignIn}>
            Sign in
          </button>
        </p>
      )}
    </AccountLayout>
  );
}
