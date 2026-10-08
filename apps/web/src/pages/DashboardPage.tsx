import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ChannelDetails } from "@/components/app/ChannelDetails";
import { ChannelHeader } from "@/components/app/ChannelHeader";
import {
  ChannelSidebar,
  type Presence,
  type SidebarChannel,
} from "@/components/app/ChannelSidebar";
import { ChatLayout } from "@/components/app/ChatLayout";
import { Composer, MAX_MESSAGE_LENGTH } from "@/components/app/Composer";
import { DeleteChannelDialog, InviteDialog, NewChannelDialog } from "@/components/app/Dialogs";
import { EmptyChannel } from "@/components/app/EmptyChannel";
import { MessageFeed, MessageSkeleton, type FeedItem } from "@/components/app/MessageFeed";
import { ProfileView } from "@/components/app/ProfileView";
import { useTheme } from "@/components/app/useTheme";
import { WorkspaceRail } from "@/components/app/WorkspaceRail";
import { Icon } from "@/components/ui/Icon";
import axios from "axios";

import {
  avatarUrl,
  type ChannelDetails as ChannelDetailsData,
  type ChannelMessage,
  createChannel,
  createInvite,
  type CurrentUser,
  deleteChannel,
  getApiErrorMessage,
  getChannelDetails,
  getMessages,
  getWorkspace,
  markChannelRead,
  removeAvatar,
  uploadAvatar,
  type WorkspaceSummary,
} from "@/lib/api";
import { cachedWorkspace, cacheWorkspace } from "@/lib/cache";
import { shrinkForAvatar } from "@/lib/image";
import {
  connectSocket,
  disconnectSocket,
  getConnectionStatus,
  joinChannel,
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
  /** Resends after a reconnect go to the workspace the message was written in. */
  workspaceId: string;
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
  /** The signed-in user's picture changed. Null when it was removed. */
  onAvatarChange: (avatarId: string | null) => void;
  onLogout: () => void;
}

/** How long to wait for the server's ack before marking a send unconfirmed. */
const SEND_CONFIRM_TIMEOUT_MS = 10_000;
const NOTICE_VISIBLE_MS = 6_000;
/** Quiet time before the workspace is written to the local cache. */
const CACHE_WRITE_DELAY_MS = 500;
/** Quiet time on an open channel before its read marker moves on the server. */
const MARK_READ_DELAY_MS = 1_000;
/**
 * Pages of 50 fetched forward when catching up a channel. Further behind than that,
 * the channel starts over from its newest page and older ones load on scroll.
 */
const MAX_CATCH_UP_PAGES = 4;

/** Prefix for a channel shown before the server has created it. */
const PENDING_CHANNEL_PREFIX = "pending:";
const isPendingChannel = (channelId: string) => channelId.startsWith(PENDING_CHANNEL_PREFIX);

/**
 * History (REST) and live messages (socket) reach the page by different routes
 * and can overlap or arrive in either order. Merge by id, newest copy wins,
 * and keep everything sorted by server time.
 */
function mergeMessages(current: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const byId = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) byId.set(message.id, message);
  return [...byId.values()].sort(compareMessages);
}

