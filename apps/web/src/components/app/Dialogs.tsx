import { useEffect, useState, type ReactNode } from "react";

import { CopyRow } from "@/components/ui/CopyRow";

function Modal({
  labelledBy,
  onClose,
  children,
}: {
  labelledBy: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="modal"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal__card" role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
        {children}
      </div>
    </div>
  );
}

/** "Design Crits" -> "design-crits". The leading # is added on display. */
export function channelSlug(value: string): string {
  return value.trim().replace(/^#+/, "").toLowerCase().replace(/\s+/g, "-");
}

interface NewChannelDialogProps {
  workspaceName: string;
  /** Resolve false to keep the dialog open, e.g. when the name is taken. */
  onCreate: (name: string) => Promise<boolean> | boolean;
  onClose: () => void;
  error?: string;
}

export function NewChannelDialog({
  workspaceName,
  onCreate,
  onClose,
  error,
}: NewChannelDialogProps) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const slug = channelSlug(name);

  return (
    <Modal labelledBy="new-channel-title" onClose={onClose}>
      <h2 id="new-channel-title">New channel</h2>
      <p>Everyone in {workspaceName} can join it. Names are unique in this workspace.</p>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (!slug || busy) return;
          setBusy(true);
          try {
            if ((await onCreate(slug)) !== false) onClose();
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="field">
          <span>Name</span>
          <input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="design"
            autoComplete="off"
            maxLength={80}
            required
          />
          <small>Lowercase, no spaces. # is added for you.</small>
        </label>
        {error && <p className="modal__error" role="alert">{error}</p>}
        <div className="modal__actions">
          <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary btn--sm" disabled={!slug || busy}>
            {busy ? "Creating…" : "Create channel"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

interface InviteDialogProps {
  workspaceName: string;
  /** Null while the link is being created. */
  url: string | null;
  error?: string;
  onClose: () => void;
}

export function InviteDialog({ workspaceName, url, error, onClose }: InviteDialogProps) {
  return (
    <Modal labelledBy="invite-title" onClose={onClose}>
      <h2 id="invite-title">Invite to {workspaceName}</h2>
      <p>Anyone with this link can join the workspace and its channels.</p>
      <CopyRow className="invite-row" url={url} pending="Creating link…" />
      {error ? (
        <p className="modal__error" role="alert">{error}</p>
      ) : (
        <p className="modal__hint">Expires in 7 days.</p>
      )}
      <div className="modal__actions">
        <button type="button" className="btn btn--primary btn--sm" onClick={onClose}>
          Done
        </button>
      </div>
    </Modal>
  );
}

interface DeleteChannelDialogProps {
  channelName: string;
  /** Resolve false to keep the dialog open, e.g. when the server refused. */
  onConfirm: () => Promise<boolean> | boolean;
  onClose: () => void;
  error?: string;
}

export function DeleteChannelDialog({
  channelName,
  onConfirm,
  onClose,
  error,
}: DeleteChannelDialogProps) {
  const [busy, setBusy] = useState(false);

  return (
    <Modal labelledBy="delete-channel-title" onClose={onClose}>
      <h2 id="delete-channel-title">Delete #{channelName}?</h2>
      <p>
        The channel and all of its messages are removed for everyone. This cannot be
        undone.
      </p>
      {error && <p className="modal__error" role="alert">{error}</p>}
      <div className="modal__actions">
        <button type="button" className="btn btn--ghost btn--sm" onClick={onClose} autoFocus>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn--danger btn--sm"
          disabled={busy}
          onClick={async () => {
            if (busy) return;
            setBusy(true);
            try {
              if ((await onConfirm()) !== false) onClose();
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Deleting…" : "Delete channel"}
        </button>
      </div>
    </Modal>
  );
}
