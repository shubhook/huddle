import { useRef, useState } from "react";

import { Avatar } from "@/components/app/Avatar";
import type { Theme } from "@/components/app/useTheme";

interface ProfileViewProps {
  username: string;
  email: string;
  avatarUrl?: string;
  /** Resolves when saved, rejects with a message to show. Omit to hide photo controls. */
  onAvatarUpload?: (file: File) => Promise<void>;
  onAvatarRemove?: () => Promise<void>;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  workspaceName?: string;
  role?: string;
  channelCount?: number;
  onSignOut?: () => void;
}

/** "owner" -> "Owner". */
function roleLabel(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function ProfileView({
  username,
  email,
  avatarUrl,
  onAvatarUpload,
  onAvatarRemove,
  theme,
  onThemeChange,
  workspaceName,
  role,
  channelCount,
  onSignOut,
}: ProfileViewProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string>();

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setPhotoError(undefined);
    try {
      await action();
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : "Could not update your photo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="profile" aria-label="Profile">
      <div className="profile__in">
        <div className="profile__who">
          <Avatar name={username} tone={1} src={avatarUrl} />
          <div>
            <h2>{username}</h2>
            <p>{email}</p>
          </div>
        </div>

        <div className="profile__block">
          <h3>Account</h3>
          <div className="rowline">
            <strong>Username</strong>
            <span>{username}</span>
          </div>
          <div className="rowline">
            <strong>Email</strong>
            <span>{email}</span>
          </div>
          {onAvatarUpload && (
            <div className="rowline">
              <strong>Photo</strong>
              <div className="photo-actions">
                {avatarUrl && onAvatarRemove && (
                  <button
                    type="button"
                    className="btn-quiet"
                    disabled={busy}
                    onClick={() => run(onAvatarRemove)}
                  >
                    Remove
                  </button>
                )}
                <button
                  type="button"
                  className="btn-quiet"
                  disabled={busy}
                  onClick={() => fileRef.current?.click()}
                >
                  {busy ? "Saving…" : avatarUrl ? "Change" : "Upload"}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  hidden
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (file) void run(() => onAvatarUpload(file));
                  }}
                />
              </div>
            </div>
          )}
          {photoError && (
            <p className="photo-error" role="alert">
              {photoError}
            </p>
          )}
        </div>

        <div className="profile__block">
          <h3>Appearance</h3>
          <div className="rowline">
            <strong>Theme</strong>
            <div className="seg" role="group" aria-label="Theme">
              {(["dark", "light"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  className={theme === option ? "is-active" : undefined}
                  aria-pressed={theme === option}
                  onClick={() => onThemeChange(option)}
                >
                  {option === "dark" ? "Dark" : "Light"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {workspaceName && (
          <div className="profile__block">
            <h3>{workspaceName}</h3>
            {role && (
              <div className="rowline">
                <strong>Role</strong>
                <span>{roleLabel(role)}</span>
              </div>
            )}
            {channelCount !== undefined && (
              <div className="rowline">
                <strong>Channels</strong>
                <span>{channelCount}</span>
              </div>
            )}
          </div>
        )}

        {onSignOut && (
          <div className="profile__block">
            <div className="rowline">
              <button type="button" className="linkish" onClick={onSignOut}>
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
