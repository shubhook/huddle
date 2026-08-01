import { useMemo, useState, useEffect } from "react";

import { ConnectionBadge } from "@/components/chat/ConnectionBadge";
import { MessageInput } from "@/components/chat/MessageInput";
import { MessageList } from "@/components/chat/MessageList";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import type { ChatMessage, ConnectionStatus } from "@/types";
import { getMessages, getWorkspace } from "@/lib/api";
import {
  connectSocket,
  disconnectSocket,
  getConnectionStatus,
  joinChannel,
  leaveChannel,
  onMessage,
  onStatusChange,
  sendChannelMessage,
} from "@/lib/ws";


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
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    getConnectionStatus(),
  );

  useEffect(() => {
    if (!workspaceId) return;

    async function loadWorkspace() {
      const workspace = await getWorkspace(workspaceId);
      setChannels(workspace.channels);
      setActiveChannelId(workspace.channels[0]?.id ?? null);
    }
    loadWorkspace();
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId) return;

    connectSocket();
    const unsubscribeStatus = onStatusChange(setConnectionStatus);

    return () => {
      unsubscribeStatus();
      disconnectSocket();
    };
  }, [workspaceId]);

  useEffect(() => {
    const unsubscribe = onMessage((message) => {
      if (message.type !== "new_message") return;
      const payload = message.payload;

      setMessages((current) => {
        if (current.some((existing) => existing.id === payload.id)) {
          return current;
        }
        return [
          ...current,
          {
            id: payload.id,
            sender: payload.senderUsername,
            channel: payload.channelId,
            timestamp: new Date(payload.createdAt).toLocaleTimeString(
              "en-GB",
              { hour12: false },
            ),
            content: payload.content,
            avatarTone: "muted",
          },
        ];
      });
    });

    return unsubscribe;
  }, []);

  const activeChannel = useMemo(
    () =>
      channels.find((channel) => channel.id === activeChannelId) ??
      channels[0],
    [activeChannelId, channels],
  );

  useEffect(() => {
    if (!activeChannel) return;

    async function loadMessages() {
      const batch = await getMessages(activeChannel!.id);
      const loaded: ChatMessage[] = batch
        .slice()
        .reverse()
        .map((message) => ({
          id: message.id,
          sender: message.sender.username,
          channel: message.channelId,
          timestamp: new Date(message.createdAt).toLocaleTimeString("en-GB", {
            hour12: false,
          }),
          content: message.content,
          avatarTone: "muted",
        }));

      setMessages((current) => [
        ...current.filter((message) => message.channel !== activeChannel!.id),
        ...loaded,
      ]);
    }
    loadMessages();
  }, [activeChannel?.id]);

  useEffect(() => {
    if (connectionStatus !== "connected" || !activeChannel || !workspaceId) {
      return;
    }

    joinChannel(activeChannel.id, workspaceId);

    return () => {
      leaveChannel(activeChannel.id);
    };
  }, [activeChannel?.id, workspaceId, connectionStatus]);

  const channelMessages = useMemo(
    () => messages.filter((message) => message.channel === activeChannel?.id),
    [activeChannel?.id, messages],
  );

  function handleSend(content: string) {
    if (!activeChannel || !workspaceId) return;
    sendChannelMessage(activeChannel.id, workspaceId, content);
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
          endContent={<ConnectionBadge status={connectionStatus} />}
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