import { useEffect, useRef, useState } from "react";

import { Icon } from "@/components/landing/Icon";

// A self-contained mock of the chat screen. Nothing here touches the
// network; sends flip from "Sending" to "Delivered" on a short timer.

const MAX_LENGTH = 4000;

const CHANNELS = [
  { name: "shipping", time: "2:41 PM", preview: "ravi: redis pub/sub is on in staging", unread: 3 },
  { name: "design", time: "—", preview: "No messages yet" },
  { name: "random", time: "Yesterday", preview: "ana: who left the kettle on" },
  { name: "incidents", time: "Mon", preview: "you: reconnect gap-fill verified" },
];

const RECEIPT = [
  ["Upgrade", "cookie JWT rides the socket"],
  ["Persist", "insert into Postgres"],
  ["Publish", "redis channel:general"],
  ["Fan out", "every joined socket"],
];

interface SentMessage {
  id: number;
  text: string;
  time: string;
  delivered: boolean;
}

const clock = () =>
  new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

export function LiveDemo() {
  const [draft, setDraft] = useState("");
  const [sent, setSent] = useState<SentMessage[]>([]);
  const feedRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const nextId = useRef(0);

  const lastSent = sent[sent.length - 1];
  const generalPreview = lastSent
    ? `you: ${lastSent.text}`
    : "maya: Postgres first, then fan out.";

  useEffect(() => {
    const feed = feedRef.current;
    if (feed && sent.length > 0) feed.scrollTop = feed.scrollHeight;
  }, [sent.length]);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 200)}px`;
  }, [draft]);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    const id = nextId.current++;
    setSent((prev) => [...prev, { id, text, time: clock(), delivered: false }]);
    setDraft("");
    setTimeout(() => {
      setSent((prev) =>
        prev.map((m) => (m.id === id ? { ...m, delivered: true } : m)),
      );
    }, 650);
  };

  return (
    <div className="demo-app">
      <aside className="side">
        <div className="side__head">
          <button type="button" className="side__ws">
            Studio
            <Icon name="chevron" />
          </button>
          <button type="button" className="icon-btn" title="Invite people">
            <Icon name="userPlus" />
          </button>
          <button type="button" className="icon-btn icon-btn--boxed" title="New channel">
            <Icon name="edit" />
          </button>
        </div>

        <div className="search">
          <Icon name="search" />
          Jump to a channel
          <span className="kbd">⌘K</span>
        </div>

        <div className="side__scroll">
          <div className="side__label">
            Channels <span aria-hidden>+</span>
          </div>

          <button type="button" className="chan is-active">
            <span className="chan__icon">#</span>
            <span className="chan__name">general</span>
            <span className="chan__time">now</span>
            <span className="chan__preview">{generalPreview}</span>
          </button>

          {CHANNELS.map((c) => (
            <button
              key={c.name}
              type="button"
              className={c.unread ? "chan is-unread" : "chan"}
            >
              <span className="chan__icon">#</span>
              <span className="chan__name">{c.name}</span>
              <span className="chan__time">{c.time}</span>
              <span className="chan__preview">{c.preview}</span>
              {c.unread ? <span className="chan__badge">{c.unread}</span> : null}
            </button>
          ))}

          <div className="side__label">Direct messages</div>
          <div className="soon">
            Direct messages are coming. The API is there; the socket and UI
            are not yet.
          </div>
        </div>

        <div className="side__foot">
          <span className="avatar tone-1">KH</span>
          <div className="side__me">
            <strong>khakha</strong>
            <span className="status">
              <span className="dot" />
              Connected
            </span>
          </div>
          <button type="button" className="icon-btn" title="Settings">
            <Icon name="more" />
          </button>
        </div>
      </aside>

      <div className="chat">
        <header className="chat__head">
          <button type="button" className="icon-btn only-narrow" title="Channels">
            <Icon name="menu" />
          </button>
          <div className="chat__title">
            <strong>
              <span>#</span>general
            </strong>
            <span className="chat__topic">
              Company-wide. Ship notes, questions, hellos.
            </span>
          </div>
          <div className="chat__actions">
            <span className="faces">
              <span className="faces__stack">
                <span className="avatar tone-2">MA</span>
                <span className="avatar tone-3">RV</span>
                <span className="avatar tone-4">AN</span>
              </span>
              6
            </span>
            <button type="button" className="icon-btn" title="Search in channel">
              <Icon name="search" />
            </button>
          </div>
        </header>

        <div className="feed" ref={feedRef}>
          <div className="feed__inner">
            <div className="day">Yesterday</div>

            <div className="sys">
              <Icon name="join" />
              <span>
                <b>ravi</b> joined Studio from an invite link
              </span>
            </div>

            <div className="msg">
              <span className="avatar tone-3">RV</span>
              <div>
                <div className="msg__meta">
                  <span className="msg__name">ravi</span>
                  <span className="msg__time">6:02 PM</span>
                </div>
                <div className="msg__text">
                  <p>
                    hey all. how does a message actually get to everyone? I
                    keep seeing <code>join_channel_ack</code> in the logs
                  </p>
                </div>
              </div>
            </div>

            <div className="day">Today</div>

            <div className="msg">
              <span className="avatar tone-2">MA</span>
              <div>
                <div className="msg__meta">
                  <span className="msg__name">maya</span>
                  <span className="msg__time">2:58 PM</span>
                </div>
                <div className="msg__text">
                  <p>
                    <span className="mention">@ravi</span> here is the whole
                    path for one send:
                  </p>
                  <div className="receipt">
                    {RECEIPT.map(([step, detail]) => (
                      <div key={step} className="receipt__row">
                        <Icon name="check" />
                        <strong>{step}</strong>
                        <span>{detail}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="msg msg--cont">
              <span className="avatar tone-2">MA</span>
              <div>
                <div className="msg__text">
                  <p>Postgres first, then fan out. That order is the whole lesson.</p>
                </div>
              </div>
            </div>

            <div className="msg">
              <span className="avatar tone-3">RV</span>
              <div>
                <div className="msg__meta">
                  <span className="msg__name">ravi</span>
                  <span className="msg__time">3:01 PM</span>
                </div>
                <div className="msg__text">
                  <p>
                    so if my laptop sleeps, the reconnect just refetches
                    history and dedupes by id?
                  </p>
                </div>
              </div>
            </div>

            <div className="msg">
              <span className="avatar tone-1">KH</span>
              <div>
                <div className="msg__meta">
                  <span className="msg__name">khakha</span>
                  <span className="msg__time">3:02 PM</span>
                  <span className="msg__tick">
                    <Icon name="check" />
                    Delivered
                  </span>
                </div>
                <div className="msg__text">
                  <p>
                    yep. join ack triggers a history fetch, merge by id, sort
                    by server time. newest 50 for now.
                  </p>
                </div>
              </div>
            </div>

            {sent.map((m) => (
              <div key={m.id} className={m.delivered ? "msg" : "msg msg--pending"}>
                <span className="avatar tone-1">KH</span>
                <div>
                  <div className="msg__meta">
                    <span className="msg__name">khakha</span>
                    <span className="msg__time">{m.time}</span>
                    <span className="msg__tick">
                      <Icon name={m.delivered ? "check" : "clock"} />
                      {m.delivered ? "Delivered" : "Sending"}
                    </span>
                  </div>
                  <div className="msg__text">
                    <p>{m.text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="typing">
          <span className="typing__dots">
            <i />
            <i />
            <i />
          </span>
          maya is typing
        </div>

        <form
          className="composer"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <div className="composer__box">
            <textarea
              ref={inputRef}
              rows={1}
              placeholder="Message #general"
              aria-label="Message #general"
              maxLength={MAX_LENGTH}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <div className="composer__bar">
              <button type="button" className="icon-btn" title="Attach">
                <Icon name="plus" />
              </button>
              <button type="button" className="icon-btn" title="Mention">
                <Icon name="at" />
              </button>
              <button type="button" className="icon-btn" title="Emoji">
                <Icon name="smile" />
              </button>
              <span className="composer__hint">
                <b>Enter</b> to send · <b>Shift Enter</b> new line ·{" "}
                {draft.length}/{MAX_LENGTH}
              </span>
              <button
                type="submit"
                className={draft.trim() ? "send is-ready" : "send"}
                title="Send"
              >
                <Icon name="up" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
