import { handleXAdd, handleXRange, handleXRead } from "./stream.js";
import type { KeyValueStore } from "../types.js";

describe("stream commands", () => {
  let kvStore: KeyValueStore;

  beforeEach(() => {
    kvStore = new Map();
  });

  describe("handleXAdd", () => {
    it("adds an entry with explicit ID and returns it", () => {
      const result = handleXAdd(["XADD", "mystream", "1-0", "name", "Alice"], kvStore);
      expect(result).toBe("$3\r\n1-0\r\n");
    });

    it("stores the entry data in the stream", () => {
      handleXAdd(["XADD", "mystream", "1-0", "name", "Alice"], kvStore);
      const entry = kvStore.get("mystream");
      expect(entry?.type).toBe("stream");
      if (entry?.type !== "stream") return;
      expect(entry.stream.last).toEqual([1, 0]);
      expect(entry.stream.entries.get(1)?.get(0)).toEqual(["name", "Alice"]);
    });

    it("returns error for ID 0-0", () => {
      const result = handleXAdd(["XADD", "mystream", "0-0", "name", "Alice"], kvStore);
      expect(result).toContain("ERR The ID specified in XADD must be greater than 0-0");
    });

    it("returns error for ID smaller than last", () => {
      handleXAdd(["XADD", "mystream", "2-0", "name", "Alice"], kvStore);
      const result = handleXAdd(["XADD", "mystream", "1-0", "name", "Bob"], kvStore);
      expect(result).toContain(
        "ERR The ID specified in XADD is equal or smaller than the target stream top item"
      );
    });

    it("returns error for ID equal to last", () => {
      handleXAdd(["XADD", "mystream", "1-0", "name", "Alice"], kvStore);
      const result = handleXAdd(["XADD", "mystream", "1-0", "name", "Bob"], kvStore);
      expect(result).toContain(
        "ERR The ID specified in XADD is equal or smaller than the target stream top item"
      );
    });

    it("auto-generates sequence with * for a given timestamp", () => {
      const result = handleXAdd(["XADD", "mystream", "1-*", "name", "Alice"], kvStore);
      expect(result).toBe("$3\r\n1-0\r\n");
    });

    it("increments sequence for same timestamp with *", () => {
      handleXAdd(["XADD", "mystream", "1-*", "name", "Alice"], kvStore);
      const result = handleXAdd(["XADD", "mystream", "1-*", "name", "Bob"], kvStore);
      expect(result).toBe("$3\r\n1-1\r\n");
    });

    it("resets sequence to 0 for a new higher timestamp with *", () => {
      handleXAdd(["XADD", "mystream", "1-*", "name", "Alice"], kvStore);
      const result = handleXAdd(["XADD", "mystream", "2-*", "name", "Bob"], kvStore);
      expect(result).toBe("$3\r\n2-0\r\n");
    });

    it("returns WRONGTYPE for non-stream key", () => {
      kvStore.set("key", { type: "string", value: "hello", expiration: null });
      const result = handleXAdd(["XADD", "key", "1-0", "name", "Alice"], kvStore);
      expect(result).toContain("WRONGTYPE");
    });

    it("initializes first entry pointer on first add", () => {
      handleXAdd(["XADD", "mystream", "5-0", "k", "v"], kvStore);
      const entry = kvStore.get("mystream");
      expect(entry?.type).toBe("stream");
      if (entry?.type !== "stream") return;
      expect(entry.stream.first).toEqual([5, 0]);
      expect(entry.stream.last).toEqual([5, 0]);
    });

    it("does not update first pointer on subsequent adds", () => {
      handleXAdd(["XADD", "mystream", "1-0", "k", "v"], kvStore);
      handleXAdd(["XADD", "mystream", "2-0", "k", "v"], kvStore);
      const entry = kvStore.get("mystream");
      expect(entry?.type).toBe("stream");
      if (entry?.type !== "stream") return;
      expect(entry.stream.first).toEqual([1, 0]);
      expect(entry.stream.last).toEqual([2, 0]);
    });
  });

  describe("handleXRange", () => {
    it("returns entries within the full range", () => {
      handleXAdd(["XADD", "mystream", "1-0", "name", "Alice"], kvStore);
      handleXAdd(["XADD", "mystream", "2-0", "name", "Bob"], kvStore);

      const result = handleXRange(["XRANGE", "mystream", "-", "+"], kvStore);
      expect(result).toContain("1-0");
      expect(result).toContain("Alice");
      expect(result).toContain("2-0");
      expect(result).toContain("Bob");
    });

    it("returns empty for non-existing stream", () => {
      expect(handleXRange(["XRANGE", "missing", "-", "+"], kvStore)).toBe("*0\r\n");
    });

    it("filters by exact start and end boundaries", () => {
      handleXAdd(["XADD", "mystream", "1-0", "a", "1"], kvStore);
      handleXAdd(["XADD", "mystream", "2-0", "b", "2"], kvStore);
      handleXAdd(["XADD", "mystream", "3-0", "c", "3"], kvStore);

      const result = handleXRange(["XRANGE", "mystream", "2-0", "2-0"], kvStore);
      expect(result).toContain("2-0");
      expect(result).not.toContain("1-0");
      expect(result).not.toContain("3-0");
    });

    it("returns empty for non-stream key type", () => {
      kvStore.set("key", { type: "string", value: "hello", expiration: null });
      expect(handleXRange(["XRANGE", "key", "-", "+"], kvStore)).toBe("*0\r\n");
    });

    it("handles range with only matching entries", () => {
      handleXAdd(["XADD", "mystream", "100-0", "a", "1"], kvStore);
      handleXAdd(["XADD", "mystream", "200-0", "b", "2"], kvStore);

      const result = handleXRange(["XRANGE", "mystream", "150", "+"], kvStore);
      expect(result).toContain("200-0");
      expect(result).not.toContain("100-0");
    });
  });

  describe("handleXRead", () => {
    it("returns entries from a stream", async () => {
      handleXAdd(["XADD", "mystream", "1-0", "name", "Alice"], kvStore);
      handleXAdd(["XADD", "mystream", "2-0", "name", "Bob"], kvStore);

      const result = await handleXRead(["XREAD", "STREAMS", "mystream", "0-0"], kvStore);
      expect(result).toContain("mystream");
      expect(result).toContain("1-0");
      expect(result).toContain("2-0");
      expect(result).toContain("Alice");
      expect(result).toContain("Bob");
    });

    it("returns null when no entries found", async () => {
      const result = await handleXRead(["XREAD", "STREAMS", "mystream", "0-0"], kvStore);
      expect(result).toBe("$-1\r\n");
    });

    it("returns error when STREAMS keyword is missing", async () => {
      const result = await handleXRead(["XREAD", "mystream"], kvStore);
      expect(result).toContain("ERR No stream key argument provided");
    });

    it("returns error for odd number of stream arguments", async () => {
      const result = await handleXRead(["XREAD", "STREAMS", "mystream"], kvStore);
      expect(result).toContain("ERR Missing arguments");
    });

    it("reads only entries after the specified ID", async () => {
      handleXAdd(["XADD", "mystream", "1-0", "a", "1"], kvStore);
      handleXAdd(["XADD", "mystream", "2-0", "b", "2"], kvStore);

      const result = await handleXRead(["XREAD", "STREAMS", "mystream", "1-0"], kvStore);
      expect(result).toContain("2-0");
      expect(result).not.toContain("1-0");
    });

    it("returns null for non-existing stream key", async () => {
      const result = await handleXRead(["XREAD", "STREAMS", "nonexistent", "0-0"], kvStore);
      expect(result).toBe("$-1\r\n");
    });
  });
});
