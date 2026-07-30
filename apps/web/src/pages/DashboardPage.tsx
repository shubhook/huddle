import { useMemo, useState, useEffect } from "react";

import { ConnectionBadge } from "@/components/chat/ConnectionBadge";
import { MessageInput } from "@/components/chat/MessageInput";
import { MessageList } from "@/components/chat/MessageList";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import type { ChatMessage } from "@/types";
import { getWorkspace, sendMessage } from "@/lib/api";


interface Channel {
  id: string;
  name: string;
}

interface DashboardPageProps {
  username?: string;
  workspaceName?: string;
  workspaceId: string;
  onLogout?: () => void;
  onWorkspaceClick?: () => void;
}

export function DashboardPage({
  username = "johndoe",
  workspaceName = "engineering",
  workspaceId,
  onLogout,
  onWorkspaceClick,
}: DashboardPageProps) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    if (!workspaceId) return;

    async function loadWorkspace() {
      const workspace = await getWorkspace(workspaceId);
      setChannels(workspace.channels);
      setActiveChannelId(workspace.channels[0]?.id ?? null);
    }
    loadWorkspace();
  }, [workspaceId]);


  const activeChannel = useMemo(
    () =>
      channels.find((channel) => channel.id === activeChannelId) ??
      channels[0],
    [activeChannelId, channels],
  );

  const channelMessages = useMemo(
    () => messages.filter((message) => message.channel === activeChannel?.id),
    [activeChannel?.id, messages],
  );

  async function handleSend(content: string) {
    const now = new Date();
    const timestamp = now.toLocaleTimeString("en-GB", { hour12: false });

    if(!activeChannel) return;

    try {
      const res = await sendMessage(activeChannel.id, content);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          sender: username,
          channel: activeChannel?.id ?? "",
          timestamp,
          content,
          avatarTone: "muted",
        },
      ]);
    }
    catch(e) {
      console.error("Failed to send message:", e);
      // Optionally inform the user of the failure (toast, alert, etc.)
      // Example: alert("Failed to send message. Please try again.");
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface-lowest">
      <Sidebar
        workspaceName={workspaceName}
        channels={[...channels]}
        activeChannelId={activeChannelId ?? undefined}
        username={username}
        onChannelSelect={setActiveChannelId}
        onWorkspaceClick={onWorkspaceClick}
        onLogout={onLogout}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          channelName={activeChannel?.name ?? ""}
          endContent={<ConnectionBadge status="connected" />}
          onSearch={() => undefined}
          onInfo={() => undefined}
          className="border-hairline bg-paper"
        />

        <div className="flex min-h-0 flex-1 flex-col bg-surface-lowest">
          <MessageList
            messages={channelMessages}
            channelName={activeChannel?.name ?? ""}
          />
          <MessageInput
            channelName={activeChannel?.name ?? ""}
            onSend={handleSend}
          />
        </div>
      </div>
    </div>
  );
}