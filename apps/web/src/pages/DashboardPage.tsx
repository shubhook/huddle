import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ChannelHeader } from "@/components/app/ChannelHeader";
import { ChannelSidebar, type SidebarChannel } from "@/components/app/ChannelSidebar";
import { ChatLayout } from "@/components/app/ChatLayout";
import { Composer, MAX_MESSAGE_LENGTH } from "@/components/app/Composer";
import { InviteDialog, NewChannelDialog } from "@/components/app/Dialogs";
import { EmptyChannel } from "@/components/app/EmptyChannel";
import { shortWhen } from "@/components/app/format";
import { MessageFeed, type FeedItem } from "@/components/app/MessageFeed";
import { ProfileView } from "@/components/app/ProfileView";
import { useTheme } from "@/components/app/useTheme";
import { WorkspaceRail } from "@/components/app/WorkspaceRail";
import { Icon } from "@/components/ui/Icon";
import {
  createChannel,
  createInvite,
  type CurrentUser,
  getApiErrorMessage,
  getMessages,
  getWorkspace,
  type WorkspaceSummary,
} from "@/lib/api";
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

/** A send the server has not acked yet. */
interface PendingSend {
  clientMessageId: string;
  channelId: string;
  content: string;
  createdAt: string;
  failed: boolean;
}

interface DashboardPageProps {
  user: CurrentUser;
  workspaces: WorkspaceSummary[];
  workspaceId: string;
  onSelectWorkspace: (workspaceId: string) => void;
  onCreateWorkspace: () => void;
  onLogout: () => void;
}

/** How long to wait for the server's ack before marking a send unconfirmed. */
const SEND_CONFIRM_TIMEOUT_MS = 10_000;
const NOTICE_VISIBLE_MS = 6_000;

/**
 * History (REST) and live messages (socket) reach the page by different routes
 * and can overlap or arrive in either order. Merge by id, newest copy wins,
 * and keep everything sorted by server time.
 */
