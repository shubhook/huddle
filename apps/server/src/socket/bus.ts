import { createClient } from "redis";
import { env } from "../utils/env";

/**
 * Events every API process needs to see. With REDIS_URL set they travel through
 * Redis pub/sub, so a message saved by one process reaches sockets held by
 * another. Without it, or while Redis is down, they are delivered inside this
 * process only.
 */
export type BusEvent =
    | { kind: "channel_frame"; channelId: string; frame: unknown }
    | { kind: "revoke_sessions"; sessionIds: string[] }
    | { kind: "channel_deleted"; channelId: string; userIds: string[] };

type BusHandler = (event: BusEvent) => void;
type RedisClient = ReturnType<typeof createClient>;

const TOPIC = "huddle:events";
const handlers = new Set<BusHandler>();

let publisher: RedisClient | null = null;
let subscriber: RedisClient | null = null;
let subscribed = false;
let lastWarningAt = 0;

/** Redis errors repeat on every retry, so print one line per 10 seconds. */
function warn(message: string, err?: unknown) {
    if (Date.now() - lastWarningAt < 10_000) return;
    lastWarningAt = Date.now();
    // Connection refused arrives as an AggregateError with an empty message, so fall back to its code or name.
    const detail = err instanceof Error
        ? err.message || (err as { code?: string }).code || err.name
        : err ?? "";
    console.warn(message, detail);
}

function dispatch(event: BusEvent) {
    for (const handler of handlers) {
        try {
            handler(event);
        } catch (err) {
            console.error("bus handler failed", err);
        }
    }
}

export function onBusEvent(handler: BusHandler): () => void {
    handlers.add(handler);
    return () => handlers.delete(handler);
}

function redisIsHealthy(): boolean {
    return Boolean(publisher?.isReady && subscriber?.isReady && subscribed);
}

export async function publishEvent(event: BusEvent): Promise<void> {
    if (publisher && redisIsHealthy()) {
        try {
            // Our own subscriber hands the event back, so every process,
            // this one included, delivers it exactly once.
            await publisher.publish(TOPIC, JSON.stringify(event));
            return;
        } catch (err) {
            warn("Redis publish failed, delivering inside this process only", err);
        }
    }

    dispatch(event);
}

/**
 * Fixed-window counter in Redis, shared by every API process. The key is created with its
 * expiry in the same transaction as the increment, so a crash between the two cannot leave
 * a counter that never resets. Returns null when Redis is unavailable, and the caller
 * counts in memory instead.
 */
export async function incrementCounter(
    key: string,
    windowMs: number,
): Promise<{ count: number; ttlMs: number } | null> {
    if (!publisher?.isReady) return null;

    try {
        const [, count, ttlMs] = (await publisher
            .multi()
            .set(key, 0, { expiration: { type: "PX", value: windowMs }, condition: "NX" })
            .incr(key)
            .pTTL(key)
            .exec()) as unknown as [unknown, number, number];

        return { count, ttlMs: ttlMs > 0 ? ttlMs : windowMs };
    } catch (err) {
        warn("Redis counter failed, counting in memory", err);
        return null;
    }
}

/** Runs in the background. The server keeps working while Redis is unreachable. */
export async function startBus(): Promise<void> {
    if (!env.redisUrl) {
        console.log("REDIS_URL not set: realtime events stay inside this process");
        return;
    }

    publisher = createClient({
        url: env.redisUrl,
        // Fail a publish at once when Redis is down instead of queueing it.
        disableOfflineQueue: true,
        socket: { reconnectStrategy: (retries) => Math.min(250 * 2 ** retries, 5_000) },
    });
    subscriber = publisher.duplicate();

    for (const client of [publisher, subscriber]) {
        client.on("error", (err) => warn("Redis error", err));
    }

    try {
        await Promise.all([publisher.connect(), subscriber.connect()]);
        await subscriber.subscribe(TOPIC, (raw) => {
            try {
                dispatch(JSON.parse(raw) as BusEvent);
            } catch (err) {
                console.error("Dropped malformed bus event", err);
            }
        });
        subscribed = true;
        console.log("Redis connected: realtime events fan out across processes");
    } catch (err) {
        warn("Redis startup failed, staying in single-process mode", err);
    }
}
