import { useEffect, useRef, useState } from "react";

import { Avatar } from "@/components/app/Avatar";
import { ChannelHeader } from "@/components/app/ChannelHeader";
import { ChannelSidebar } from "@/components/app/ChannelSidebar";
import { ChatLayout } from "@/components/app/ChatLayout";
import { Composer } from "@/components/app/Composer";
import { InviteDialog, NewChannelDialog } from "@/components/app/Dialogs";
import { EmptyChannel } from "@/components/app/EmptyChannel";
import { MessageFeed, type FeedItem } from "@/components/app/MessageFeed";
import { ProfileView } from "@/components/app/ProfileView";
import { useTheme } from "@/components/app/useTheme";
import { Icon } from "@/components/ui/Icon";

// The real chat components with made-up data. Nothing here touches the
// network; sends flip from "Sending" to "Delivered" on a short timer.

const ME = "khakha";

interface DemoChannel {
  id: string;
  name: string;
  topic: string;
  items: FeedItem[];
}

/** Today (or `daysBack` days ago) at a wall-clock time, as ISO. */
function at(hours: number, minutes: number, daysBack = 0): string {
  const date = new Date();
  date.setDate(date.getDate() - daysBack);
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
}

const RECEIPT = [
  ["Upgrade", "cookie JWT rides the socket"],
  ["Persist", "insert into Postgres"],
  ["Publish", "redis channel:general"],
  ["Fan out", "every joined socket"],
];

function seedChannels(): DemoChannel[] {
  return [
    {
      id: "general",
      name: "general",
      topic: "Company-wide. Ship notes, questions, hellos.",
      items: [
        {
          kind: "system",
          id: "g0",
          createdAt: at(18, 1, 1),
          body: (
            <>
              <b>ravi</b> joined Studio from an invite link
            </>
          ),
        },
        {
          kind: "message",
          id: "g1",
          sender: "ravi",
          tone: 3,
          createdAt: at(18, 2, 1),
          text: "hey all. how does a message actually get to everyone?",
          body: (
            <p>
              hey all. how does a message actually get to everyone? I keep
              seeing <code>join_channel_ack</code> in the logs
            </p>
          ),
        },
        {
          kind: "message",
          id: "g2",
          sender: "maya",
          tone: 2,
          createdAt: at(14, 58),
          text: "@ravi here is the whole path for one send",
          body: (
            <>
              <p>
                <span className="mention">@ravi</span> here is the whole path
                for one send:
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
            </>
          ),
        },
        {
          kind: "message",
          id: "g3",
          sender: "maya",
          tone: 2,
          createdAt: at(14, 58),
          text: "Postgres first, then fan out. That order is the whole lesson.",
        },
        {
          kind: "message",
          id: "g4",
          sender: "ravi",
          tone: 3,
          createdAt: at(15, 1),
          text: "so if my laptop sleeps, the reconnect just refetches history and dedupes by id?",
        },
        {
          kind: "message",
          id: "g5",
          sender: ME,
          tone: 1,
          createdAt: at(15, 2),
          text: "yep. join ack triggers a history fetch, merge by id, sort by server time. newest 50 for now.",
          delivery: "delivered",
        },
      ],
    },
    {
      id: "shipping",
      name: "shipping",
      topic: "What went out, and when.",
      items: [
        {
          kind: "message",
          id: "s1",
          sender: "ravi",
          tone: 3,
          createdAt: at(14, 41),
          text: "redis pub/sub is on in staging",
        },
      ],
    },
    {
      id: "design",
      name: "design",
      topic: "Mockups, crits, and the occasional moodboard.",
      items: [],
    },
    {
      id: "random",
      name: "random",
      topic: "Everything else.",
      items: [
        {
          kind: "message",
          id: "r1",
          sender: "ana",
          tone: 4,
          createdAt: at(16, 20, 1),
          text: "who left the kettle on",
        },
      ],
    },
    {
      id: "incidents",
      name: "incidents",
      topic: "When something breaks.",
      items: [
        {
          kind: "message",
          id: "i1",
          sender: ME,
          tone: 1,
          createdAt: at(11, 5, 3),
          text: "reconnect gap-fill verified",
        },
      ],
    },
  ];
}

