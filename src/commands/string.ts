import { encodeBulk, encodeNull, encodeSimple } from "../protocol/encode.js";
import { propagateToReplicas } from "../replication/propagate.js";
import { formatExpiration } from "../utils/formatExpiration.js";

import type { KeyValueStore, ServerConfig } from "../types.js";

export function handleSet({
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
  const value = command[2] ?? "";
  let expiration: Date | null = null;

  const isSettingExpiration = command.length === 5;
  if (isSettingExpiration) {
    const expOption = command[3]?.toUpperCase() ?? "";
    const expValue = parseInt(command[4] ?? "0", 10);

    expiration = formatExpiration(expOption, expValue);
  }

  kvStore.set(key, { value, expiration, type: "string" });

  if (!sendReply) return;

  propagateToReplicas(config, command);
  return encodeSimple("OK");
}

export function handleGet(command: string[], kvStore: KeyValueStore) {
  const key = command[1] ?? "";
  const entry = kvStore.get(key);
  if (!entry) return encodeNull();

  const now = new Date();
  const isExpired = entry.expiration && entry.expiration < now;
  if (isExpired) {
    kvStore.delete(key);
    return encodeNull();
  }

  return encodeBulk(entry.value);
}