function mergeMessages(current: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const byId = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) byId.set(message.id, message);
  return [...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function DashboardPage({
  user,
  workspaces,
  workspaceId,
  onSelectWorkspace,
  onCreateWorkspace,
  onLogout,
}: DashboardPageProps) {
  const [theme, setTheme] = useTheme();
  const [workspaceName, setWorkspaceName] = useState("");
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  /** Channels whose history has been fetched at least once. */
  const [loadedChannels, setLoadedChannels] = useState<ReadonlySet<string>>(new Set());
  const [pending, setPending] = useState<PendingSend[]>([]);
  /** Ids of messages this tab sent and the server confirmed. */
  const [delivered, setDelivered] = useState<ReadonlySet<string>>(new Set());
  const [status, setStatus] = useState<ConnectionStatus>(getConnectionStatus());
  const [hasConnected, setHasConnected] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [view, setView] = useState<"chat" | "profile">("chat");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dialog, setDialog] = useState<"channel" | "invite" | null>(null);
  const [dialogError, setDialogError] = useState<string>();
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  // clientMessageId -> timer that fires if the server never acks that send.
  const ackTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  // The ack handler needs the pending send, but runs in a long-lived listener.
  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  // Usernames seen in this workspace. A new one means someone joined, so the
  // member count is refreshed.
  const knownSenders = useRef(new Set<string>());

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    const timers = ackTimers.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const loadHistory = useCallback(async (channelId: string) => {
    try {
      const batch = await getMessages(channelId);
      const loaded = batch.map((message) => ({
        id: message.id,
        sender: message.sender.username,
        channel: message.channelId,
        createdAt: message.createdAt,
        content: message.content,
      }));
      loaded.forEach((message) => knownSenders.current.add(message.sender));
      setMessages((current) => mergeMessages(current, loaded));
      setLoadedChannels((current) => new Set(current).add(channelId));
    } catch {
      setNotice("Could not load message history.");
    }
  }, []);

  // A new workspace starts from a clean slate. History for every channel is
  // fetched up front so the sidebar can show each channel's latest message.
  useEffect(() => {
    if (!workspaceId) return;
    let cancelled = false;

    setChannels([]);
    setMessages([]);
    setLoadedChannels(new Set());
    setActiveChannelId(null);
    setWorkspaceName("");
    setMemberCount(null);
    setView("chat");
    knownSenders.current = new Set([user.username]);

    getWorkspace(workspaceId)
      .then((workspace) => {
        if (cancelled) return;
        setWorkspaceName(workspace.general.name);
        setMemberCount(workspace.members.length);
        setChannels(workspace.channels);
        setActiveChannelId(workspace.channels[0]?.id ?? null);
        workspace.channels.forEach((channel) => void loadHistory(channel.id));
      })
      .catch(() => {
        if (!cancelled) setNotice("Could not load this workspace.");
      });

    return () => {
      cancelled = true;
    };
  }, [workspaceId, loadHistory, user.username]);

  useEffect(() => {
    connectSocket();
    const unsubscribe = onStatusChange(setStatus);
    return () => {
      unsubscribe();
      disconnectSocket();
    };
  }, []);

  useEffect(() => {
    if (status === "connected") setHasConnected(true);
  }, [status]);

  useEffect(() => {
    const settle = (clientMessageId: string) => {
      const timer = ackTimers.current.get(clientMessageId);
      if (timer) clearTimeout(timer);
      ackTimers.current.delete(clientMessageId);
    };

    return onMessage((message) => {
      switch (message.type) {
        case "new_message": {
          const payload = message.payload;
          if (!knownSenders.current.has(payload.senderUsername)) {
            knownSenders.current.add(payload.senderUsername);
            getWorkspace(workspaceId)
              .then((workspace) => setMemberCount(workspace.members.length))
              .catch(() => {});
          }
          setMessages((current) =>
            mergeMessages(current, [
              {
                id: payload.id,
                sender: payload.senderUsername,
                channel: payload.channelId,
                createdAt: payload.createdAt,
                content: payload.content,
              },
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
          const clientMessageId = message.clientMessageId;
          if (!clientMessageId) break;
          settle(clientMessageId);
          const send = pendingRef.current.find(
            (entry) => entry.clientMessageId === clientMessageId,
          );
          // Swap the placeholder for the saved message. The broadcast copy,
          // with the server's timestamp, replaces this one by id.
          if (send) {
            setMessages((current) =>
              mergeMessages(current, [
                {
                  id: message.messageId,
                  sender: user.username,
                  channel: send.channelId,
                  createdAt: send.createdAt,
                  content: send.content,
                },
              ]),
            );
          }
          setDelivered((current) => new Set(current).add(message.messageId));
          setPending((current) =>
            current.filter((entry) => entry.clientMessageId !== clientMessageId),
          );
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

        case "error":
          if (message.clientMessageId) {
            const clientMessageId = message.clientMessageId;
            settle(clientMessageId);
            setPending((current) =>
              current.filter((entry) => entry.clientMessageId !== clientMessageId),
            );
            setNotice(`Message not sent: ${message.message}`);
          } else {
            setNotice(message.message);
          }
          break;
      }
    });
  }, [loadHistory, user.username, workspaceId]);

  const activeChannel = useMemo(
    () => channels.find((channel) => channel.id === activeChannelId) ?? channels[0],
    [activeChannelId, channels],
  );

  useEffect(() => {
    if (status !== "connected" || !activeChannel) return;
    joinChannel(activeChannel.id, workspaceId);
    return () => {
      leaveChannel(activeChannel.id);
    };
  }, [activeChannel?.id, workspaceId, status]);

  const sidebarChannels: SidebarChannel[] = useMemo(() => {
    const latest = new Map<string, ChatMessage>();
    for (const message of messages) latest.set(message.channel, message);

    return channels.map((channel) => {
      const last = latest.get(channel.id);
      if (!last) {
        return {
          ...channel,
          preview: loadedChannels.has(channel.id) ? "No messages yet" : "",
          when: loadedChannels.has(channel.id) ? "—" : "",
        };
      }
      const who = last.sender === user.username ? "you" : last.sender;
      return { ...channel, preview: `${who}: ${last.content}`, when: shortWhen(last.createdAt) };
    });
  }, [channels, messages, loadedChannels, user.username]);

  const feedItems: FeedItem[] = useMemo(() => {
    if (!activeChannel) return [];
    const saved: FeedItem[] = messages
      .filter((message) => message.channel === activeChannel.id)
      .map((message) => ({
        kind: "message",
        id: message.id,
        sender: message.sender,
        createdAt: message.createdAt,
        text: message.content,
        tone: message.sender === user.username ? 1 : undefined,
        delivery: delivered.has(message.id) ? "delivered" : undefined,
      }));
    const unsaved: FeedItem[] = pending
      .filter((send) => send.channelId === activeChannel.id)
      .map((send) => ({
        kind: "message",
        id: send.clientMessageId,
        sender: user.username,
        createdAt: send.createdAt,
        text: send.content,
        tone: 1,
        delivery: send.failed ? "failed" : "sending",
      }));
    return [...saved, ...unsaved];
  }, [activeChannel, messages, pending, delivered, user.username]);

  /** Returns false when nothing was sent, so the composer keeps the draft. */
  function handleSend(content: string): boolean {
    if (!activeChannel) return false;

    if (content.length > MAX_MESSAGE_LENGTH) {
      setNotice(
        `Messages are limited to ${MAX_MESSAGE_LENGTH} characters. This one has ${content.length}.`,
      );
      return false;
    }

    const clientMessageId = sendChannelMessage(activeChannel.id, workspaceId, content);
    if (clientMessageId === null) {
      setNotice("Not connected. Your message was not sent.");
      return false;
    }

    setPending((current) => [
      ...current,
      {
        clientMessageId,
        channelId: activeChannel.id,
        content,
        createdAt: new Date().toISOString(),
        failed: false,
      },
    ]);
    ackTimers.current.set(
      clientMessageId,
      setTimeout(() => {
        ackTimers.current.delete(clientMessageId);
        setPending((current) =>
          current.map((entry) =>
            entry.clientMessageId === clientMessageId ? { ...entry, failed: true } : entry,
          ),
        );
        setNotice("A message was not confirmed and may not have been delivered.");
      }, SEND_CONFIRM_TIMEOUT_MS),
    );
    return true;
  }

  async function handleCreateChannel(name: string): Promise<boolean> {
    try {
      const channel = await createChannel(workspaceId, name);
      // The creator is added as a member server-side, so it is safe to open now.
      setChannels((current) =>
        current.some((existing) => existing.id === channel.id)
          ? current
          : [...current, { id: channel.id, name: channel.name }],
      );
      setLoadedChannels((current) => new Set(current).add(channel.id));
      setActiveChannelId(channel.id);
      setView("chat");
      return true;
    } catch (error) {
      setDialogError(getApiErrorMessage(error, "Could not create channel."));
      return false;
    }
  }

  function openDialog(next: "channel" | "invite") {
    setDialogError(undefined);
    setDrawerOpen(false);
    setDialog(next);
    if (next !== "invite") return;

    setInviteUrl(null);
    createInvite(workspaceId)
      .then(({ token }) => setInviteUrl(`${window.location.origin}/#/join/${token}`))
      .catch((error) =>
        setDialogError(getApiErrorMessage(error, "Could not create an invite link.")),
      );
  }

  const connected = status === "connected";
  const statusLabel = connected
    ? "Connected"
    : status === "connecting"
      ? hasConnected
        ? "Reconnecting…"
        : "Connecting…"
      : "Offline";
  const role = workspaces.find((workspace) => workspace.id === workspaceId)?.role;
  const channelName = activeChannel?.name ?? "";

  return (
    <ChatLayout
      theme={theme}
      drawerOpen={drawerOpen}
      onCloseDrawer={() => setDrawerOpen(false)}
      rail={
        <WorkspaceRail
          workspaces={workspaces}
          activeId={workspaceId}
          profileOpen={view === "profile"}
          onSelect={(id) => {
            setDrawerOpen(false);
            if (id !== workspaceId) onSelectWorkspace(id);
            else setView("chat");
          }}
          onCreate={onCreateWorkspace}
          onProfile={() => {
            setDrawerOpen(false);
            setView((current) => (current === "profile" ? "chat" : "profile"));
          }}
        />
      }
      sidebar={
        <ChannelSidebar
          workspaceName={workspaceName}
          channels={sidebarChannels}
          activeId={view === "chat" ? activeChannel?.id : undefined}
          username={user.username}
          connected={connected}
          statusLabel={statusLabel}
          shortcut
          onSelect={(id) => {
            setActiveChannelId(id);
            setView("chat");
            setDrawerOpen(false);
          }}
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
            workspaceName={workspaceName}
            error={dialogError}
            onCreate={handleCreateChannel}
            onClose={() => setDialog(null)}
          />
        ) : dialog === "invite" ? (
          <InviteDialog
            workspaceName={workspaceName}
            url={inviteUrl}
            error={dialogError}
            onClose={() => setDialog(null)}
          />
        ) : null
      }
    >
      {view === "profile" ? (
        <>
          <ChannelHeader title="Profile" isChannel={false} onMenu={() => setDrawerOpen(true)} />
          <ProfileView
            username={user.username}
            email={user.email}
            theme={theme}
            onThemeChange={setTheme}
            workspaceName={workspaceName}
            role={role}
            channelCount={channels.length}
            onSignOut={onLogout}
          />
        </>
      ) : (
        <>
          <ChannelHeader
            title={channelName}
            onMenu={() => setDrawerOpen(true)}
            actions={
              memberCount !== null && (
                <span className="faces faces--plain" title="Members in this workspace">
                  <Icon name="users" />
                  {memberCount}
                </span>
              )
            }
          />

          {hasConnected && !connected && (
            <div className="banner" role="status">
              <Icon name="wifiOff" />
              Connection lost. Reconnecting… History will fill in when we are back.
              <button type="button" onClick={() => connectSocket()}>
                Retry now
              </button>
            </div>
          )}

          {activeChannel && !loadedChannels.has(activeChannel.id) ? (
            <div className="feed">
              <p className="loading">Loading #{channelName}…</p>
            </div>
          ) : (
            <MessageFeed
              items={feedItems}
              scrollKey={activeChannel?.id}
              empty={
                activeChannel ? (
                  <EmptyChannel
                    channelName={channelName}
                    onInvite={() => openDialog("invite")}
                    onSayHello={() => composerRef.current?.focus()}
                    onNewChannel={() => openDialog("channel")}
                  />
                ) : (
                  <p className="loading">{workspaceName ? "No channels yet." : "Loading…"}</p>
                )
              }
            />
          )}

          {notice && (
            <div className="notice" role="alert">
              {notice}
            </div>
          )}
          {activeChannel && (
            <Composer channelName={channelName} onSend={handleSend} textareaRef={composerRef} />
          )}
        </>
      )}
    </ChatLayout>
  );
}
