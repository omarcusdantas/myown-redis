import { encodeArray, encodeBulk, encodeError, encodeNull, encodeSimple } from "./encoders.js";
import { formatExpiration } from "./formatExpiration.js";
import { globToRegExp } from "./globToRegExp.js";

import type { KeyValueStore, ServerConfig } from "./types.js";
import type { Socket } from "net";

function handleEcho(command: string[]) {
  const message = command[1] ?? "";
  return encodeBulk(message);
}

function handleSet(command: string[], kvStore: KeyValueStore, sendReply: boolean) {
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

  if (!sendReply) return;
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

function handleKeys(command: string[], kvStore: KeyValueStore) {
  const pattern = command[1] ?? "*";
  const matcher = globToRegExp(pattern);

  const keys = Array.from(kvStore.keys()).filter((key) => matcher.test(key));
  return encodeArray(keys);
}

function handleREPLCONF(command: string[], config: ServerConfig) {
  if (command[1]?.toUpperCase() === "GETACK") {
    return encodeArray(["REPLCONF", "ACK", config.offset.toString()]);
  }

  if (command[1]?.toUpperCase() === "ACK") {
    config.ackCount++;
  }

  return encodeBulk("OK");
}

export function processCommand({
  command,
  kvStore,
  config,
  sendReply,
  writer,
}: {
  command: string[];
  kvStore: KeyValueStore;
  config: ServerConfig;
  sendReply: boolean;
  writer: Socket["write"];
}) {
  if (!command[0]) return;
  const commandCode = command[0].toUpperCase();

  let response: string | undefined;

  switch (commandCode) {
    case "COMMAND":
      return;

    case "PING":
      if (sendReply) response = encodeSimple("PONG");
      break;

    case "ECHO":
      response = handleEcho(command);
      break;

    case "SET":
      response = handleSet(command, kvStore, sendReply);
      break;

    case "GET":
      response = handleGet(command, kvStore);
      break;

    case "KEYS":
      response = handleKeys(command, kvStore);
      break;

    case "INFO":
      response = encodeBulk(
        `role:${config.role}\r\nmaster_replid:${config.replid}\r\nmaster_repl_offset:${config.offset}\r\n`
      );
      break;

    case "REPLCONF":
      response = handleREPLCONF(command, config);
      break;

    default:
      response = encodeError("unknown command");
      break;
  }

  if (response) writer(response);
}
