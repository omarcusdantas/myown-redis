import type { LinkedList, ListNode } from "../types.js";

export function createNode(value: string): ListNode {
  return { value, prev: null, next: null };
}

export function createList(): LinkedList {
  return { head: null, tail: null, length: 0 };
}

export function lpush(list: LinkedList, value: string): void {
  const node = createNode(value);
  if (!list.head) {
    list.head = node;
    list.tail = node;
  } else {
    node.next = list.head;
    list.head.prev = node;
    list.head = node;
  }
  list.length++;
}

export function rpush(list: LinkedList, value: string): void {
  const node = createNode(value);
  if (!list.tail) {
    list.head = node;
    list.tail = node;
  } else {
    node.prev = list.tail;
    list.tail.next = node;
    list.tail = node;
  }
  list.length++;
}

export function lpop(list: LinkedList): string | null {
  if (!list.head) return null;
  const value = list.head.value;
  list.head = list.head.next;
  if (list.head) {
    list.head.prev = null;
  } else {
    list.tail = null;
  }
  list.length--;
  return value;
}

export function rpop(list: LinkedList): string | null {
  if (!list.tail) return null;
  const value = list.tail.value;
  list.tail = list.tail.prev;
  if (list.tail) {
    list.tail.next = null;
  } else {
    list.head = null;
  }
  list.length--;
  return value;
}
