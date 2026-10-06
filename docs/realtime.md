# Realtime

This is the part the repo is for. HTTP holds history. The WebSocket holds the live room.

## Connect

The browser opens `ws://<API>` (or `BUN_PUBLIC_WS_URL`). Same host as REST, same `jwt_token` cookie.

Upgrade order in `apps/server/src/socket/index.ts`:

1. `Origin` must be in `CLIENT_ORIGIN`, or missing (non-browser clients). A page script cannot fake Origin, which is what stops another site from riding the cookie.
2. Verify JWT, then load the `Session` row. Failures get `401` and a destroyed socket.

Close code 4401 means the session ended. The client must not reconnect. Any other close, the client retries with exponential backoff and jitter (500 ms up to 15 s) and rejoins its channel.

## Frames the client may send

Zod schema: `apps/server/src/socket/schema.ts`. Bad JSON, unknown types, and bad fields get an `error` frame with a `code`.

| Type | Payload | Server reply |
| --- | --- | --- |
| `join_channel` | `channelId`, `workspaceId` | `join_channel_ack` or `error` |
| `leave_channel` | `channelId` | `leave_channel_ack` |
| `send_message` | `channelId`, `workspaceId`, `content`, optional `clientMessageId` | `send_message_ack` (echoes `clientMessageId` and the saved `messageId`) or `error` |
| `send_direct_message` / `leave_direct_message` | ignored | `error` `not_supported` |

Server-pushed:

| Type | When |
| --- | --- |
| `new_message` | A message was saved for a channel this socket is in |
| `removed_from_channel` | Membership recheck found the user is no longer in the channel |

## How a send lands

1. Client sends `send_message` with a `clientMessageId`.
2. `handleSendMessage` calls `sendChannelMessage`, which checks membership, inserts the row, and `publishEvent`s `{ kind: "channel_frame", channelId, frame: new_message }`.
3. The sender gets `send_message_ack`. Everyone subscribed, including the sender's other tabs, gets `new_message`.
4. The dashboard keeps the send as pending until the ack, then merges by id. If the ack never comes (10 s), the row is marked failed.

Join before history. The client waits for `join_channel_ack`, then `GET /channels/:id/messages`, then merges. That way a message sent between join and the fetch still appears.

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

Two event kinds:

- `channel_frame`: deliver a JSON frame to sockets in that channel
- `revoke_sessions`: close those sockets with 4401 on every process

The same Redis client holds rate-limit counters (`huddle:rl:*`). If Redis is gone, each process counts in memory.

## Rules the server enforces

| Rule | Detail |
| --- | --- |
| Size | Frames over 16 KB close with 1009. Bun's `ws` ignores `maxPayload`, so this is also checked in code. The frame is fully received before it is rejected |
| Order | One frame at a time per socket, so a leave cannot overtake a join. At most 50 frames waiting |
| Liveness | Server pings every `WS_HEARTBEAT_MS` (default 30 s). A peer that misses a pong is terminated |
| Session | Rechecked on connect, on revocation, and every `WS_MEMBERSHIP_RECHECK_MS` (default 60 s) |
| Membership | Checked on join and on every send. Subscribed users are re-checked on the same timer. Removed users get `removed_from_channel` |

## Client reconnect

`apps/web/src/lib/ws.ts`. `connectSocket()` until `disconnectSocket()`. Coming back online skips the remaining backoff. Every third retry calls `GET /auth/me`. A 401 ends the session the same way 4401 does.

The dashboard reconnects the socket when the workspace is selected. It rejoins the active channel when status becomes `connected`.
