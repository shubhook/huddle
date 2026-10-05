import { useState, type FormEvent } from "react";

import { AccountLayout, FormError } from "@/components/account/AccountLayout";
import { CopyRow } from "@/components/ui/CopyRow";
import { createInvite, createWorkspace, getApiErrorMessage } from "@/lib/api";

interface WorkspaceSetupPageProps {
  /** Called with the new workspace once the user is done with the invite step. */
  onDone: (workspaceId: string) => void;
}

/** Name a workspace, then share its invite link. */
export function WorkspaceSetupPage({ onDone }: WorkspaceSetupPageProps) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [created, setCreated] = useState<{ id: string; name: string } | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string>();

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(undefined);
    try {
      const { workspaceId } = await createWorkspace(trimmed);
      setCreated({ id: workspaceId, name: trimmed });
      createInvite(workspaceId)
        .then(({ token }) => setInviteUrl(`${window.location.origin}/#/join/${token}`))
        .catch((err) =>
          setInviteError(getApiErrorMessage(err, "Could not create an invite link.")),
        );
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not create the workspace."));
    } finally {
      setBusy(false);
    }
  }

  if (created) {
    return (
      <AccountLayout
        title="Invite your team"
        lede={
          <>
            Share this link so people can join <b>{created.name}</b>.
          </>
        }
      >
        <CopyRow className="invite-box" url={inviteUrl} pending="Creating link…" />
        {inviteError ? (
          <FormError message={inviteError} />
        ) : (
          <p className="note">Anyone with the link joins every channel. It expires in 7 days.</p>
        )}
        <button type="button" className="btn btn--primary" onClick={() => onDone(created.id)}>
          Enter workspace
        </button>
        <p className="fine">
          <button type="button" onClick={() => onDone(created.id)}>
            I’ll do this later
          </button>
        </p>
      </AccountLayout>
    );
  }

  return (
    <AccountLayout
      title="Name your workspace"
      lede="Something short. You can invite people after this."
    >
      <form onSubmit={handleCreate}>
        <label className="f">
          Workspace name
          <input
            type="text"
            name="workspace"
            placeholder="Studio"
            autoComplete="off"
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </label>
        <FormError message={error} />
        <button className="btn btn--primary" type="submit" disabled={busy || !name.trim()}>
          {busy ? "Creating…" : "Create workspace"}
        </button>
      </form>
    </AccountLayout>
  );
}
