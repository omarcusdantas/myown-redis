import {
  encodeArray,
  encodeBulk,
  encodeError,
  encodeInteger,
  encodeNull,
} from "../protocol/encode.js";
import { propagateToReplicas } from "../replication/propagate.js";
import { createList, lpop, lpush, rpop, rpush } from "../utils/linkedList.js";

import type { KeyValueStore, ServerConfig } from "../types.js";

const WRONGTYPE = "WRONGTYPE Operation against a key holding the wrong kind of value";

function getOrCreateList(key: string, kvStore: KeyValueStore) {
  if (!kvStore.has(key)) {
    kvStore.set(key, {
      type: "list",
      value: "",
      expiration: null,
      list: createList(),
    });
  }
  return kvStore.get(key);
}

export function handleLPush({
  command,
  kvStore,
  sendReply,
  config,
}: {
  command: string[];
  kvStore: KeyValueStore;
  sendReply: boolean;
  config: ServerConfig;
}) {
  const key = command[1] ?? "";
  const elements = command.slice(2);
  if (elements.length === 0 && sendReply) {
    return encodeError("ERR wrong number of arguments for 'lpush' command");
  }

  const entry = getOrCreateList(key, kvStore);
  if (entry?.type !== "list") {
    if (sendReply) return encodeError(WRONGTYPE);
    return;
  }

  for (const element of elements) {
    lpush(entry.list, element);
  }

  if (!sendReply) return;

  propagateToReplicas(config, command);
  return encodeInteger(entry.list.length);
}

export function handleRPush({
  command,
  kvStore,
  sendReply,
  config,
}: {
  command: string[];
  kvStore: KeyValueStore;
  sendReply: boolean;
  config: ServerConfig;
}) {
  const key = command[1] ?? "";
  const elements = command.slice(2);
  if (elements.length === 0 && sendReply) {
    return encodeError("ERR wrong number of arguments for 'rpush' command");
  }

  const entry = getOrCreateList(key, kvStore);
  if (entry?.type !== "list") {
    if (sendReply) return encodeError(WRONGTYPE);
    return;
  }

  for (const element of elements) {
    rpush(entry.list, element);
  }

  if (!sendReply) return;

  propagateToReplicas(config, command);
  return encodeInteger(entry.list.length);
}

export function handleLPop({
  command,
  kvStore,
  sendReply,
  config,
}: {
  command: string[];
  kvStore: KeyValueStore;
  sendReply: boolean;
  config: ServerConfig;
}) {
  const key = command[1] ?? "";
  const countArg = command[2];
  const count = countArg !== undefined ? parseInt(countArg, 10) : 1;

  const entry = kvStore.get(key);
  if (!entry) {
    if (sendReply) return encodeNull();
    return;
  }
  if (entry.type !== "list") {
    if (sendReply) return encodeError(WRONGTYPE);
    return;
  }

  const list = entry.list;
  const results: string[] = [];

  for (let i = 0; i < count; i++) {
    const value = lpop(list);
    if (value === null) break;
    results.push(value);
  }

  if (list.length === 0) {
    kvStore.delete(key);
  }

  if (!sendReply) return;

  propagateToReplicas(config, command);

  if (countArg === undefined) {
    return encodeBulk(results[0] ?? "");
  }

  return encodeArray(results);
}

export function handleRPop({
  command,
  kvStore,
  sendReply,
  config,
}: {
  command: string[];
  kvStore: KeyValueStore;
  sendReply: boolean;
  config: ServerConfig;
}) {
  const key = command[1] ?? "";
  const countArg = command[2];
  const count = countArg !== undefined ? parseInt(countArg, 10) : 1;

  const entry = kvStore.get(key);
  if (!entry) {
    if (sendReply) return encodeNull();
    return;
  }
  if (entry.type !== "list") {
    if (sendReply) return encodeError(WRONGTYPE);
    return;
  }

  const list = entry.list;
  const results: string[] = [];

  for (let i = 0; i < count; i++) {
    const value = rpop(list);
    if (value === null) break;
    results.push(value);
  }

  if (list.length === 0) {
    kvStore.delete(key);
  }

  if (!sendReply) return;

  propagateToReplicas(config, command);

  if (countArg === undefined) {
    return encodeBulk(results[0] ?? "");
  }

  return encodeArray(results);
}

export function handleLRange(command: string[], kvStore: KeyValueStore) {
  const key = command[1] ?? "";
  const rawStart = parseInt(command[2] ?? "0", 10);
  const rawStop = parseInt(command[3] ?? "0", 10);

  const entry = kvStore.get(key);
  if (!entry) return encodeArray([]);
  if (entry.type !== "list") return encodeError(WRONGTYPE);

  const list = entry.list;
  const len = list.length;

  let start = rawStart >= 0 ? rawStart : len + rawStart;
  let stop = rawStop >= 0 ? rawStop : len + rawStop;

  if (start < 0) start = 0;
  if (stop >= len) stop = len - 1;

  if (start > stop || len === 0) return encodeArray([]);

  const result: string[] = [];
  let current = list.head;
  let index = 0;

  while (current && index <= stop) {
    if (index >= start) {
      result.push(current.value);
    }
    current = current.next;
    index++;
  }

  return encodeArray(result);
}

export function handleLLen(command: string[], kvStore: KeyValueStore) {
  const key = command[1] ?? "";

  const entry = kvStore.get(key);
  if (!entry) return encodeInteger(0);
  if (entry.type !== "list") return encodeError(WRONGTYPE);

  return encodeInteger(entry.list.length);
}
