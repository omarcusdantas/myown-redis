import { handlePsync, handleReplconf, handleWait } from "./replication.js";
import { handleEcho, handleInfo } from "./server.js";
import { handleXAdd, handleXRange } from "./stream.js";
import { handleGet, handleKeys, handleSet, handleType } from "./string.js";
import { encodeArray, encodeError, encodeSimple } from "../protocol/encode.js";

import type { KeyValueStore, ServerConfig } from "../types.js";
import type { Socket } from "net";

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
      response = handleInfo(config);
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

    case "XRANGE":
      response = handleXRange(command, kvStore);
      break;

    default:
      response = encodeError("unknown command");
      break;
  }

  if (response) connection.write(response);
  config.offset += encodeArray(command).length;
}
