import { useMemo, useState } from "react";

import { ConnectionBadge } from "@/components/chat/ConnectionBadge";
import { MessageInput } from "@/components/chat/MessageInput";
import { MessageList } from "@/components/chat/MessageList";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import type { ChatMessage } from "@/types";

const INITIAL_CHANNELS = [
  { id: "general", name: "general" },
  { id: "engineering", name: "engineering" },
  { id: "random", name: "random" },
] as const;

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "1",
    sender: "maya",
    channel: "engineering",
    timestamp: "14:30",
    content: "Socket stayed up through the last restart. Nice.",
    avatarTone: "muted",
    dateLabel: "Today",
  },
  {
    id: "2",
    sender: "jon",
    channel: "engineering",
    timestamp: "14:31",
    content:
      "Still need reconnect on the client. Closing the laptop kills the badge until you reload.",
    avatarTone: "muted",
  },
  {
    id: "3",
    sender: "maya",
    channel: "engineering",
    timestamp: "14:33",
    content: "Yeah. Heartbeats next, then Redis if we ever run two API processes.",
    avatarTone: "muted",
  },
];

interface DashboardPageProps {
  username?: string;
  workspaceName?: string;
  onLogout?: () => void;
  onWorkspaceClick?: () => void;
}

export function DashboardPage({
  username = "you",
  workspaceName = "studio",
  onLogout,
  onWorkspaceClick,
}: DashboardPageProps) {
  const [activeChannelId, setActiveChannelId] = useState("engineering");
  const [messages, setMessages] = useState(INITIAL_MESSAGES);

  const activeChannel = useMemo(
    () =>
      INITIAL_CHANNELS.find((channel) => channel.id === activeChannelId) ??
      INITIAL_CHANNELS[0],
    [activeChannelId],
  );

  const channelMessages = useMemo(
    () => messages.filter((message) => message.channel === activeChannel.id),
    [activeChannel.id, messages],
  );

  function handleSend(content: string) {
    const timestamp = new Date().toLocaleTimeString("en-GB", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    });

    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        sender: username,
        channel: activeChannel.id,
        timestamp,
        content,
        avatarTone: "muted",
      },
    ]);
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        workspaceName={workspaceName}
        channels={[...INITIAL_CHANNELS]}
        activeChannelId={activeChannelId}
        username={username}
        onChannelSelect={setActiveChannelId}
        onWorkspaceClick={onWorkspaceClick}
        onLogout={onLogout}
      />

      <div className="flex min-w-0 flex-1 flex-col bg-surface/50">
        <TopBar
          channelName={activeChannel.name}
          endContent={<ConnectionBadge status="connected" />}
        />

        <div className="flex min-h-0 flex-1 flex-col">
          <MessageList
            messages={channelMessages}
            channelName={activeChannel.name}
          />
          <MessageInput
            channelName={activeChannel.name}
            onSend={handleSend}
          />
        </div>
      </div>
    </div>
  );
}
