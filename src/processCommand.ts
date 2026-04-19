import { formatExpiration } from "./formatExpiration.js";
import { globToRegExp } from "./globToRegExp.js";
import { propagateToReplicas } from "./propagateToReplicas.js";
import { getEmptyRDB } from "./utils.js";
import {
  encodeArray,
  encodeBulk,
  encodeError,
  encodeInteger,
  encodeNull,
  encodeSimple,
} from "./utils.js";

import type { KeyValueStore, ServerConfig } from "./types.js";
import type { Socket } from "net";

function handleEcho(command: string[]) {
  const message = command[1] ?? "";
  return encodeBulk(message);
}

function handleSet({
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

function handleGet(command: string[], kvStore: KeyValueStore) {
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

function handleKeys(command: string[], kvStore: KeyValueStore) {
  const pattern = command[1] ?? "*";
  const matcher = globToRegExp(pattern);

  const keys = Array.from(kvStore.keys()).filter((key) => matcher.test(key));
  return encodeArray(keys);
}

function handleReplconf(command: string[], config: ServerConfig) {
  if (command[1]?.toUpperCase() === "GETACK") {
    return encodeArray(["REPLCONF", "ACK", config.offset.toString()]);
  }

  if (command[1]?.toUpperCase() === "ACK") {
    for (const handler of config.onReplicaAckHandlers) handler();
  }

  return encodeBulk("OK");
}

function handlePsync(config: ServerConfig, connection: Socket) {
  connection.write(encodeSimple(`FULLRESYNC ${config.replid} 0`));

  const emptyRDB = getEmptyRDB();
  connection.write(`\$${emptyRDB.length}\r\n`);
  connection.write(emptyRDB);

  config.replicas.push({ connection, offset: 0, isActive: true });
}

function waitForReplicaAcks({
  config,
  requiredReplicas,
  timeoutMs,
  initialAcknowledged,
}: {
  config: ServerConfig;
  requiredReplicas: number;
  timeoutMs: number;
  initialAcknowledged: number;
}): Promise<string> {
  let acknowledgedReplicas = initialAcknowledged;

  return new Promise<string>((resolve) => {
    function cleanup() {
      config.onReplicaAckHandlers.delete(handleReplicaAck);
      clearTimeout(timeout);
    }

    function safeResolve(value: string) {
      cleanup();
      resolve(value);
    }

    function tryResolve() {
      if (acknowledgedReplicas >= requiredReplicas)
        safeResolve(encodeInteger(acknowledgedReplicas));
    }

    function handleReplicaAck() {
      acknowledgedReplicas++;
      tryResolve();
    }

    const timeout = setTimeout(() => {
      safeResolve(encodeInteger(acknowledgedReplicas));
    }, timeoutMs);

    config.onReplicaAckHandlers.add(handleReplicaAck);
    tryResolve();
  });
}

async function handleWait(command: string[], config: ServerConfig) {
  const requiredReplicas = parseInt(command[1] ?? "0", 10);
  const timeoutMs = parseInt(command[2] ?? "0", 10);

  const activeReplicas = config.replicas.filter((replica) => replica.isActive);
  config.replicas = activeReplicas;

  let acknowledgedReplicas = 0;
  for (const replica of config.replicas) {
    if (replica.offset === 0) acknowledgedReplicas++;
  }

  for (const replica of config.replicas) {
    if (replica.offset <= 0) continue;

    try {
      const request = encodeArray(["REPLCONF", "GETACK", "*"]);
      replica.connection.write(request);
      replica.offset += request.length;
    } catch {
      replica.isActive = false;
    }
  }

  return waitForReplicaAcks({
    config,
    requiredReplicas,
    timeoutMs,
    initialAcknowledged: acknowledgedReplicas,
  });
}

function handleType(command: string[], kvStore: KeyValueStore) {
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

function handleXAdd(command: string[], kvStore: KeyValueStore): string {
  const streamKey = command[1] ?? "";
  const id = command[2] ?? "";

  if (!kvStore.has(streamKey)) {
    kvStore.set(streamKey, {
      type: "stream",
      value: "",
      expiration: null,
      stream: {
        first: [0, 0],
        last: [0, 0],
        entries: new Map(),
      },
    });
  }

  const entry = kvStore.get(streamKey);
  if (!entry) return encodeError("ERR no such key");
  if (entry.type !== "stream")
    return encodeError("WRONGTYPE Operation against a key holding the wrong kind of value");

  const stream = entry.stream;
  const idParts = id.split("-");
  let timestamp = 0;
  let sequence = 0;

  if (idParts.length === 1 && idParts[0] === "*") {
    timestamp = Date.now();
  } else {
    timestamp = parseInt(idParts[0] ?? "0", 10);
  }

  if (idParts.length === 2) {
    if (idParts[1] === "*") {
      if (stream.last[0] === timestamp) {
        sequence = stream.last[1] + 1;
      }
    } else {
      sequence = parseInt(idParts[1] ?? "0", 10);
    }
  }

  if (timestamp === 0 && sequence === 0)
    return encodeError("ERR The ID specified in XADD must be greater than 0-0");

  if (timestamp < stream.last[0] || (timestamp === stream.last[0] && sequence <= stream.last[1])) {
    return encodeError(
      "ERR The ID specified in XADD is equal or smaller than the target stream top item"
    );
  }

  if (stream.last[0] === 0 && stream.last[1] === 0) {
    stream.first[0] = timestamp;
    stream.first[1] = sequence;
  }

  stream.last[0] = timestamp;
  stream.last[1] = sequence;

  if (!stream.entries.has(timestamp)) stream.entries.set(timestamp, new Map());
  stream.entries.get(timestamp)?.set(sequence, command.slice(3));

  return encodeBulk(`${timestamp}-${sequence}`);
}

export async function processCommand({
  command,
  kvStore,
  config,
  sendReply,
  connection,
}: {
  command: string[];
  kvStore: KeyValueStore;
  config: ServerConfig;
  sendReply: boolean;
  connection: Socket;
}) {
  if (!command[0]) return;
  const commandCode = command[0].toUpperCase();

  let response: string | undefined;

  switch (commandCode) {
    case "COMMAND":
      response = encodeSimple("OK");
      break;

    case "PING":
      if (sendReply) response = encodeSimple("PONG");
      break;

    case "ECHO":
      response = handleEcho(command);
      break;

    case "SET":
      response = handleSet({ command, kvStore, sendReply, config });
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
      response = handleReplconf(command, config);
      break;

    case "PSYNC":
      handlePsync(config, connection);
      break;

    case "WAIT":
      response = await handleWait(command, config);
      break;

    case "TYPE":
      response = handleType(command, kvStore);
      break;

    case "XADD":
      response = handleXAdd(command, kvStore);
      break;

    default:
      response = encodeError("unknown command");
      break;
  }

  if (response) connection.write(response);
  config.offset += encodeArray(command).length;
}
