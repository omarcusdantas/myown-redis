import { encodeBulk, encodeNull, encodeSimple } from "./encoders.js";

import type { KeyValueStore } from "./types.js";

function handleEcho(command: string[]) {
  const message = command[1] ?? "";
  return encodeBulk(message);
}

function handleSet(command: string[], kvStore: KeyValueStore) {
  const key = command[1] ?? "";
  const value = command[2] ?? "";
  kvStore.set(key, { value });

  return encodeSimple("OK");
}

function handleGet(command: string[], kvStore: KeyValueStore) {
  const key = command[1] ?? "";
  const value = kvStore.get(key);
  if (!value) return encodeNull();

  return encodeBulk(value.value);
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
