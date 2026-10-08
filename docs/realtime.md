# Realtime

This is the part the repo is for. HTTP holds history. The WebSocket holds the live room.

## Connect

The browser opens `ws://<API>` (or `BUN_PUBLIC_WS_URL`). Same host as REST, same `jwt_token` cookie.

Upgrade order in `apps/server/src/socket/index.ts`:

1. `Origin` must be in `CLIENT_ORIGIN`, or missing (non-browser clients). A page script cannot fake Origin, which is what stops another site from riding the cookie.
2. Verify JWT, then load the `Session` row. Failures get `401` and a destroyed socket.

3. At most 10 open sockets per user per process. Past that the upgrade gets `429`.

Once connected, the server subscribes the socket to every channel the user belongs to, in every workspace, and sends `subscribed` with their ids. Nothing has to be joined by hand. That is what lets unread markers light up for channels that are not open. The cost is fan-out: each message goes to every connected member's sockets, not just those who have the channel open.

Close code 4401 means the session ended. The client must not reconnect. Any other close, the client retries with exponential backoff and jitter (500 ms up to 15 s), and the new socket is subscribed again.

## Frames the client may send

Zod schema: `apps/server/src/socket/schema.ts`. Bad JSON, unknown types, and bad fields get an `error` frame with a `code`.

| Type | Payload | Server reply |
| --- | --- | --- |
| `join_channel` | `channelId`, `workspaceId` | `join_channel_ack` or `error`. Only needed for a channel `subscribed` missed |
| `leave_channel` | `channelId` | `leave_channel_ack` |
| `send_message` | `channelId`, `workspaceId`, `content`, optional `clientMessageId` | `send_message_ack` (echoes `clientMessageId` and the saved `messageId`) or `error`. A repeated `clientMessageId` acks the message already saved |
| `send_direct_message` / `leave_direct_message` | ignored | `error` `not_supported` |

Server-pushed:

| Type | When |
| --- | --- |
| `subscribed` | Once per connection, after the socket is subscribed to all the user's channels |
| `channels_added` | The user was added to channels (a channel was created, or they joined a workspace). The socket already receives them |
| `new_message` | A message was saved for a channel this socket is in. Carries the sender's `clientMessageId` |
| `removed_from_channel` | Membership recheck found the user is no longer in the channel |
| `channel_deleted` | An owner or admin deleted a channel. Sent to every socket of every member, joined to that channel or not |

## How a send lands

1. Client sends `send_message` with a `clientMessageId`.
2. `handleSendMessage` calls `sendChannelMessage`, which checks membership, inserts the row, and `publishEvent`s `{ kind: "channel_frame", channelId, frame: new_message }`.
3. The sender gets `send_message_ack`. Everyone subscribed, including the sender's other tabs, gets `new_message`.
4. The dashboard keeps the send as pending until the ack, or until a `new_message` or fetched message with its `clientMessageId` shows up, then merges by id. If neither comes (10 s), the row is marked unconfirmed.
5. After a reconnect the dashboard resends every pending row under its original `clientMessageId`. `Message` has a unique `(senderId, clientMessageId)`, so a send whose ack was lost is acked again instead of saved twice.

Subscribe before history. The client waits for `subscribed`, then asks each channel for `GET /channels/:id/messages?after=<newest id it has>`, page by page, and merges. That way a message sent between the subscribe and the fetch still appears, and a gap of any size after a reconnect is filled. More than four pages behind, the channel starts over from its newest page and older ones load on scroll.

## Unread

`ChannelMember.lastReadMessageId` is the newest message the user has seen there. The dashboard moves it with `PUT /channels/:id/read` a second after the newest message on screen changes, while the tab is visible. `GET /workspaces/:id` lists `unreadChannelIds`, so the markers survive a reload and show on other devices. Live `new_message` frames for other channels set the marker in between.

## Rooms

```text
Map<channelId, Set<AuthenticatedWebSocket>>
```

Process-local, in `apps/server/src/socket/state.ts`. That is why Redis exists.

## Event bus

`apps/server/src/socket/bus.ts`, topic `huddle:events`.

| `REDIS_URL` | What happens |
| --- | --- |
| unset | Events `dispatch` inside this process only |
| set and healthy | Publish to Redis. Every process, including the publisher, delivers once via its subscriber |
| set but down | Warn, then deliver inside this process. The API does not crash |

Four event kinds:

- `channel_frame`: deliver a JSON frame to sockets in that channel
- `revoke_sessions`: close those sockets with 4401 on every process
- `channel_deleted`: drop the channel's room and send `channel_deleted` to the listed members' sockets
- `channels_joined`: subscribe the listed users' sockets to the listed channels and send `channels_added`

The same Redis client holds rate-limit counters (`huddle:rl:*`). If Redis is gone, each process counts in memory.

## Rules the server enforces

| Rule | Detail |
| --- | --- |
| Size | Frames over 16 KB close with 1009. Bun's `ws` ignores `maxPayload`, so this is also checked in code. The frame is fully received before it is rejected |
| Order | One frame at a time per socket, so a leave cannot overtake a join. At most 50 frames waiting |
| Sends | 20 messages / 10 s / user, shared by the socket and `POST /channels/:id/messages`. Over it, `error` with code `rate_limited` and `retryAfterSeconds` |
| Sockets | 10 per user per process |
| Liveness | Server pings every `WS_HEARTBEAT_MS` (default 30 s). A peer that misses a pong is terminated |
| Session | Rechecked on connect, on revocation, and every `WS_MEMBERSHIP_RECHECK_MS` (default 60 s) |
| Membership | Checked on subscribe and on every send. Subscribed users are re-checked on the same timer. Removed users get `removed_from_channel` |

## Client reconnect

`apps/web/src/lib/ws.ts`. `connectSocket()` until `disconnectSocket()`. Coming back online skips the remaining backoff. Every third retry calls `GET /auth/me`. A 401 ends the session the same way 4401 does.

The dashboard opens the socket once and keeps it across channel and workspace switches. Frames for channels outside the open workspace are ignored.
