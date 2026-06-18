import { createList, createNode, lpop, lpush, rpop, rpush } from "./linkedList.js";

describe("linkedList", () => {
  describe("createNode", () => {
    it("creates a node with the given value and null pointers", () => {
      const node = createNode("hello");
      expect(node.value).toBe("hello");
      expect(node.prev).toBeNull();
      expect(node.next).toBeNull();
    });
  });

  describe("createList", () => {
    it("creates an empty linked list", () => {
      const list = createList();
      expect(list.head).toBeNull();
      expect(list.tail).toBeNull();
      expect(list.length).toBe(0);
    });
  });

  describe("lpush", () => {
    it("adds element to empty list", () => {
      const list = createList();
      lpush(list, "a");
      expect(list.head?.value).toBe("a");
      expect(list.tail?.value).toBe("a");
      expect(list.length).toBe(1);
    });

    it("prepends elements to the head", () => {
      const list = createList();
      lpush(list, "a");
      lpush(list, "b");
      lpush(list, "c");

      expect(list.head?.value).toBe("c");
      expect(list.tail?.value).toBe("a");
      expect(list.length).toBe(3);

      expect(list.head?.next?.value).toBe("b");
      expect(list.head?.next?.next?.value).toBe("a");
    });

    it("maintains prev pointers correctly", () => {
      const list = createList();
      lpush(list, "a");
      lpush(list, "b");

      expect(list.head?.prev).toBeNull();
      expect(list.tail?.prev?.value).toBe("b");
      expect(list.tail?.next).toBeNull();
    });
  });

  describe("rpush", () => {
    it("adds element to empty list", () => {
      const list = createList();
      rpush(list, "a");
      expect(list.head?.value).toBe("a");
      expect(list.tail?.value).toBe("a");
      expect(list.length).toBe(1);
    });

    it("appends elements to the tail", () => {
      const list = createList();
      rpush(list, "a");
      rpush(list, "b");
      rpush(list, "c");

      expect(list.head?.value).toBe("a");
      expect(list.tail?.value).toBe("c");
      expect(list.length).toBe(3);

      expect(list.head?.next?.value).toBe("b");
      expect(list.head?.next?.next?.value).toBe("c");
    });

    it("maintains prev pointers correctly", () => {
      const list = createList();
      rpush(list, "a");
      rpush(list, "b");

      expect(list.head?.prev).toBeNull();
      expect(list.head?.next?.prev?.value).toBe("a");
      expect(list.tail?.next).toBeNull();
    });
  });

  describe("lpop", () => {
    it("returns null for empty list", () => {
      const list = createList();
      expect(lpop(list)).toBeNull();
    });

    it("removes and returns the head element", () => {
      const list = createList();
      rpush(list, "a");
      rpush(list, "b");

      expect(lpop(list)).toBe("a");
      expect(list.head?.value).toBe("b");
      expect(list.tail?.value).toBe("b");
      expect(list.length).toBe(1);
    });

    it("sets head and tail to null when list becomes empty", () => {
      const list = createList();
      rpush(list, "a");
      lpop(list);

      expect(list.head).toBeNull();
      expect(list.tail).toBeNull();
      expect(list.length).toBe(0);
    });
  });

  describe("rpop", () => {
    it("returns null for empty list", () => {
      const list = createList();
      expect(rpop(list)).toBeNull();
    });

    it("removes and returns the tail element", () => {
      const list = createList();
      rpush(list, "a");
      rpush(list, "b");

      expect(rpop(list)).toBe("b");
      expect(list.head?.value).toBe("a");
      expect(list.tail?.value).toBe("a");
      expect(list.length).toBe(1);
    });

    it("sets head and tail to null when list becomes empty", () => {
      const list = createList();
      rpush(list, "a");
      rpop(list);

      expect(list.head).toBeNull();
      expect(list.tail).toBeNull();
      expect(list.length).toBe(0);
    });
  });

  describe("combined operations", () => {
    it("maintains correct state with mixed push and pop", () => {
      const list = createList();
      lpush(list, "b");
      rpush(list, "c");
      lpush(list, "a");

      expect(lpop(list)).toBe("a");
      expect(rpop(list)).toBe("c");
      expect(lpop(list)).toBe("b");
      expect(lpop(list)).toBeNull();
    });

    it("handles single element push and pop cycle", () => {
      const list = createList();
      lpush(list, "only");
      expect(list.length).toBe(1);
      expect(lpop(list)).toBe("only");
      expect(list.length).toBe(0);

      rpush(list, "again");
      expect(list.length).toBe(1);
      expect(rpop(list)).toBe("again");
      expect(list.length).toBe(0);
    });
  });
});
