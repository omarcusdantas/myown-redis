import {
  encodeArray,
  encodeBulk,
  encodeError,
  encodeInteger,
  encodeNull,
} from "../protocol/encode.js";
import { propagateToReplicas } from "../replication/propagate.js";
import { createHashMap, hdel, hexists, hget, hgetall, hset } from "../utils/hashLinkedList.js";

import type { KeyValueStore, ServerConfig } from "../types.js";

const WRONGTYPE = "WRONGTYPE Operation against a key holding the wrong kind of value";

function getOrCreateHash(key: string, kvStore: KeyValueStore) {
  if (!kvStore.has(key)) {
    kvStore.set(key, {
      type: "hash",
      value: "",
      expiration: null,
      hash: createHashMap(),
    });
  }
  return kvStore.get(key);
}

export function handleHSet({
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
  const args = command.slice(2);

  if (args.length === 0 || args.length % 2 !== 0) {
    if (sendReply) return encodeError("ERR wrong number of arguments for 'hset' command");
    return;
  }

  const entry = getOrCreateHash(key, kvStore);
  if (entry?.type !== "hash") {
    if (sendReply) return encodeError(WRONGTYPE);
    return;
  }

  let added = 0;
  for (let i = 0; i < args.length; i += 2) {
    const field = args[i];
    const value = args[i + 1];
    if (field !== undefined && value !== undefined) {
      added += hset(entry.hash, field, value);
    }
  }

  if (!sendReply) return;

  propagateToReplicas(config, command);
  return encodeInteger(added);
}

export function handleHGet(command: string[], kvStore: KeyValueStore) {
  const key = command[1] ?? "";
  const field = command[2] ?? "";

  const entry = kvStore.get(key);
  if (!entry) return encodeNull();

  if (entry.type !== "hash") return encodeError(WRONGTYPE);

  const value = hget(entry.hash, field);
  if (value === null) return encodeNull();

  return encodeBulk(value);
}

export function handleHGetAll(command: string[], kvStore: KeyValueStore) {
  const key = command[1] ?? "";

  const entry = kvStore.get(key);
  if (!entry) return encodeArray([]);

  if (entry.type !== "hash") return encodeError(WRONGTYPE);

  const pairs = hgetall(entry.hash);
  return encodeArray(pairs);
}

export function handleHDel({
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
  const fields = command.slice(2);

  if (fields.length === 0) {
    if (sendReply) return encodeError("ERR wrong number of arguments for 'hdel' command");
    return;
  }

  const entry = kvStore.get(key);
  if (!entry) {
    if (sendReply) return encodeInteger(0);
    return;
  }

  if (entry.type !== "hash") {
    if (sendReply) return encodeError(WRONGTYPE);
    return;
  }

  let removed = 0;
  for (const field of fields) {
    removed += hdel(entry.hash, field);
  }

  if (entry.hash.length === 0) {
    kvStore.delete(key);
  }

  if (!sendReply) return;

  propagateToReplicas(config, command);
  return encodeInteger(removed);
}

export function handleHExists(command: string[], kvStore: KeyValueStore) {
  const key = command[1] ?? "";
  const field = command[2] ?? "";

  const entry = kvStore.get(key);
  if (!entry) return encodeInteger(0);

  if (entry.type !== "hash") return encodeError(WRONGTYPE);

  return encodeInteger(hexists(entry.hash, field) ? 1 : 0);
}

export function handleHLen(command: string[], kvStore: KeyValueStore) {
  const key = command[1] ?? "";

  const entry = kvStore.get(key);
  if (!entry) return encodeInteger(0);

  if (entry.type !== "hash") return encodeError(WRONGTYPE);

  return encodeInteger(entry.hash.length);
}
