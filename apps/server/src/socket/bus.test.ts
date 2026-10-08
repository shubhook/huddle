import { afterAll, expect, test } from "bun:test";

// This file imports the bus on its own, with redis pointed at a closed port,
// so it does not share the in-process setup the realtime tests use.
process.env.JWT_SECRET ??= "test-jwt-secret-at-least-32-characters-long";
process.env.DATABASE_URL ??= "postgresql://huddle:huddle@127.0.0.1:5432/huddle";
process.env.REDIS_URL = "redis://127.0.0.1:1";

const { busSnapshotForTests, onBusEvent, publishEvent, startBus, stopBus, useBusPublisherForTests } = await import("./bus");

const event = { kind: "revoke_sessions" as const, sessionIds: ["session-1"] };

afterAll(async () => {
    useBusPublisherForTests(null);
    await stopBus();
});

test("a publish still runs local handlers when redis is unreachable", async () => {
    const seen: unknown[] = [];
    const unsubscribe = onBusEvent((incoming) => seen.push(incoming));

    try {
        // startBus connects in the background and keeps retrying. Until that
        // succeeds, publishEvent has to deliver inside this process.
        void startBus();
        expect(busSnapshotForTests()).toEqual({ configured: true, healthy: false, hasClient: true });
        await publishEvent(event);
        expect(seen).toEqual([event]);
    } finally {
        unsubscribe();
        await stopBus();
    }
});

test("a publish still runs local handlers when redis throws", async () => {
    const seen: unknown[] = [];
    const unsubscribe = onBusEvent((incoming) => seen.push(incoming));

    try {
        useBusPublisherForTests({
            isReady: true,
            publish() {
                return Promise.reject(new Error("redis went away"));
            },
        });

        await publishEvent(event);
        expect(seen).toEqual([event]);
    } finally {
        unsubscribe();
        useBusPublisherForTests(null);
    }
});
