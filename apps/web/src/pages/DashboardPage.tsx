import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ConnectionBadge } from "@/components/chat/ConnectionBadge";
import { MessageInput } from "@/components/chat/MessageInput";
import { MessageList } from "@/components/chat/MessageList";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
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
import type { ChatMessage, ConnectionStatus } from "@/types";

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

/** How long to wait for the server's ack before telling the user the send is unconfirmed. */
const SEND_CONFIRM_TIMEOUT_MS = 10_000;
const NOTICE_VISIBLE_MS = 6_000;
/** Matches the server's limit. Checking here keeps a too-long draft in the box instead of losing it. */
const MAX_MESSAGE_LENGTH = 4000;

function toChatMessage(message: {
  id: string;
  sender: string;
  channel: string;
  createdAt: string;
  content: string;
}): ChatMessage {
  return {
    ...message,
    timestamp: new Date(message.createdAt).toLocaleTimeString("en-GB", {
      hour12: false,
    }),
    avatarTone: "muted",
  };
}

/**
 * History (REST) and live messages (socket) reach the page by different routes
 * and can overlap or arrive in either order. Merge by id, newest copy wins,
 * and keep everything sorted by server time.
 */
function mergeMessages(
  current: ChatMessage[],
  incoming: ChatMessage[],
): ChatMessage[] {
  const byId = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) byId.set(message.id, message);

  return [...byId.values()].sort((a, b) =>
    (a.createdAt ?? "").localeCompare(b.createdAt ?? ""),
  );
}

export function DashboardPage({
  username = "you",
  workspaceName = "studio",
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
  const [notice, setNotice] = useState<string | null>(null);
  // clientMessageId -> timer that fires if the server never acks that send.
  const pendingSends = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    const pending = pendingSends.current;
    return () => {
      pending.forEach((timer) => clearTimeout(timer));
      pending.clear();
    };
  }, []);

  useEffect(() => {
    if (!workspaceId) return;

    async function loadWorkspace() {
      try {
        const workspace = await getWorkspace(workspaceId);
        setChannels(workspace.channels);
        setActiveChannelId(workspace.channels[0]?.id ?? null);
      } catch {
        setNotice("Could not load this workspace.");
      }
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

  const loadHistory = useCallback(async (channelId: string) => {
    try {
      const batch = await getMessages(channelId);
      const loaded = batch.map((message) =>
        toChatMessage({
          id: message.id,
          sender: message.sender.username,
          channel: message.channelId,
          createdAt: message.createdAt,
          content: message.content,
        }),
      );
      setMessages((current) => mergeMessages(current, loaded));
    } catch {
      setNotice("Could not load message history.");
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onMessage((message) => {
      switch (message.type) {
        case "new_message": {
          const payload = message.payload;
          setMessages((current) =>
            mergeMessages(current, [
              toChatMessage({
                id: payload.id,
                sender: payload.senderUsername,
                channel: payload.channelId,
                createdAt: payload.createdAt,
                content: payload.content,
              }),
            ]),
          );
          break;
        }

        case "join_channel_ack":
          // The socket is subscribed now, so anything sent from here on arrives live.
          // Fetching after the join covers whatever was sent before it, including
          // messages missed while the socket was down.
          void loadHistory(message.channelId);
          break;

        case "send_message_ack": {
          if (!message.clientMessageId) break;
          const timer = pendingSends.current.get(message.clientMessageId);
          if (timer) clearTimeout(timer);
          pendingSends.current.delete(message.clientMessageId);
          break;
        }

        case "removed_from_channel":
          setChannels((current) =>
            current.filter((channel) => channel.id !== message.channelId),
          );
          setActiveChannelId((current) =>
            current === message.channelId ? null : current,
          );
          setNotice("You no longer have access to a channel you had open.");
          break;

        case "error": {
          if (message.clientMessageId) {
            const timer = pendingSends.current.get(message.clientMessageId);
            if (timer) clearTimeout(timer);
            pendingSends.current.delete(message.clientMessageId);
            setNotice(`Message not sent: ${message.message}`);
          } else {
            setNotice(message.message);
          }
          break;
        }
      }
    });

    return unsubscribe;
  }, [loadHistory]);

  const activeChannel = useMemo(
    () =>
      channels.find((channel) => channel.id === activeChannelId) ?? channels[0],
    [activeChannelId, channels],
  );

  // Load history when a channel opens, even if the socket is down. The join ack
  // loads it again once the socket is subscribed.
  useEffect(() => {
    if (!activeChannel) return;
    void loadHistory(activeChannel.id);
  }, [activeChannel?.id, loadHistory]);

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

  /** Returns false when nothing was sent, so the input keeps the user's text. */
  function handleSend(content: string): boolean {
    if (!activeChannel || !workspaceId) return false;

    if (content.length > MAX_MESSAGE_LENGTH) {
      setNotice(
        `Messages are limited to ${MAX_MESSAGE_LENGTH} characters. This one has ${content.length}.`,
      );
      return false;
    }

    const clientMessageId = sendChannelMessage(
      activeChannel.id,
      workspaceId,
      content,
    );

    if (clientMessageId === null) {
      setNotice("Not connected. Your message was not sent.");
      return false;
    }

    pendingSends.current.set(
      clientMessageId,
      setTimeout(() => {
        pendingSends.current.delete(clientMessageId);
        setNotice("A message was not confirmed and may not have been delivered.");
      }, SEND_CONFIRM_TIMEOUT_MS),
    );
    return true;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        workspaceName={workspaceName}
        channels={[...channels]}
        activeChannelId={activeChannelId ?? undefined}
        username={username}
        onChannelSelect={setActiveChannelId}
        onWorkspaceClick={onWorkspaceClick}
        onLogout={onLogout}
      />

      <div className="flex min-w-0 flex-1 flex-col bg-surface/50">
        <TopBar
          channelName={activeChannel?.name ?? ""}
          endContent={<ConnectionBadge status={connectionStatus} />}
        />

        <div className="flex min-h-0 flex-1 flex-col">
          <MessageList
            messages={channelMessages}
            channelName={activeChannel?.name ?? ""}
          />
          {notice && (
            <div
              role="alert"
              className="mx-4 mb-2 rounded-md border border-hairline bg-paper px-3 py-2 text-xs text-ink"
            >
              {notice}
            </div>
          )}
          <MessageInput
            channelName={activeChannel?.name ?? ""}
            onSend={handleSend}
          />
        </div>
      </div>
    </div>
  );
}
