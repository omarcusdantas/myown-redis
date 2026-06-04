import { encodeArray, encodeSimple } from "../protocol/encode.js";
import { globToRegExp } from "../utils/globToRegExp.js";

import type { KeyValueStore } from "../types.js";

export function handleKeys(command: string[], kvStore: KeyValueStore) {
  const pattern = command[1] ?? "*";
  const matcher = globToRegExp(pattern);

  const keys = Array.from(kvStore.keys()).filter((key) => matcher.test(key));
  return encodeArray(keys);
}

export function handleType(command: string[], kvStore: KeyValueStore) {
  const key = command[1] ?? "";
  const entry = kvStore.get(key);
  if (!entry) return encodeSimple("none");

  const now = new Date();
  const isExpired = entry.expiration && entry.expiration < now;
  if (isExpired) {
    kvStore.delete(key);
    return encodeSimple("none");
  }

  return encodeSimple(entry.type);
}
