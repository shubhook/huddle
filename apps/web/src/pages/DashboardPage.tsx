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
  { id: "deployments", name: "deployments" },
  { id: "alerts", name: "alerts" },
  { id: "logs", name: "logs" },
  { id: "support", name: "support" },
] as const;

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "1",
    sender: "system_bot",
    channel: "engineering",
    timestamp: "14:30:00",
    codeBlock: "[INFO] Deployment v2.4.1 initialized.",
    content:
      "All pre-flight checks passed. Initiating rolling restart of worker nodes in us-east-1.",
    avatarTone: "default",
    dateLabel: "TODAY",
  },
  {
    id: "2",
    sender: "alice_k",
    channel: "engineering",
    timestamp: "14:31:12",
    content:
      "Monitoring the rollout. CPU utilization is spiking slightly on node-A but within expected tolerances. Will keep an eye on it.",
    avatarTone: "muted",
  },
  {
    id: "3",
    sender: "bob_r",
    channel: "engineering",
    timestamp: "14:33:45",
    content:
      "Looks good from my end. Can someone review PR #402 when they have a minute? It addresses the minor UI glitch reported yesterday.",
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
  username = "johndoe",
  workspaceName = "engineering",
  onLogout,
  onWorkspaceClick,
}: DashboardPageProps) {
  const [activeChannelId, setActiveChannelId] = useState("engineering");
  const [messages, setMessages] = useState(INITIAL_MESSAGES);

  const activeChannel = useMemo(
    () =>
      INITIAL_CHANNELS.find((channel) => channel.id === activeChannelId) ??
      INITIAL_CHANNELS[1],
    [activeChannelId],
  );

  const channelMessages = useMemo(
    () => messages.filter((message) => message.channel === activeChannel.id),
    [activeChannel.id, messages],
  );

  function handleSend(content: string) {
    const now = new Date();
    const timestamp = now.toLocaleTimeString("en-GB", { hour12: false });

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
    <div className="flex h-screen overflow-hidden bg-surface-lowest">
      <Sidebar
        workspaceName={workspaceName}
        channels={[...INITIAL_CHANNELS]}
        activeChannelId={activeChannelId}
        username={username}
        onChannelSelect={setActiveChannelId}
        onWorkspaceClick={onWorkspaceClick}
        onLogout={onLogout}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          channelName={activeChannel.name}
          endContent={<ConnectionBadge status="connected" />}
          onSearch={() => undefined}
          onInfo={() => undefined}
          className="border-hairline bg-surface-frost/70 backdrop-blur-[6px]"
        />

        <div className="flex min-h-0 flex-1 flex-col bg-surface-lowest">
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