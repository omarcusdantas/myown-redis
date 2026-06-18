import { createHashMap, hdel, hexists, hget, hgetall, hset } from "./hashLinkedList.js";

describe("hashLinkedList", () => {
  describe("createHashMap", () => {
    it("creates an empty hash map", () => {
      const hash = createHashMap();
      expect(hash.head).toBeNull();
      expect(hash.tail).toBeNull();
      expect(hash.length).toBe(0);
      expect(hash.index.size).toBe(0);
    });
  });

  describe("hset", () => {
    it("adds a new field and returns 1", () => {
      const hash = createHashMap();
      expect(hset(hash, "name", "Alice")).toBe(1);
      expect(hash.length).toBe(1);
    });

    it("updates an existing field and returns 0", () => {
      const hash = createHashMap();
      hset(hash, "name", "Alice");
      expect(hset(hash, "name", "Bob")).toBe(0);
      expect(hget(hash, "name")).toBe("Bob");
      expect(hash.length).toBe(1);
    });

    it("adds multiple fields maintaining insertion order", () => {
      const hash = createHashMap();
      hset(hash, "a", "1");
      hset(hash, "b", "2");
      hset(hash, "c", "3");

      expect(hash.length).toBe(3);
      expect(hgetall(hash)).toEqual(["a", "1", "b", "2", "c", "3"]);
    });
  });

  describe("hget", () => {
    it("returns the value for an existing field", () => {
      const hash = createHashMap();
      hset(hash, "name", "Alice");
      expect(hget(hash, "name")).toBe("Alice");
    });

    it("returns null for a non-existing field", () => {
      const hash = createHashMap();
      expect(hget(hash, "missing")).toBeNull();
    });

    it("returns updated value after hset update", () => {
      const hash = createHashMap();
      hset(hash, "name", "Alice");
      hset(hash, "name", "Bob");
      expect(hget(hash, "name")).toBe("Bob");
    });
  });

  describe("hdel", () => {
    it("removes an existing field and returns 1", () => {
      const hash = createHashMap();
      hset(hash, "name", "Alice");
      expect(hdel(hash, "name")).toBe(1);
      expect(hash.length).toBe(0);
      expect(hget(hash, "name")).toBeNull();
    });

    it("returns 0 for a non-existing field", () => {
      const hash = createHashMap();
      expect(hdel(hash, "missing")).toBe(0);
    });

    it("correctly removes the head node", () => {
      const hash = createHashMap();
      hset(hash, "a", "1");
      hset(hash, "b", "2");
      hdel(hash, "a");

      expect(hash.head?.field).toBe("b");
      expect(hash.head?.prev).toBeNull();
      expect(hash.length).toBe(1);
    });

    it("correctly removes the tail node", () => {
      const hash = createHashMap();
      hset(hash, "a", "1");
      hset(hash, "b", "2");
      hdel(hash, "b");

      expect(hash.tail?.field).toBe("a");
      expect(hash.tail?.next).toBeNull();
      expect(hash.length).toBe(1);
    });

    it("correctly removes a middle node", () => {
      const hash = createHashMap();
      hset(hash, "a", "1");
      hset(hash, "b", "2");
      hset(hash, "c", "3");
      hdel(hash, "b");

      expect(hash.length).toBe(2);
      expect(hgetall(hash)).toEqual(["a", "1", "c", "3"]);
    });

    it("removes all nodes leaving empty map", () => {
      const hash = createHashMap();
      hset(hash, "a", "1");
      hset(hash, "b", "2");
      hdel(hash, "a");
      hdel(hash, "b");

      expect(hash.head).toBeNull();
      expect(hash.tail).toBeNull();
      expect(hash.length).toBe(0);
    });
  });

  describe("hexists", () => {
    it("returns true for an existing field", () => {
      const hash = createHashMap();
      hset(hash, "name", "Alice");
      expect(hexists(hash, "name")).toBe(true);
    });

    it("returns false for a non-existing field", () => {
      const hash = createHashMap();
      expect(hexists(hash, "missing")).toBe(false);
    });

    it("returns false after field is deleted", () => {
      const hash = createHashMap();
      hset(hash, "name", "Alice");
      hdel(hash, "name");
      expect(hexists(hash, "name")).toBe(false);
    });
  });

  describe("hgetall", () => {
    it("returns empty array for empty hash", () => {
      const hash = createHashMap();
      expect(hgetall(hash)).toEqual([]);
    });

    it("returns all field-value pairs in insertion order", () => {
      const hash = createHashMap();
      hset(hash, "name", "Alice");
      hset(hash, "age", "30");
      expect(hgetall(hash)).toEqual(["name", "Alice", "age", "30"]);
    });
  });
});
