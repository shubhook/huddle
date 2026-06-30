import type { AuthenticatedWebSocket } from "./types";

export const channelSubscriptions = new Map<string, Set<AuthenticatedWebSocket>>();