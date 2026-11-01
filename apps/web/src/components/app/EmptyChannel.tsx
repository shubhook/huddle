import { Icon } from "@/components/ui/Icon";

interface EmptyChannelProps {
  channelName: string;
  onInvite?: () => void;
  onSayHello?: () => void;
  onNewChannel?: () => void;
}

export function EmptyChannel({
  channelName,
  onInvite,
  onSayHello,
  onNewChannel,
}: EmptyChannelProps) {
  return (
    <section className="empty" aria-label="Empty channel">
      <div className="empty__icon" aria-hidden>#</div>
      <h2>This is the start of #{channelName}</h2>
      <p>
        Nobody has said anything yet. Messages you send here are saved first,
        then delivered live to everyone in the channel.
      </p>
      <div className="empty__cards">
        {onInvite && (
          <button type="button" className="empty__card" onClick={onInvite}>
            <Icon name="link" />
            <span className="empty__text">
              <strong>Invite teammates</strong>
              <span>Copy a link that works for 7 days</span>
            </span>
            <Icon name="chevron" />
          </button>
        )}
        <button type="button" className="empty__card" onClick={onSayHello}>
          <Icon name="wave" />
          <span className="empty__text">
            <strong>Say hello</strong>
            <span>Send the first message in this channel</span>
          </span>
          <Icon name="chevron" />
        </button>
        {onNewChannel && (
          <button type="button" className="empty__card" onClick={onNewChannel}>
            <Icon name="edit" />
            <span className="empty__text">
              <strong>Start another channel</strong>
              <span>Give a topic its own place</span>
            </span>
            <Icon name="chevron" />
          </button>
        )}
      </div>
    </section>
  );
}
