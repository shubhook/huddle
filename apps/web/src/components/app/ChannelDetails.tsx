import { Avatar } from "@/components/app/Avatar";
import { Icon } from "@/components/ui/Icon";
import { avatarUrl, type ChannelDetails as Details } from "@/lib/api";

interface ChannelDetailsProps {
  channelName: string;
  /** Null while loading. */
  details: Details | null;
  error?: string;
  userId: string;
  /** The signed-in user's picture, newer than the copy in details after an upload. */
  myAvatarUrl?: string;
  /** Workspace owners and admins. Shows the delete button. */
  canDelete: boolean;
  onDelete: () => void;
  onClose: () => void;
}

const ROLE_LABEL: Record<string, string> = { owner: "Owner", admin: "Admin" };

export function ChannelDetails({
  channelName,
  details,
  error,
  userId,
  myAvatarUrl,
  canDelete,
  onDelete,
  onClose,
}: ChannelDetailsProps) {
  const created = details
    ? new Date(details.createdAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <aside className="details" aria-label={`Details for #${channelName}`}>
      <div className="details__head">
        <h2>Details</h2>
        <button
          type="button"
          className="icon-btn"
          title="Close details"
          aria-label="Close details"
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </div>

      <div className="details__scroll">
        <div className="details__about">
          <h3>
            <span>#</span>
            {channelName}
          </h3>
          {created && <p>Created {created}</p>}
        </div>

        <div className="side__label">
          Members
          {details && <span>{details.members.length}</span>}
        </div>

        {error ? (
          <p className="details__error" role="alert">{error}</p>
        ) : !details ? (
          <p className="side__none">Loading members…</p>
        ) : (
          <ul className="details__members">
            {details.members.map((member) => {
              const isMe = member.id === userId;
              return (
                <li key={member.id} className="member">
                  <Avatar
                    name={member.username}
                    tone={isMe ? 1 : undefined}
                    src={isMe ? myAvatarUrl : avatarUrl(member.id, member.avatarId)}
                  />
                  <span className="member__name">
                    {member.username}
                    {isMe && <span className="member__you">you</span>}
                  </span>
                  {ROLE_LABEL[member.role] && (
                    <span className="member__role">{ROLE_LABEL[member.role]}</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {canDelete && (
        <div className="details__foot">
          <button type="button" className="danger-btn" onClick={onDelete}>
            <Icon name="trash" />
            Delete channel
          </button>
        </div>
      )}
    </aside>
  );
}
