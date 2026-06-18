import { handleGet, handleSet } from "./string.js";
import type { KeyValueStore, ServerConfig } from "../types.js";

function createConfig(): ServerConfig {
  return {
    host: "localhost",
    port: 6379,
    role: "master",
    replid: "abc123",
    offset: 0,
    replicaOfHost: "",
    replicaOfPort: 0,
    ackCount: 0,
    replicas: [],
    onReplicaAckHandlers: new Set(),
  };
}

describe("string commands", () => {
  let kvStore: KeyValueStore;
  let config: ServerConfig;

  beforeEach(() => {
    kvStore = new Map();
    config = createConfig();
  });

  describe("handleSet", () => {
    it("stores a string value and returns OK", () => {
      const result = handleSet({
        command: ["SET", "key", "value"],
        kvStore,
        sendReply: true,
        config,
      });

      expect(result).toBe("+OK\r\n");
      expect(kvStore.get("key")?.value).toBe("value");
      expect(kvStore.get("key")?.type).toBe("string");
    });

    it("returns undefined when sendReply is false", () => {
      const result = handleSet({
        command: ["SET", "key", "value"],
        kvStore,
        sendReply: false,
        config,
      });

      expect(result).toBeUndefined();
      expect(kvStore.get("key")?.value).toBe("value");
    });

    it("stores value with EX expiration", () => {
      const before = Date.now();
      handleSet({
        command: ["SET", "key", "value", "EX", "10"],
        kvStore,
        sendReply: true,
        config,
      });
      const after = Date.now();

      const entry = kvStore.get("key");
      expect(entry?.value).toBe("value");
      expect(entry?.expiration).toBeInstanceOf(Date);
      expect(entry?.expiration?.getTime()).toBeGreaterThanOrEqual(before + 10_000);
      expect(entry?.expiration?.getTime()).toBeLessThanOrEqual(after + 10_000);
    });

    it("stores value with PX expiration", () => {
      const before = Date.now();
      handleSet({
        command: ["SET", "key", "value", "PX", "5000"],
        kvStore,
        sendReply: true,
        config,
      });
      const after = Date.now();

      const entry = kvStore.get("key");
      expect(entry?.expiration).toBeInstanceOf(Date);
      expect(entry?.expiration?.getTime()).toBeGreaterThanOrEqual(before + 5000);
      expect(entry?.expiration?.getTime()).toBeLessThanOrEqual(after + 5000);
    });

    it("stores value with EXAT absolute expiration", () => {
      handleSet({
        command: ["SET", "key", "value", "EXAT", "1700000000"],
        kvStore,
        sendReply: true,
        config,
      });

      const entry = kvStore.get("key");
      expect(entry?.expiration).toBeInstanceOf(Date);
      expect(entry?.expiration?.getTime()).toBe(1700000000 * 1000);
    });

    it("overwrites existing value", () => {
      handleSet({ command: ["SET", "key", "first"], kvStore, sendReply: true, config });
      handleSet({ command: ["SET", "key", "second"], kvStore, sendReply: true, config });

      expect(kvStore.get("key")?.value).toBe("second");
    });
  });

  describe("handleGet", () => {
    it("returns null for non-existing key", () => {
      expect(handleGet(["GET", "missing"], kvStore)).toBe("$-1\r\n");
    });

    it("returns the stored value", () => {
      handleSet({ command: ["SET", "key", "hello"], kvStore, sendReply: true, config });
      expect(handleGet(["GET", "key"], kvStore)).toBe("$5\r\nhello\r\n");
    });

    it("returns null and deletes key if expired", () => {
      const pastDate = new Date(Date.now() - 1000);
      kvStore.set("key", { type: "string", value: "hello", expiration: pastDate });

      expect(handleGet(["GET", "key"], kvStore)).toBe("$-1\r\n");
      expect(kvStore.has("key")).toBe(false);
    });

    it("returns value if not yet expired", () => {
      const futureDate = new Date(Date.now() + 100_000);
      kvStore.set("key", { type: "string", value: "hello", expiration: futureDate });

      expect(handleGet(["GET", "key"], kvStore)).toBe("$5\r\nhello\r\n");
    });
  });
});
