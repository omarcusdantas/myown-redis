import {
  handleLLen,
  handleLPop,
  handleLPush,
  handleLRange,
  handleRPop,
  handleRPush,
} from "./list.js";
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

describe("list commands", () => {
  let kvStore: KeyValueStore;
  let config: ServerConfig;

  beforeEach(() => {
    kvStore = new Map();
    config = createConfig();
  });

  describe("handleLPush", () => {
    it("prepends elements and returns the list length", () => {
      const result = handleLPush({
        command: ["LPUSH", "mylist", "a", "b", "c"],
        kvStore,
        sendReply: true,
        config,
      });
      expect(result).toBe(":3\r\n");
    });

    it("returns error when no elements provided", () => {
      const result = handleLPush({
        command: ["LPUSH", "mylist"],
        kvStore,
        sendReply: true,
        config,
      });
      expect(result).toBe("-ERR wrong number of arguments for 'lpush' command\r\n");
    });

    it("returns WRONGTYPE for non-list key", () => {
      kvStore.set("key", { type: "string", value: "hello", expiration: null });
      const result = handleLPush({
        command: ["LPUSH", "key", "value"],
        kvStore,
        sendReply: true,
        config,
      });
      expect(result).toContain("WRONGTYPE");
    });

    it("accumulates length across multiple calls", () => {
      handleLPush({ command: ["LPUSH", "mylist", "a"], kvStore, sendReply: true, config });
      const result = handleLPush({
        command: ["LPUSH", "mylist", "b"],
        kvStore,
        sendReply: true,
        config,
      });
      expect(result).toBe(":2\r\n");
    });

    it("returns undefined when sendReply is false", () => {
      const result = handleLPush({
        command: ["LPUSH", "mylist", "a"],
        kvStore,
        sendReply: false,
        config,
      });
      expect(result).toBeUndefined();
    });
  });

  describe("handleRPush", () => {
    it("appends elements and returns the list length", () => {
      const result = handleRPush({
        command: ["RPUSH", "mylist", "a", "b", "c"],
        kvStore,
        sendReply: true,
        config,
      });
      expect(result).toBe(":3\r\n");
    });

    it("returns error when no elements provided", () => {
      const result = handleRPush({
        command: ["RPUSH", "mylist"],
        kvStore,
        sendReply: true,
        config,
      });
      expect(result).toBe("-ERR wrong number of arguments for 'rpush' command\r\n");
    });

    it("returns WRONGTYPE for non-list key", () => {
      kvStore.set("key", { type: "string", value: "hello", expiration: null });
      const result = handleRPush({
        command: ["RPUSH", "key", "value"],
        kvStore,
        sendReply: true,
        config,
      });
      expect(result).toContain("WRONGTYPE");
    });
  });

  describe("handleLPop", () => {
    it("returns null for non-existing key", () => {
      expect(handleLPop({ command: ["LPOP", "missing"], kvStore, sendReply: true, config })).toBe(
        "$-1\r\n"
      );
    });

    it("removes and returns the first element as bulk string", () => {
      handleRPush({ command: ["RPUSH", "mylist", "a", "b"], kvStore, sendReply: true, config });
      const result = handleLPop({
        command: ["LPOP", "mylist"],
        kvStore,
        sendReply: true,
        config,
      });
      expect(result).toBe("$1\r\na\r\n");
    });

    it("returns multiple elements as array when count specified", () => {
      handleRPush({
        command: ["RPUSH", "mylist", "a", "b", "c"],
        kvStore,
        sendReply: true,
        config,
      });
      const result = handleLPop({
        command: ["LPOP", "mylist", "2"],
        kvStore,
        sendReply: true,
        config,
      });
      expect(result).toBe("*2\r\n$1\r\na\r\n$1\r\nb\r\n");
    });

    it("removes key from kvStore when list becomes empty", () => {
      handleRPush({ command: ["RPUSH", "mylist", "a"], kvStore, sendReply: true, config });
      handleLPop({ command: ["LPOP", "mylist"], kvStore, sendReply: true, config });
      expect(kvStore.has("mylist")).toBe(false);
    });

    it("returns WRONGTYPE for non-list key", () => {
      kvStore.set("key", { type: "string", value: "hello", expiration: null });
      expect(handleLPop({ command: ["LPOP", "key"], kvStore, sendReply: true, config })).toContain(
        "WRONGTYPE"
      );
    });
  });

  describe("handleRPop", () => {
    it("returns null for non-existing key", () => {
      expect(handleRPop({ command: ["RPOP", "missing"], kvStore, sendReply: true, config })).toBe(
        "$-1\r\n"
      );
    });

    it("removes and returns the last element", () => {
      handleRPush({ command: ["RPUSH", "mylist", "a", "b"], kvStore, sendReply: true, config });
      const result = handleRPop({
        command: ["RPOP", "mylist"],
        kvStore,
        sendReply: true,
        config,
      });
      expect(result).toBe("$1\r\nb\r\n");
    });

    it("removes key from kvStore when list becomes empty", () => {
      handleRPush({ command: ["RPUSH", "mylist", "a"], kvStore, sendReply: true, config });
      handleRPop({ command: ["RPOP", "mylist"], kvStore, sendReply: true, config });
      expect(kvStore.has("mylist")).toBe(false);
    });

    it("returns WRONGTYPE for non-list key", () => {
      kvStore.set("key", { type: "string", value: "hello", expiration: null });
      expect(handleRPop({ command: ["RPOP", "key"], kvStore, sendReply: true, config })).toContain(
        "WRONGTYPE"
      );
    });
  });

  describe("handleLRange", () => {
    it("returns empty array for non-existing key", () => {
      expect(handleLRange(["LRANGE", "missing", "0", "-1"], kvStore)).toBe("*0\r\n");
    });

    it("returns all elements with range 0 -1", () => {
      handleRPush({
        command: ["RPUSH", "mylist", "a", "b", "c"],
        kvStore,
        sendReply: true,
        config,
      });
      expect(handleLRange(["LRANGE", "mylist", "0", "-1"], kvStore)).toBe(
        "*3\r\n$1\r\na\r\n$1\r\nb\r\n$1\r\nc\r\n"
      );
    });

    it("handles negative indices", () => {
      handleRPush({
        command: ["RPUSH", "mylist", "a", "b", "c"],
        kvStore,
        sendReply: true,
        config,
      });
      expect(handleLRange(["LRANGE", "mylist", "-2", "-1"], kvStore)).toBe(
        "*2\r\n$1\r\nb\r\n$1\r\nc\r\n"
      );
    });

    it("returns empty array when start > stop", () => {
      handleRPush({
        command: ["RPUSH", "mylist", "a", "b", "c"],
        kvStore,
        sendReply: true,
        config,
      });
      expect(handleLRange(["LRANGE", "mylist", "2", "0"], kvStore)).toBe("*0\r\n");
    });

    it("returns a sub-range of elements", () => {
      handleRPush({
        command: ["RPUSH", "mylist", "a", "b", "c", "d", "e"],
        kvStore,
        sendReply: true,
        config,
      });
      expect(handleLRange(["LRANGE", "mylist", "1", "3"], kvStore)).toBe(
        "*3\r\n$1\r\nb\r\n$1\r\nc\r\n$1\r\nd\r\n"
      );
    });

    it("returns WRONGTYPE for non-list key", () => {
      kvStore.set("key", { type: "string", value: "hello", expiration: null });
      expect(handleLRange(["LRANGE", "key", "0", "-1"], kvStore)).toContain("WRONGTYPE");
    });
  });

  describe("handleLLen", () => {
    it("returns 0 for non-existing key", () => {
      expect(handleLLen(["LLEN", "missing"], kvStore)).toBe(":0\r\n");
    });

    it("returns the list length", () => {
      handleRPush({
        command: ["RPUSH", "mylist", "a", "b", "c"],
        kvStore,
        sendReply: true,
        config,
      });
      expect(handleLLen(["LLEN", "mylist"], kvStore)).toBe(":3\r\n");
    });

    it("returns WRONGTYPE for non-list key", () => {
      kvStore.set("key", { type: "string", value: "hello", expiration: null });
      expect(handleLLen(["LLEN", "key"], kvStore)).toContain("WRONGTYPE");
    });
  });
});
