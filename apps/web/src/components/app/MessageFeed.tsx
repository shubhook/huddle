import { Fragment, useEffect, useLayoutEffect, useRef, type ReactNode } from "react";

import { Avatar } from "@/components/app/Avatar";
import { clockTime, dayLabel, sameDay } from "@/components/app/format";
import { Icon } from "@/components/ui/Icon";

export type Delivery = "sending" | "delivered" | "failed";

export type FeedItem =
  | {
      kind: "message";
      id: string;
      sender: string;
      /** ISO time. */
      createdAt: string;
      text: string;
      /** Rich body for the landing demo. Falls back to `text`. */
      body?: ReactNode;
      tone?: number;
      /** Only set for messages this tab sent. */
      delivery?: Delivery;
    }
  | { kind: "system"; id: string; createdAt: string; body: ReactNode };

/** Messages from one person within this window share a header. */
const GROUP_WINDOW_MS = 5 * 60_000;

function continuesPrevious(item: FeedItem, previous: FeedItem | undefined) {
  return (
    item.kind === "message" &&
    previous?.kind === "message" &&
    previous.sender === item.sender &&
    !item.delivery &&
    !previous.delivery &&
    sameDay(previous.createdAt, item.createdAt) &&
    Date.parse(item.createdAt) - Date.parse(previous.createdAt) < GROUP_WINDOW_MS
  );
}

const DELIVERY_LABEL: Record<Delivery, string> = {
  sending: "Sending",
  delivered: "Delivered",
  failed: "Not confirmed",
};

interface MessageFeedProps {
  items: FeedItem[];
  /** Changing this (e.g. the channel id) jumps to the newest message. */
  scrollKey?: string;
  /** Shown instead of the list when there are no items. */
  empty?: ReactNode;
}

export function MessageFeed({ items, scrollKey, empty }: MessageFeedProps) {
  const feedRef = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const last = items[items.length - 1];

  useLayoutEffect(() => {
    const feed = feedRef.current;
    if (feed) feed.scrollTop = feed.scrollHeight;
    nearBottom.current = true;
  }, [scrollKey]);

  // Follow new messages only if the reader is already at the bottom,
  // or the newest message is one they just sent.
  useEffect(() => {
    const feed = feedRef.current;
    if (!feed || !last) return;
    const mine = last.kind === "message" && last.delivery === "sending";
    if (nearBottom.current || mine) {
      feed.scrollTo({ top: feed.scrollHeight, behavior: "smooth" });
    }
  }, [last?.id, items.length]);

  return (
    <div
      className="feed"
      ref={feedRef}
      onScroll={(event) => {
        const el = event.currentTarget;
        nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
      }}
    >
      {items.length === 0 && empty ? (
        empty
      ) : (
        <div className="feed__inner">
          {items.map((item, index) => {
            const previous = items[index - 1];
            const newDay = !previous || !sameDay(previous.createdAt, item.createdAt);

            return (
              <Fragment key={item.id}>
                {newDay && <div className="day">{dayLabel(item.createdAt)}</div>}
                {item.kind === "system" ? (
                  <div className="sys">
                    <Icon name="join" />
                    <span>{item.body}</span>
                  </div>
                ) : (
                  <MessageRow item={item} grouped={continuesPrevious(item, previous)} />
                )}
              </Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MessageRow({
  item,
  grouped,
}: {
  item: Extract<FeedItem, { kind: "message" }>;
  grouped: boolean;
}) {
  const classes = ["msg"];
  if (grouped) classes.push("msg--cont");
  if (item.delivery === "sending") classes.push("msg--pending");
  if (item.delivery === "failed") classes.push("msg--failed");

  return (
    <div className={classes.join(" ")}>
      {!grouped && (
        <div className="msg__meta">
          <Avatar name={item.sender} tone={item.tone} small />
          <span className="msg__name">{item.sender}</span>
          <span className="msg__time">{clockTime(item.createdAt)}</span>
          {item.delivery && (
            <span className="msg__tick">
              <Icon name={item.delivery === "delivered" ? "check" : "clock"} />
              {DELIVERY_LABEL[item.delivery]}
            </span>
          )}
        </div>
      )}
      <div className="msg__text">{item.body ?? <p>{item.text}</p>}</div>
    </div>
  );
}