export function LiveDemo() {
  const [theme, setTheme] = useTheme(false);
  const [channels, setChannels] = useState(seedChannels);
  const [activeId, setActiveId] = useState("general");
  // Seeded so the landing page shows what an unread channel looks like.
  const [unread, setUnread] = useState<ReadonlySet<string>>(new Set(["shipping"]));
  const [view, setView] = useState<"chat" | "profile">("chat");
  const [dialog, setDialog] = useState<"channel" | "invite" | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const nextId = useRef(0);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const active = channels.find((channel) => channel.id === activeId) ?? channels[0]!;

  const updateItems = (channelId: string, update: (items: FeedItem[]) => FeedItem[]) =>
    setChannels((current) =>
      current.map((channel) =>
        channel.id === channelId ? { ...channel, items: update(channel.items) } : channel,
      ),
    );

  const send = (text: string) => {
    const id = `sent-${nextId.current++}`;
    const channelId = active.id;
    updateItems(channelId, (items) => [
      ...items,
      {
        kind: "message",
        id,
        sender: ME,
        tone: 1,
        createdAt: new Date().toISOString(),
        text,
        delivery: "sending",
      },
    ]);
    timers.current.push(
      setTimeout(() => {
        updateItems(channelId, (items) =>
          items.map((item) =>
            item.id === id && item.kind === "message" ? { ...item, delivery: "delivered" } : item,
          ),
        );
      }, 650),
    );
  };

  const select = (id: string) => {
    setActiveId(id);
    setUnread((current) => new Set([...current].filter((channelId) => channelId !== id)));
    setView("chat");
    setDrawerOpen(false);
  };

  const openDialog = (next: "channel" | "invite") => {
    setDrawerOpen(false);
    setDialog(next);
  };

  return (
    <ChatLayout
      theme={theme}
      embed
      drawerOpen={drawerOpen}
      onCloseDrawer={() => setDrawerOpen(false)}
      sidebar={
        <ChannelSidebar
          workspaceName="Studio"
          channels={channels.map((channel) => ({
            id: channel.id,
            name: channel.name,
            unread: unread.has(channel.id),
          }))}
          activeId={view === "chat" ? active.id : undefined}
          username={ME}
          connected
          statusLabel="Connected"
          onSelect={select}
          onInvite={() => openDialog("invite")}
          onNewChannel={() => openDialog("channel")}
          onProfile={() => {
            setView("profile");
            setDrawerOpen(false);
          }}
        />
      }
      overlay={
        dialog === "channel" ? (
          <NewChannelDialog
            workspaceName="Studio"
            onClose={() => setDialog(null)}
            onCreate={(name) => {
              if (!channels.some((channel) => channel.id === name)) {
                setChannels((current) => [...current, { id: name, name, topic: "", items: [] }]);
              }
              select(name);
              return true;
            }}
          />
        ) : dialog === "invite" ? (
          <InviteDialog
            workspaceName="Studio"
            url="https://huddle.app/join/st-7Kq2x"
            onClose={() => setDialog(null)}
          />
        ) : null
      }
    >
      {view === "profile" ? (
        <>
          <ChannelHeader title="Profile" isChannel={false} onMenu={() => setDrawerOpen(true)} />
          <ProfileView
            username={ME}
            email="khakha@studio.dev"
            theme={theme}
            onThemeChange={setTheme}
            workspaceName="Studio"
            role="owner"
            channelCount={channels.length}
          />
        </>
      ) : (
        <>
          <ChannelHeader
            title={active.name}
            topic={active.topic}
            onMenu={() => setDrawerOpen(true)}
            actions={
              <span className="faces" title="Members">
                <span className="faces__stack">
                  <Avatar name="maya" tone={2} />
                  <Avatar name="ravi" tone={3} />
                  <Avatar name="ana" tone={4} />
                </span>
                6
              </span>
            }
          />
          <MessageFeed
            items={active.items}
            scrollKey={active.id}
            empty={
              <EmptyChannel
                channelName={active.name}
                onInvite={() => openDialog("invite")}
                onSayHello={() => composerRef.current?.focus()}
                onNewChannel={() => openDialog("channel")}
              />
            }
          />
          <Composer channelName={active.name} onSend={send} textareaRef={composerRef} />
        </>
      )}
    </ChatLayout>
  );
}
