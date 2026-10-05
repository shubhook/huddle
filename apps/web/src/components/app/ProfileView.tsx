import { Avatar } from "@/components/app/Avatar";
import type { Theme } from "@/components/app/useTheme";

interface ProfileViewProps {
  username: string;
  email: string;
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
  theme,
  onThemeChange,
  workspaceName,
  role,
  channelCount,
  onSignOut,
}: ProfileViewProps) {
  return (
    <section className="profile" aria-label="Profile">
      <div className="profile__in">
        <div className="profile__who">
          <Avatar name={username} tone={1} />
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