/** Server time, then id, the same order the server pages in. */
function compareMessages(a: ChatMessage, b: ChatMessage): number {
  return a.createdAt.localeCompare(b.createdAt) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

/** Messages are kept sorted oldest first, so the newest of a channel is the last match. */
function newestIn(messages: ChatMessage[], channelId: string): ChatMessage | undefined {
  return messages.findLast((message) => message.channel === channelId);
}

function oldestIn(messages: ChatMessage[], channelId: string): ChatMessage | undefined {
  return messages.find((message) => message.channel === channelId);
}

function toChatMessage(message: ChannelMessage): ChatMessage {
  return {
    id: message.id,
    sender: message.sender.username,
    senderId: message.senderId,
    senderAvatarId: message.sender.avatarId,
    channel: message.channelId,
    createdAt: message.createdAt,
    content: message.content,
  };
}

/** Tracks whether the tab is on screen. A hidden tab has not read what arrives in it. */
function usePageVisible(): boolean {
  const [visible, setVisible] = useState(() => document.visibilityState === "visible");
  useEffect(() => {
    const update = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  return visible;
}

export function DashboardPage({
  user,
  workspaces,
  workspaceId,
  onSelectWorkspace,
  onCreateWorkspace,
  onAvatarChange,
  onLogout,
}: DashboardPageProps) {
  const [theme, setTheme] = useTheme();
  /** The workspace the state below belongs to. Lags the prop for one render on a switch. */
  const [stateWorkspaceId, setStateWorkspaceId] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState("");
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  /** Channels whose history has been fetched at least once. */
  const [loadedChannels, setLoadedChannels] = useState<ReadonlySet<string>>(new Set());
  /** Channels with messages from others after the read marker. Seeded by the server, then kept live. */
  const [unread, setUnread] = useState<ReadonlySet<string>>(new Set());
  /** Channels whose oldest message has been loaded, so there is nothing further back. */
  const [exhausted, setExhausted] = useState<ReadonlySet<string>>(new Set());
  const [loadingOlder, setLoadingOlder] = useState<string | null>(null);
  /** Bumped on every `subscribed` frame, so effects can react to a fresh subscription. */
  const [subscription, setSubscription] = useState(0);
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
  /** The channel the delete confirmation is asking about. */
  const [deleteTarget, setDeleteTarget] = useState<Channel | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [details, setDetails] = useState<ChannelDetailsData | null>(null);
  const [detailsError, setDetailsError] = useState<string>();
  const composerRef = useRef<HTMLTextAreaElement>(null);
  // clientMessageId -> timer that fires if the server never acks that send.
  const ackTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  // The ack handler needs the pending send, but runs in a long-lived listener.
  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  // Usernames seen in this workspace. A new one means someone joined, so the
  // member count is refreshed.
  const knownSenders = useRef(new Set<string>());
  // The channel on screen right now, read by the long-lived socket listener.
  const viewingRef = useRef<string | null>(null);
  // Read by the socket listener to name a channel someone else deleted.
  const channelsRef = useRef(channels);
  channelsRef.current = channels;
  // Channels this tab is deleting. Their channel_deleted frame needs no notice.
  const deletingIds = useRef(new Set<string>());
  // Read by fetches that finish later, to page from the right message and to drop
  // results for a workspace the user has already left.
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const workspaceRef = useRef(workspaceId);
  workspaceRef.current = workspaceId;
  // Channels this connection receives. Null until the server's `subscribed` frame.
  const subscribedRef = useRef<Set<string> | null>(null);
  // Channels a join_channel was sent for on this connection, so it is sent once.
  const joinRequested = useRef(new Set<string>());
  // The newest message id sent as each channel's read marker.
  const lastMarked = useRef(new Map<string, string>());
  const olderInFlight = useRef(new Set<string>());
  const pageVisible = usePageVisible();

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

  /** The server saved this send: drop the placeholder and show it as delivered. */
  const confirmSend = useCallback((clientMessageId: string, messageId: string) => {
    const timer = ackTimers.current.get(clientMessageId);
    if (timer) clearTimeout(timer);
    ackTimers.current.delete(clientMessageId);
    setDelivered((current) => new Set(current).add(messageId));
    setPending((current) =>
      current.filter((entry) => entry.clientMessageId !== clientMessageId),
    );
  }, []);

  /** Starts the timer that marks a send unconfirmed if no ack arrives. */
  const armAckTimer = useCallback((clientMessageId: string) => {
    const existing = ackTimers.current.get(clientMessageId);
    if (existing) clearTimeout(existing);
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
  }, []);

  /**
   * Bookkeeping for messages fetched over REST. A pending send of ours that shows up here
   * was saved, and its ack was lost.
   */
  const receiveFetched = useCallback(
    (batch: ChannelMessage[]) => {
      for (const message of batch) {
        knownSenders.current.add(message.sender.username);
        if (
          message.senderId === user.id &&
          message.clientMessageId &&
          pendingRef.current.some((send) => send.clientMessageId === message.clientMessageId)
        ) {
          confirmSend(message.clientMessageId, message.id);
        }
      }
      return batch.map(toChatMessage);
    },
    [user.id, confirmSend],
  );

  /**
   * Fetches what this tab is missing for a channel: everything after the newest message it
   * has, page by page. Too far behind, or holding nothing yet, it takes the newest page
   * instead and older pages load on scroll. Call it after the socket is subscribed to the
   * channel, so a message sent during the fetch arrives live.
   */
  const syncChannel = useCallback(
    async (channelId: string) => {
      const forWorkspace = workspaceRef.current;
      const fetched: ChannelMessage[] = [];
      let startOver = true;
      let olderExhausted: boolean | undefined;

      try {
        let after = newestIn(messagesRef.current, channelId)?.id;
        if (after) {
          try {
            for (let page = 0; page < MAX_CATCH_UP_PAGES; page++) {
              const { messages: batch, hasMore } = await getMessages(channelId, { after });
              fetched.push(...batch);
              if (!hasMore || batch.length === 0) {
                startOver = false;
                break;
              }
              after = batch[batch.length - 1]!.id;
            }
          } catch (error) {
            // A 400 means the server does not know the message we hold (a cache from another
            // database, say). Anything else is a real failure.
            if (!axios.isAxiosError(error) || error.response?.status !== 400) throw error;
          }
        }

        if (startOver) {
          const { messages: batch, hasMore } = await getMessages(channelId);
          fetched.splice(0, fetched.length, ...batch);
          olderExhausted = !hasMore;
        }

        if (workspaceRef.current !== forWorkspace) return;

        const loaded = receiveFetched(fetched);
        const oldestLoaded = loaded.reduce<ChatMessage | undefined>(
          (oldest, message) => (!oldest || compareMessages(message, oldest) < 0 ? message : oldest),
          undefined,
        );
        setMessages((current) => {
          if (!startOver) return mergeMessages(current, loaded);
          // Starting over leaves a gap below the new page, so drop what is under it. Live
          // messages that landed while the page was in flight are newer and stay.
          const kept = current.filter(
            (message) =>
              message.channel !== channelId ||
              (oldestLoaded !== undefined && compareMessages(message, oldestLoaded) >= 0),
          );
          return mergeMessages(kept, loaded);
        });
        if (olderExhausted !== undefined) {
          setExhausted((current) => {
            if (current.has(channelId) === olderExhausted) return current;
            const next = new Set(current);
            if (olderExhausted) next.add(channelId);
            else next.delete(channelId);
            return next;
          });
        }
        setLoadedChannels((current) => new Set(current).add(channelId));
      } catch {
        if (workspaceRef.current === forWorkspace) setNotice("Could not load message history.");
      }
    },
    [receiveFetched],
  );

  /** One page further back than the oldest message loaded for the channel. */
  const loadOlder = useCallback(
    async (channelId: string) => {
      const oldest = oldestIn(messagesRef.current, channelId);
      if (!oldest || olderInFlight.current.has(channelId)) return;
      const forWorkspace = workspaceRef.current;

      olderInFlight.current.add(channelId);
      setLoadingOlder(channelId);
      try {
        const { messages: batch, hasMore } = await getMessages(channelId, { before: oldest.id });
        if (workspaceRef.current !== forWorkspace) return;
        const loaded = receiveFetched(batch);
        setMessages((current) => mergeMessages(current, loaded));
        if (!hasMore) setExhausted((current) => new Set(current).add(channelId));
      } catch {
        if (workspaceRef.current === forWorkspace) setNotice("Could not load older messages.");
      } finally {
        olderInFlight.current.delete(channelId);
        setLoadingOlder((current) => (current === channelId ? null : current));
      }
    },
    [receiveFetched],
  );

  /** Sends every unconfirmed message again under its original id. The server keeps one copy. */
  const resendPending = useCallback(() => {
    const resent = new Set<string>();
    for (const send of pendingRef.current) {
      const sent = sendChannelMessage(
        send.channelId,
        send.workspaceId,
        send.content,
        send.clientMessageId,
      );
      if (sent === null) continue;
      resent.add(sent);
      armAckTimer(sent);
    }
    if (resent.size === 0) return;
    setPending((current) =>
      current.map((entry) =>
        resent.has(entry.clientMessageId) && entry.failed ? { ...entry, failed: false } : entry,
      ),
    );
  }, [armAckTimer]);

  /** Picks up channels created since the list was fetched. Placeholders still being created stay. */
  const refreshChannels = useCallback(() => {
    const forWorkspace = workspaceRef.current;
    getWorkspace(forWorkspace)
      .then((workspace) => {
        if (workspaceRef.current !== forWorkspace) return;
        const fresh = workspace.channels.map(({ id, name }) => ({ id, name }));
        const added = fresh.filter(
          (channel) => !channelsRef.current.some((known) => known.id === channel.id),
        );
        setChannels((current) => [
          ...fresh,
          ...current.filter(
            (channel) =>
              isPendingChannel(channel.id) && !fresh.some((other) => other.name === channel.name),
          ),
        ]);
        added.forEach((channel) => void syncChannel(channel.id));
      })
      .catch(() => {});
  }, [syncChannel]);

  /** Forgets a deleted channel and everything loaded for it. */
  const dropChannel = useCallback((channelId: string) => {
    const without = <T,>(current: ReadonlySet<T>, value: T) => {
      if (!current.has(value)) return current;
      const next = new Set(current);
      next.delete(value);
      return next;
    };
    setChannels((current) => current.filter((channel) => channel.id !== channelId));
    setMessages((current) => current.filter((message) => message.channel !== channelId));
    setPending((current) => current.filter((send) => send.channelId !== channelId));
    setLoadedChannels((current) => without(current, channelId));
    setUnread((current) => without(current, channelId));
    setExhausted((current) => without(current, channelId));
    setActiveChannelId((current) => (current === channelId ? null : current));
    setDeleteTarget((current) => (current?.id === channelId ? null : current));
  }, []);

  // A new workspace starts from what this browser last saw of it, or from a
  // clean slate. Either way the server's copy replaces it. Every channel is caught
  // up front, from the newest message cached for it, so switching channels is instant.
  useEffect(() => {
    if (!workspaceId) return;
    let cancelled = false;

    const snapshot = cachedWorkspace(workspaceId);
    setStateWorkspaceId(workspaceId);
    setChannels(snapshot?.channels ?? []);
    setMessages(snapshot?.messages ?? []);
    setLoadedChannels(new Set(snapshot?.channels.map((channel) => channel.id)));
    setUnread(new Set(snapshot?.unreadChannelIds));
    setExhausted(new Set());
    setActiveChannelId(snapshot?.activeChannelId ?? null);
    setWorkspaceName(snapshot?.name ?? "");
    setMemberCount(snapshot?.memberCount ?? null);
    setView("chat");
    knownSenders.current = new Set([
      user.username,
      ...(snapshot?.messages.map((message) => message.sender) ?? []),
    ]);

    getWorkspace(workspaceId)
      .then((workspace) => {
        if (cancelled) return;
        const fresh = workspace.channels.map(({ id, name }) => ({ id, name }));
        setWorkspaceName(workspace.general.name);
        setMemberCount(workspace.members.length);
        setChannels(fresh);
        setUnread(new Set(workspace.unreadChannelIds));
        // Keep the channel the user is on, unless it no longer exists.
        setActiveChannelId((current) =>
          current && fresh.some((channel) => channel.id === current)
            ? current
            : (fresh[0]?.id ?? null),
        );
        fresh.forEach((channel) => void syncChannel(channel.id));
      })
      .catch(() => {
        if (!cancelled) setNotice("Could not load this workspace.");
      });

    return () => {
      cancelled = true;
    };
  }, [workspaceId, syncChannel, user.username]);

  // Remember the workspace for the next visit. Pending sends and channels the
  // server has not created yet are left out.
  useEffect(() => {
    if (!stateWorkspaceId || !workspaceName) return;
    const timer = setTimeout(() => {
      cacheWorkspace(stateWorkspaceId, {
        name: workspaceName,
        memberCount,
        channels: channels.filter((channel) => !isPendingChannel(channel.id)),
        activeChannelId:
          activeChannelId && !isPendingChannel(activeChannelId) ? activeChannelId : null,
        messages,
        unreadChannelIds: [...unread].filter((channelId) => !isPendingChannel(channelId)),
      });
    }, CACHE_WRITE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [stateWorkspaceId, workspaceName, memberCount, channels, activeChannelId, messages, unread]);

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
    // A new connection starts with no subscriptions until the server says otherwise.
    else {
      subscribedRef.current = null;
      joinRequested.current.clear();
    }
  }, [status]);

  useEffect(() => {
    const settle = (clientMessageId: string) => {
      const timer = ackTimers.current.get(clientMessageId);
      if (timer) clearTimeout(timer);
      ackTimers.current.delete(clientMessageId);
    };
    // The socket carries every channel the user is in, across workspaces. Only this
    // workspace's channels belong on this page.
    const isKnownChannel = (channelId: string) =>
      channelsRef.current.some((channel) => channel.id === channelId);

    return onMessage((message) => {
      switch (message.type) {
        case "subscribed":
          // The socket now receives every channel live. Fetching after this covers
          // whatever was sent before it, including messages missed while it was down,
          // and resending covers sends whose ack was lost with the old socket.
          subscribedRef.current = new Set(message.channelIds);
          joinRequested.current.clear();
          setSubscription((current) => current + 1);
          channelsRef.current
            .filter((channel) => !isPendingChannel(channel.id))
            .forEach((channel) => void syncChannel(channel.id));
          resendPending();
          break;

        case "channels_added":
          message.channelIds.forEach((channelId) => subscribedRef.current?.add(channelId));
          if (message.channelIds.some((channelId) => !isKnownChannel(channelId))) {
            refreshChannels();
          }
          message.channelIds.filter(isKnownChannel).forEach((channelId) => void syncChannel(channelId));
          break;

        case "new_message": {
          const payload = message.payload;
          if (!isKnownChannel(payload.channelId)) break;
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
                senderId: payload.senderId,
                senderAvatarId: payload.senderAvatarId,
                channel: payload.channelId,
                createdAt: payload.createdAt,
                content: payload.content,
              },
            ]),
          );
          // Our own send, possibly from this tab after a lost ack.
          if (
            payload.senderId === user.id &&
            payload.clientMessageId &&
            pendingRef.current.some((send) => send.clientMessageId === payload.clientMessageId)
          ) {
            confirmSend(payload.clientMessageId, payload.id);
          }
          if (
            payload.senderId !== user.id &&
            payload.channelId !== viewingRef.current
          ) {
            setUnread((current) => new Set(current).add(payload.channelId));
          }
          break;
        }

        case "join_channel_ack":
          // Only sent for a channel the `subscribed` frame missed. Same rule: fetch after joining.
          subscribedRef.current?.add(message.channelId);
          void syncChannel(message.channelId);
          break;

        case "send_message_ack": {
          const clientMessageId = message.clientMessageId;
          if (!clientMessageId) break;
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
                  senderId: user.id,
                  senderAvatarId: null,
                  channel: send.channelId,
                  createdAt: send.createdAt,
                  content: send.content,
                },
              ]),
            );
          }
          confirmSend(clientMessageId, message.messageId);
          break;
        }

        case "channel_deleted": {
          const channelId = message.channelId;
          const deleted = channelsRef.current.find((channel) => channel.id === channelId);
          if (deleted && !deletingIds.current.has(channelId)) {
            setNotice(`#${deleted.name} was deleted.`);
          }
          deletingIds.current.delete(channelId);
          dropChannel(channelId);
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
  }, [
    syncChannel,
    resendPending,
    refreshChannels,
    confirmSend,
    dropChannel,
    user.id,
    user.username,
    workspaceId,
  ]);

  const activeChannel = useMemo(
    () => channels.find((channel) => channel.id === activeChannelId) ?? channels[0],
    [activeChannelId, channels],
  );

  const viewingId = view === "chat" ? (activeChannel?.id ?? null) : null;
  viewingRef.current = viewingId;

  // The open channel is being read, whatever the server or the socket said about it.
  useEffect(() => {
    if (!viewingId) return;
    setUnread((current) => {
      if (!current.has(viewingId)) return current;
      const next = new Set(current);
      next.delete(viewingId);
      return next;
    });
  }, [viewingId, unread]);

  // Move the server's read marker to the newest message on screen, so the unread state
  // survives a reload and shows on the user's other devices.
  const newestViewedId = useMemo(
    () => (viewingId ? newestIn(messages, viewingId)?.id : undefined),
    [messages, viewingId],
  );
  useEffect(() => {
    if (!pageVisible || !viewingId || !newestViewedId || isPendingChannel(viewingId)) return;
    if (lastMarked.current.get(viewingId) === newestViewedId) return;
    const timer = setTimeout(() => {
      lastMarked.current.set(viewingId, newestViewedId);
      markChannelRead(viewingId, newestViewedId).catch(() => {
        // Try again with the next message or the next visit.
        if (lastMarked.current.get(viewingId) === newestViewedId) lastMarked.current.delete(viewingId);
      });
    }, MARK_READ_DELAY_MS);
    return () => clearTimeout(timer);
  }, [pageVisible, viewingId, newestViewedId]);

  // The socket subscribes to every channel at connect, and to new ones as they are created.
  // A channel that still slipped through (an event lost while Redis was down) is joined here.
  useEffect(() => {
    const subscribed = subscribedRef.current;
    if (status !== "connected" || !subscribed) return;
    for (const channel of channels) {
      if (isPendingChannel(channel.id) || subscribed.has(channel.id)) continue;
      if (joinRequested.current.has(channel.id)) continue;
      joinRequested.current.add(channel.id);
      joinChannel(channel.id, workspaceId);
    }
  }, [channels, status, subscription, workspaceId]);

  // A channel still being created has no details to fetch, and nothing to delete.
  const detailsChannelId =
    detailsOpen && view === "chat" && activeChannel && !isPendingChannel(activeChannel.id)
      ? activeChannel.id
      : undefined;

  useEffect(() => {
    if (!detailsChannelId) return;
    let cancelled = false;

    setDetails(null);
    setDetailsError(undefined);
    getChannelDetails(detailsChannelId)
      .then((loaded) => {
        if (!cancelled) setDetails(loaded);
      })
      .catch((error) => {
        if (!cancelled) {
          setDetailsError(getApiErrorMessage(error, "Could not load channel details."));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [detailsChannelId]);

  const sidebarChannels: SidebarChannel[] = useMemo(
    () =>
      channels.map((channel) => ({
        ...channel,
        unread: unread.has(channel.id),
        pending: isPendingChannel(channel.id),
      })),
    [channels, unread],
  );

  const myAvatarUrl = avatarUrl(user.id, user.avatarId);

  // Each message carries the sender's picture as it was when fetched. The newest one
  // wins, so a changed picture shows on all of that person's messages.
  const avatarBySender = useMemo(() => {
    const latest = new Map<string, string | null>();
    for (const message of messages) latest.set(message.senderId, message.senderAvatarId);
    return latest;
  }, [messages]);

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
        avatarUrl:
          message.senderId === user.id
            ? myAvatarUrl
            : avatarUrl(message.senderId, avatarBySender.get(message.senderId)),
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
        avatarUrl: myAvatarUrl,
        delivery: send.failed ? "failed" : "sending",
      }));
    return [...saved, ...unsaved];
  }, [activeChannel, messages, pending, delivered, user.id, user.username, myAvatarUrl, avatarBySender]);

  async function handleAvatarUpload(file: File) {
    let image: Blob;
    try {
      image = await shrinkForAvatar(file);
    } catch {
      throw new Error("That file could not be opened as an image.");
    }
    try {
      const { avatarId } = await uploadAvatar(image);
      onAvatarChange(avatarId);
    } catch (error) {
      throw new Error(getApiErrorMessage(error, "Could not upload your photo."));
    }
  }

  async function handleAvatarRemove() {
    try {
      await removeAvatar();
      onAvatarChange(null);
    } catch (error) {
      throw new Error(getApiErrorMessage(error, "Could not remove your photo."));
    }
  }

  /** Returns false when nothing was sent, so the composer keeps the draft. */
  function handleSend(content: string): boolean {
    if (!activeChannel) return false;

    if (isPendingChannel(activeChannel.id)) {
      setNotice(`#${activeChannel.name} is still being created. Try again in a moment.`);
      return false;
    }

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
        workspaceId,
        content,
        createdAt: new Date().toISOString(),
        failed: false,
      },
    ]);
    armAckTimer(clientMessageId);
    return true;
  }

  /**
   * Shows the channel and opens it straight away, then asks the server to
   * create it. The placeholder is swapped for the real channel when it
   * answers, or removed again if it refuses.
   */
  function handleCreateChannel(name: string): boolean {
    if (channels.some((channel) => channel.name === name)) {
      setDialogError(`#${name} already exists in this workspace.`);
      return false;
    }

    const placeholderId = `${PENDING_CHANNEL_PREFIX}${Date.now()}`;
    const previousChannelId = activeChannel?.id ?? null;
    setChannels((current) => [...current, { id: placeholderId, name }]);
    setLoadedChannels((current) => new Set(current).add(placeholderId));
    setActiveChannelId(placeholderId);
    setView("chat");

    createChannel(workspaceId, name)
      .then((channel) => {
        // The creator is added as a member server-side, so it is safe to open now.
        setChannels((current) =>
          current.some((existing) => existing.id === channel.id)
            ? current.filter((existing) => existing.id !== placeholderId)
            : current.map((existing) =>
                existing.id === placeholderId
                  ? { id: channel.id, name: channel.name }
                  : existing,
              ),
        );
        setLoadedChannels((current) => new Set(current).add(channel.id));
        setActiveChannelId((current) => (current === placeholderId ? channel.id : current));
      })
      .catch((error) => {
        setChannels((current) => current.filter((channel) => channel.id !== placeholderId));
        setActiveChannelId((current) =>
          current === placeholderId ? previousChannelId : current,
        );
        setNotice(getApiErrorMessage(error, "Could not create channel."));
      });
    return true;
  }

  async function handleDeleteChannel(): Promise<boolean> {
    if (!deleteTarget) return false;
    const channelId = deleteTarget.id;
    // The socket frame can land before the response, so mark it first.
    deletingIds.current.add(channelId);
    try {
      await deleteChannel(channelId);
      dropChannel(channelId);
      return true;
    } catch (error) {
      deletingIds.current.delete(channelId);
      setDialogError(getApiErrorMessage(error, "Could not delete channel."));
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
  const presence: Presence = connected
    ? "online"
    : status === "connecting"
      ? "connecting"
      : "offline";
  const statusLabel = connected
    ? "Connected"
    : status === "connecting"
      ? hasConnected
        ? "Reconnecting…"
        : "Connecting…"
      : "Offline";
  const role = workspaces.find((workspace) => workspace.id === workspaceId)?.role;
  // Admins manage channels; invites stay with owners. Both mirror the server.
  const canManageChannels = role === "owner" || role === "admin";
  const onInvite = role === "owner" ? () => openDialog("invite") : undefined;
  const onNewChannel = canManageChannels ? () => openDialog("channel") : undefined;
  const channelName = activeChannel?.name ?? "";

  return (
    <ChatLayout
      theme={theme}
      drawerOpen={drawerOpen}
      onCloseDrawer={() => {
        setDrawerOpen(false);
        setDetailsOpen(false);
      }}
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
          avatarUrl={myAvatarUrl}
          presence={presence}
          statusLabel={statusLabel}
          shortcut
          onSelect={(id) => {
            setActiveChannelId(id);
            setView("chat");
            setDrawerOpen(false);
          }}
          onInvite={onInvite}
          onNewChannel={onNewChannel}
          onProfile={() => {
            setView("profile");
            setDrawerOpen(false);
          }}
        />
      }
      details={
        detailsChannelId && (
          <ChannelDetails
            channelName={channelName}
            details={details?.id === detailsChannelId ? details : null}
            error={detailsError}
            userId={user.id}
            myAvatarUrl={myAvatarUrl}
            canDelete={canManageChannels}
            onDelete={() => {
              if (!activeChannel) return;
              setDialogError(undefined);
              setDeleteTarget(activeChannel);
            }}
            onClose={() => setDetailsOpen(false)}
          />
        )
      }
      overlay={
        deleteTarget ? (
          <DeleteChannelDialog
            channelName={deleteTarget.name}
            error={dialogError}
            onConfirm={handleDeleteChannel}
            onClose={() => setDeleteTarget(null)}
          />
        ) : dialog === "channel" ? (
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
            avatarUrl={myAvatarUrl}
            onAvatarUpload={handleAvatarUpload}
            onAvatarRemove={handleAvatarRemove}
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
              <>
                {memberCount !== null && (
                  <span className="faces faces--plain" title="Members in this workspace">
                    <Icon name="users" />
                    {memberCount}
                  </span>
                )}
                {activeChannel && (
                  <button
                    type="button"
                    className={detailsOpen ? "icon-btn is-on" : "icon-btn"}
                    title="Channel details"
                    aria-label="Channel details"
                    aria-pressed={detailsOpen}
                    onClick={() => setDetailsOpen((current) => !current)}
                  >
                    <Icon name="info" />
                  </button>
                )}
              </>
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

          {!workspaceName || (activeChannel && !loadedChannels.has(activeChannel.id)) ? (
            <MessageSkeleton label={channelName ? `Loading #${channelName}` : "Loading"} />
          ) : (
            <MessageFeed
              items={feedItems}
              scrollKey={activeChannel?.id}
              hasOlder={
                !!activeChannel &&
                !exhausted.has(activeChannel.id) &&
                messages.some((message) => message.channel === activeChannel.id)
              }
              loadingOlder={loadingOlder === activeChannel?.id}
              onLoadOlder={activeChannel ? () => void loadOlder(activeChannel.id) : undefined}
              empty={
                activeChannel ? (
                  <EmptyChannel
                    channelName={channelName}
                    onInvite={onInvite}
                    onSayHello={() => composerRef.current?.focus()}
                    onNewChannel={onNewChannel}
                  />
                ) : (
                  <p className="loading">No channels yet.</p>
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
