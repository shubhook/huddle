# Workspaces and channels

A workspace is the tenant. Channels and invites live under it. You cannot open a channel until you are a `WorkspaceMember`.

## Membership

Creating a workspace (`POST /workspaces`) does three things in one transaction:

1. Inserts the workspace.
2. Adds the caller as `owner`.
3. Creates `#general` and puts the owner in it.

Joining with an invite adds you as `member` and puts you in every existing channel.

Roles:

| Action | Who |
| --- | --- |
| Create, list, revoke invites | Owner |
| Create channels | Any member |
| Read workspace, list channels, send messages | Any member of that workspace / channel |

Middleware: `apps/server/src/middleware/workspace.middleware.ts`, `channel.middleware.ts`. Access checks for sends live in `apps/server/src/services/channel-access.ts` and are shared by REST and the socket.

## Invites

`POST /workspaces/:id/invite` mints a UUID token that lasts 7 days. At most 25 active invites per workspace.

The web UI shows `origin/#/join/<token>`. After sign-in, `POST /workspaces/join/:token` consumes it. The token itself is not deleted on join, so the same link works for any number of people until it expires or an owner revokes it.

Listing invites (`GET /workspaces/:id/invites`) returns ids and expiry, not the token. The token is a credential.

## Channels

Name is 1 to 80 characters, no control characters, unique per workspace.

Creating a channel adds every current workspace member as a `ChannelMember`. People who join later are added to all channels at join time. There is no per-channel invite and no private channel.

The dashboard loads channels from `GET /workspaces/:id`, not from `GET /workspaces/:id/channels`. Both exist.

## Messages

`Message` rows are the history. Newest 50 per request, cursor on `id` for the next page. The client never sends the cursor, so the UI only shows the newest 50. After a long disconnect, the socket fills at most those 50 missed messages.

Content is trimmed, 1 to 4000 characters, same Zod schema on REST and the socket.

Writes go through `sendChannelMessage`. REST `POST /channel/:id/messages` (singular) and WebSocket `send_message` both call it, then the bus fans out `new_message`.

## Direct messages

`GET` / `POST /dm/:userId` with a `workspaceId` in the body. Sender and receiver must both belong to that workspace. The web UI does not call these. The socket replies `not_supported`.

## URLs in the SPA

`#/app/<workspaceId>` is the selected workspace. A refresh keeps it. If the id is missing or not yours, the app falls back to your first workspace, or to `#/workspace/create` if you have none.
