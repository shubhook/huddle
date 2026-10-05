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
      <div className="empty__icon">#</div>
      <h2>This is the start of #{channelName}</h2>
      <p>
        Nobody has said anything yet. Messages you send here are saved first,
        then delivered live to everyone in the channel.
      </p>
      <div className="empty__cards">
        <button type="button" className="empty__card" onClick={onInvite}>
          <Icon name="link" />
          <strong>Invite teammates</strong>
          <span>Copy a workspace link. It expires in 7 days.</span>
        </button>
        <button type="button" className="empty__card" onClick={onSayHello}>
          <Icon name="wave" />
          <strong>Say hello</strong>
          <span>Send the first message and watch it land.</span>
        </button>
        <button type="button" className="empty__card" onClick={onNewChannel}>
          <Icon name="edit" />
          <strong>Start another channel</strong>
          <span>Give a topic its own place in the workspace.</span>
        </button>
      </div>
    </section>
  );
}
