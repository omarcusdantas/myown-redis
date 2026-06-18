import { handleKeys, handleType } from "./generic.js";
import { createHashMap } from "../utils/hashLinkedList.js";
import { createList } from "../utils/linkedList.js";
import type { KeyValueStore } from "../types.js";

describe("generic commands", () => {
  let kvStore: KeyValueStore;

  beforeEach(() => {
    kvStore = new Map();
  });

  describe("handleKeys", () => {
    it("returns all keys with * pattern", () => {
      kvStore.set("foo", { type: "string", value: "1", expiration: null });
      kvStore.set("bar", { type: "string", value: "2", expiration: null });

      const result = handleKeys(["KEYS", "*"], kvStore);
      expect(result).toBe("*2\r\n$3\r\nfoo\r\n$3\r\nbar\r\n");
    });

    it("returns matching keys with glob pattern", () => {
      kvStore.set("user:1", { type: "string", value: "a", expiration: null });
      kvStore.set("user:2", { type: "string", value: "b", expiration: null });
      kvStore.set("item:1", { type: "string", value: "c", expiration: null });

      const result = handleKeys(["KEYS", "user:*"], kvStore);
      expect(result).toBe("*2\r\n$6\r\nuser:1\r\n$6\r\nuser:2\r\n");
    });

    it("returns empty array when no keys match", () => {
      const result = handleKeys(["KEYS", "*"], kvStore);
      expect(result).toBe("*0\r\n");
    });

    it("defaults to * when no pattern argument is provided", () => {
      kvStore.set("key", { type: "string", value: "v", expiration: null });
      const result = handleKeys(["KEYS"], kvStore);
      expect(result).toBe("*1\r\n$3\r\nkey\r\n");
    });

    it("returns empty array when pattern matches nothing", () => {
      kvStore.set("foo", { type: "string", value: "1", expiration: null });
      const result = handleKeys(["KEYS", "nomatch*"], kvStore);
      expect(result).toBe("*0\r\n");
    });
  });

  describe("handleType", () => {
    it("returns 'none' for non-existing key", () => {
      expect(handleType(["TYPE", "missing"], kvStore)).toBe("+none\r\n");
    });

    it("returns the type for a string key", () => {
      kvStore.set("key", { type: "string", value: "v", expiration: null });
      expect(handleType(["TYPE", "key"], kvStore)).toBe("+string\r\n");
    });

    it("returns the type for a list key", () => {
      kvStore.set("key", { type: "list", value: "", expiration: null, list: createList() });
      expect(handleType(["TYPE", "key"], kvStore)).toBe("+list\r\n");
    });

    it("returns the type for a hash key", () => {
      kvStore.set("key", { type: "hash", value: "", expiration: null, hash: createHashMap() });
      expect(handleType(["TYPE", "key"], kvStore)).toBe("+hash\r\n");
    });

    it("returns 'none' and deletes expired key", () => {
      kvStore.set("key", {
        type: "string",
        value: "v",
        expiration: new Date(Date.now() - 1000),
      });

      expect(handleType(["TYPE", "key"], kvStore)).toBe("+none\r\n");
      expect(kvStore.has("key")).toBe(false);
    });

    it("returns type for non-expired key", () => {
      kvStore.set("key", {
        type: "string",
        value: "v",
        expiration: new Date(Date.now() + 100_000),
      });

      expect(handleType(["TYPE", "key"], kvStore)).toBe("+string\r\n");
    });
  });
});
