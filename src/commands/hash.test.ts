import {
  handleHDel,
  handleHExists,
  handleHGet,
  handleHGetAll,
  handleHLen,
  handleHSet,
} from "./hash.js";
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

describe("hash commands", () => {
  let kvStore: KeyValueStore;
  let config: ServerConfig;

  beforeEach(() => {
    kvStore = new Map();
    config = createConfig();
  });

  describe("handleHSet", () => {
    it("adds new fields and returns the count", () => {
      const result = handleHSet({
        command: ["HSET", "myhash", "field1", "value1", "field2", "value2"],
        kvStore,
        sendReply: true,
        config,
      });
      expect(result).toBe(":2\r\n");
    });

    it("returns error for no field arguments", () => {
      const result = handleHSet({
        command: ["HSET", "myhash"],
        kvStore,
        sendReply: true,
        config,
      });
      expect(result).toBe("-ERR wrong number of arguments for 'hset' command\r\n");
    });

    it("returns error for odd number of field arguments", () => {
      const result = handleHSet({
        command: ["HSET", "myhash", "field1"],
        kvStore,
        sendReply: true,
        config,
      });
      expect(result).toBe("-ERR wrong number of arguments for 'hset' command\r\n");
    });

    it("returns WRONGTYPE when key holds a non-hash value", () => {
      kvStore.set("mykey", { type: "string", value: "hello", expiration: null });
      const result = handleHSet({
        command: ["HSET", "mykey", "field", "value"],
        kvStore,
        sendReply: true,
        config,
      });
      expect(result).toContain("WRONGTYPE");
    });

    it("returns 0 when updating an existing field value", () => {
      handleHSet({
        command: ["HSET", "myhash", "field1", "value1"],
        kvStore,
        sendReply: true,
        config,
      });
      const result = handleHSet({
        command: ["HSET", "myhash", "field1", "newvalue"],
        kvStore,
        sendReply: true,
        config,
      });
      expect(result).toBe(":0\r\n");
    });

    it("returns undefined when sendReply is false but still stores data", () => {
      const result = handleHSet({
        command: ["HSET", "myhash", "field1", "value1"],
        kvStore,
        sendReply: false,
        config,
      });
      expect(result).toBeUndefined();
      expect(kvStore.has("myhash")).toBe(true);
    });
  });

  describe("handleHGet", () => {
    it("returns null for non-existing key", () => {
      expect(handleHGet(["HGET", "missing", "field"], kvStore)).toBe("$-1\r\n");
    });

    it("returns the field value", () => {
      handleHSet({
        command: ["HSET", "myhash", "field", "hello"],
        kvStore,
        sendReply: true,
        config,
      });
      expect(handleHGet(["HGET", "myhash", "field"], kvStore)).toBe("$5\r\nhello\r\n");
    });

    it("returns null for non-existing field", () => {
      handleHSet({
        command: ["HSET", "myhash", "field", "hello"],
        kvStore,
        sendReply: true,
        config,
      });
      expect(handleHGet(["HGET", "myhash", "missing"], kvStore)).toBe("$-1\r\n");
    });

    it("returns WRONGTYPE for non-hash key", () => {
      kvStore.set("key", { type: "string", value: "hello", expiration: null });
      expect(handleHGet(["HGET", "key", "field"], kvStore)).toContain("WRONGTYPE");
    });
  });

  describe("handleHGetAll", () => {
    it("returns empty array for non-existing key", () => {
      expect(handleHGetAll(["HGETALL", "missing"], kvStore)).toBe("*0\r\n");
    });

    it("returns all field-value pairs", () => {
      handleHSet({
        command: ["HSET", "myhash", "name", "Alice", "age", "30"],
        kvStore,
        sendReply: true,
        config,
      });
      expect(handleHGetAll(["HGETALL", "myhash"], kvStore)).toBe(
        "*4\r\n$4\r\nname\r\n$5\r\nAlice\r\n$3\r\nage\r\n$2\r\n30\r\n"
      );
    });

    it("returns WRONGTYPE for non-hash key", () => {
      kvStore.set("key", { type: "string", value: "hello", expiration: null });
      expect(handleHGetAll(["HGETALL", "key"], kvStore)).toContain("WRONGTYPE");
    });
  });

  describe("handleHDel", () => {
    it("removes fields and returns count", () => {
      handleHSet({
        command: ["HSET", "myhash", "f1", "v1", "f2", "v2"],
        kvStore,
        sendReply: true,
        config,
      });
      const result = handleHDel({
        command: ["HDEL", "myhash", "f1", "f2"],
        kvStore,
        sendReply: true,
        config,
      });
      expect(result).toBe(":2\r\n");
    });

    it("returns error when no fields specified", () => {
      const result = handleHDel({
        command: ["HDEL", "myhash"],
        kvStore,
        sendReply: true,
        config,
      });
      expect(result).toBe("-ERR wrong number of arguments for 'hdel' command\r\n");
    });

    it("returns 0 for non-existing key", () => {
      const result = handleHDel({
        command: ["HDEL", "missing", "field"],
        kvStore,
        sendReply: true,
        config,
      });
      expect(result).toBe(":0\r\n");
    });

    it("returns WRONGTYPE for non-hash key", () => {
      kvStore.set("key", { type: "string", value: "hello", expiration: null });
      const result = handleHDel({
        command: ["HDEL", "key", "field"],
        kvStore,
        sendReply: true,
        config,
      });
      expect(result).toContain("WRONGTYPE");
    });

    it("removes key from kvStore when hash becomes empty", () => {
      handleHSet({
        command: ["HSET", "myhash", "field", "value"],
        kvStore,
        sendReply: true,
        config,
      });
      handleHDel({
        command: ["HDEL", "myhash", "field"],
        kvStore,
        sendReply: true,
        config,
      });
      expect(kvStore.has("myhash")).toBe(false);
    });

    it("does not remove key when hash still has fields", () => {
      handleHSet({
        command: ["HSET", "myhash", "f1", "v1", "f2", "v2"],
        kvStore,
        sendReply: true,
        config,
      });
      handleHDel({
        command: ["HDEL", "myhash", "f1"],
        kvStore,
        sendReply: true,
        config,
      });
      expect(kvStore.has("myhash")).toBe(true);
    });
  });

  describe("handleHExists", () => {
    it("returns 0 for non-existing key", () => {
      expect(handleHExists(["HEXISTS", "missing", "field"], kvStore)).toBe(":0\r\n");
    });

    it("returns 1 for existing field", () => {
      handleHSet({
        command: ["HSET", "myhash", "field", "value"],
        kvStore,
        sendReply: true,
        config,
      });
      expect(handleHExists(["HEXISTS", "myhash", "field"], kvStore)).toBe(":1\r\n");
    });

    it("returns 0 for non-existing field in existing hash", () => {
      handleHSet({
        command: ["HSET", "myhash", "field", "value"],
        kvStore,
        sendReply: true,
        config,
      });
      expect(handleHExists(["HEXISTS", "myhash", "missing"], kvStore)).toBe(":0\r\n");
    });

    it("returns WRONGTYPE for non-hash key", () => {
      kvStore.set("key", { type: "string", value: "hello", expiration: null });
      expect(handleHExists(["HEXISTS", "key", "field"], kvStore)).toContain("WRONGTYPE");
    });
  });

  describe("handleHLen", () => {
    it("returns 0 for non-existing key", () => {
      expect(handleHLen(["HLEN", "missing"], kvStore)).toBe(":0\r\n");
    });

    it("returns the number of fields", () => {
      handleHSet({
        command: ["HSET", "myhash", "f1", "v1", "f2", "v2", "f3", "v3"],
        kvStore,
        sendReply: true,
        config,
      });
      expect(handleHLen(["HLEN", "myhash"], kvStore)).toBe(":3\r\n");
    });

    it("returns WRONGTYPE for non-hash key", () => {
      kvStore.set("key", { type: "string", value: "hello", expiration: null });
      expect(handleHLen(["HLEN", "key"], kvStore)).toContain("WRONGTYPE");
    });
  });
});
