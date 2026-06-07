import type { HashMap, HashNode } from "../types.js";

export function createHashMap(): HashMap {
  return { head: null, tail: null, length: 0, index: new Map() };
}

export function hset(hash: HashMap, field: string, value: string): number {
  const existing = hash.index.get(field);
  if (existing) {
    existing.value = value;
    return 0;
  }

  const node: HashNode = { field, value, prev: null, next: null };

  if (!hash.tail) {
    hash.head = node;
    hash.tail = node;
  } else {
    node.prev = hash.tail;
    hash.tail.next = node;
    hash.tail = node;
  }

  hash.index.set(field, node);
  hash.length++;
  return 1;
}

export function hget(hash: HashMap, field: string): string | null {
  const node = hash.index.get(field);
  return node ? node.value : null;
}

export function hdel(hash: HashMap, field: string): number {
  const node = hash.index.get(field);
  if (!node) return 0;

  if (node.prev) {
    node.prev.next = node.next;
  } else {
    hash.head = node.next;
  }

  if (node.next) {
    node.next.prev = node.prev;
  } else {
    hash.tail = node.prev;
  }

  hash.index.delete(field);
  hash.length--;
  return 1;
}

export function hexists(hash: HashMap, field: string): boolean {
  return hash.index.has(field);
}

export function hgetall(hash: HashMap): string[] {
  const result: string[] = [];
  let current = hash.head;

  while (current) {
    result.push(current.field, current.value);
    current = current.next;
  }

  return result;
}
