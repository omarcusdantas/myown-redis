import { encodeBulk, encodeNull, encodeSimple } from "./encoders.js";
import { formatExpiration } from "./formatExpiration.js";

import type { KeyValueStore } from "./types.js";

function handleEcho(command: string[]) {
  const message = command[1] ?? "";
  return encodeBulk(message);
}

function handleSet(command: string[], kvStore: KeyValueStore) {
  const key = command[1] ?? "";
  const value = command[2] ?? "";
  let expiration: Date | null = null;

  const isSettingExpiration = command.length === 5;
  if (isSettingExpiration) {
    const expOption = command[3]?.toUpperCase() ?? "";
    const expValue = parseInt(command[4] ?? "0", 10);

    expiration = formatExpiration(expOption, expValue);
  }

  kvStore.set(key, { value, expiration });
  return encodeSimple("OK");
}

function handleGet(command: string[], kvStore: KeyValueStore) {
  const key = command[1] ?? "";
  const entry = kvStore.get(key);
  if (!entry) return encodeNull();

  const isExpired = entry.expiration && entry.expiration < new Date();
  if (isExpired) {
    kvStore.delete(key);
    return encodeNull();
  }

  return encodeBulk(entry.value);
}

export function processCommand(command: string[], kvStore: KeyValueStore) {
  if (!command[0]) return;
  const commandCode = command[0].toUpperCase();

  switch (commandCode) {
    case "PING":
      return encodeSimple("PONG");
    case "ECHO":
      return handleEcho(command);
    case "SET":
      return handleSet(command, kvStore);
    case "GET":
      return handleGet(command, kvStore);
  }
}
